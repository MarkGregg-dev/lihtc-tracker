import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SENDER_MAP = [
  { domain: 'sandalwoodmgt.com', type: 'pm', label: 'Sandalwood PM' },
  { email: 'rhensley@streamlineap.com', type: 'controller', label: 'Roxanne (Controller)' },
  { domain: 'streamlineap.com', type: 'internal', label: 'Streamline Internal' },
  { domain: 'bokf.com', type: 'bond', label: 'BOKF' },
  { domain: 'gershman.com', type: 'hud', label: 'Gershman/HUD' },
  { domain: 'ahpinc.com', type: 'equity', label: 'AHP Equity' },
  { domain: 'tdhca.state.tx.us', type: 'state', label: 'TDHCA' },
  { domain: 'nrpgroup.com', type: 'contractor', label: 'NRP Contractor' },
]

function detectSender(fromEmail) {
  if (!fromEmail) return { type: 'unknown', label: 'Unknown' }
  const email = fromEmail.toLowerCase()
  const exact = SENDER_MAP.find(s => s.email && email.includes(s.email))
  if (exact) return exact
  const domain = SENDER_MAP.find(s => s.domain && email.includes(s.domain))
  if (domain) return domain
  return { type: 'unknown', label: fromEmail }
}

async function analyzeWithClaude(subject, body, attachmentNames, senderInfo) {
  const prompt = `You are analyzing an email for a real estate LIHTC affordable housing project management system.

Sender: ${senderInfo.label} (${senderInfo.type})
Subject: ${subject}
Body: ${(body || '').substring(0, 800)}
Attachments: ${attachmentNames.join(', ') || 'None'}

Determine:
1. document_type: one of [pm-report, rent-roll, draw-schedule, invoice, hud-approval, hud-correspondence, bond-statement, interest-statement, equity-correspondence, change-order, pay-app, compliance, legal, other]
2. project_name: project this relates to (look for Centerpoint, Depot, or other project names)
3. period: month/period covered e.g. March 2026
4. confidence: high/medium/low
5. summary: one sentence describing what this email contains
6. action_required: true or false
7. action_note: what action is needed if any

Respond ONLY with a JSON object, no markdown, no explanation.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { document_type: 'other', confidence: 'low', summary: 'Could not analyze', action_required: false }
  }
}

async function findProject(projectName) {
  if (!projectName) return null
  const { data } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%' + projectName + '%')
    .limit(1)
    .single()
  return data?.id || null
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = req.headers['x-webhook-secret']
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized', received: secret })
  }

  try {
    const body = req.body || {}
    const from = body.from || ''
    const subject = body.subject || ''
    const emailBody = body.body || ''
    const attachments = body.attachments || []

    const senderInfo = detectSender(from)
    const attachmentNames = attachments.map(a => a.name || a.filename || 'unknown')

    const analysis = await analyzeWithClaude(subject, emailBody, attachmentNames, senderInfo)
    const projectId = await findProject(analysis.project_name)

    const { data: queueItem, error } = await supabase
      .from('email_queue')
      .insert({
        from_email: from,
        from_name: from,
        subject: subject || '(no subject)',
        body: emailBody.substring(0, 2000),
        sender_type: senderInfo.type,
        detected_doc_type: analysis.document_type,
        detected_project_id: projectId,
        confidence: analysis.confidence,
        extracted_data: analysis,
        attachments: attachments.map(a => ({
          name: a.name || a.filename,
          contentType: a.contentType || a.content_type,
          size: a.size,
        })),
        status: analysis.action_required ? 'action-required' : 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return res.status(200).json({ success: true, id: queueItem.id, analysis })

  } catch (err) {
    console.error('Email ingest error:', err)
    return res.status(500).json({ error: err.message })
  }
}
