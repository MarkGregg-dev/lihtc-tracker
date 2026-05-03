import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Known sender routing table
const SENDER_MAP = [
  { domain: 'sandalwoodmgt.com', type: 'pm', docTypes: ['pm-report', 'rent-roll'] },
  { email: 'rhensley@streamlineap.com', type: 'internal-controller', docTypes: ['draw-schedule', 'invoice', 'hud-approval'] },
  { domain: 'streamlineap.com', type: 'internal', docTypes: [] },
  { domain: 'bokf.com', type: 'bond', docTypes: ['bond-statement', 'interest-statement'] },
  { domain: 'gershman.com', type: 'hud', docTypes: ['hud-correspondence', 'draw-approval'] },
  { domain: 'ahpinc.com', type: 'equity', docTypes: ['equity-correspondence'] },
  { domain: 'tdhca.state.tx.us', type: 'state-agency', docTypes: ['compliance', 'state-correspondence'] },
  { domain: 'nrpgroup.com', type: 'contractor', docTypes: ['pay-app', 'change-order'] },
]

function detectSender(fromEmail) {
  if (!fromEmail) return { type: 'unknown', docTypes: [] }
  const email = fromEmail.toLowerCase()
  // Check exact email first
  const exactMatch = SENDER_MAP.find(s => s.email && email.includes(s.email))
  if (exactMatch) return exactMatch
  // Then check domain
  const domainMatch = SENDER_MAP.find(s => s.domain && email.includes(s.domain))
  if (domainMatch) return domainMatch
  return { type: 'unknown', docTypes: [] }
}

async function analyzeWithClaude(attachments, subject, body, senderInfo) {
  const attachmentDescriptions = attachments.map(a => ({
    filename: a.filename,
    contentType: a.contentType,
    size: a.size,
  }))

  const prompt = `You are analyzing an email received by a real estate project management system for LIHTC affordable housing projects.

Sender type: ${senderInfo.type}
Subject: ${subject}
Body preview: ${body?.substring(0, 500) || 'No body'}
Attachments: ${JSON.stringify(attachmentDescriptions)}

Based on the sender, subject, body, and attachment names, determine:
1. document_type: one of [pm-report, rent-roll, draw-schedule, invoice, hud-approval, hud-correspondence, bond-statement, interest-statement, equity-correspondence, change-order, pay-app, compliance, legal, other]
2. project_name: the project this relates to (look for "Centerpoint", "Depot", project names in subject/body)
3. period: the month/period this covers if applicable (e.g. "March 2026")
4. confidence: high/medium/low
5. summary: one sentence describing what this email contains
6. action_required: true/false — does this require immediate attention
7. action_note: if action required, what needs to be done

Respond ONLY with a JSON object, no other text.`

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
    .ilike('name', `%${projectName}%`)
    .limit(1)
    .single()
  return data?.id || null
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Mailgun sends form data
    const {
      sender,
      from,
      subject,
      'body-plain': bodyPlain,
      'body-html': bodyHtml,
      attachments,
      'attachment-count': attachmentCount,
    } = req.body

    const fromEmail = sender || from || ''
    const senderInfo = detectSender(fromEmail)

    // Parse attachments from Mailgun
    const parsedAttachments = []
    const count = parseInt(attachmentCount) || 0
    for (let i = 1; i <= count; i++) {
      const att = req.body[`attachment-${i}`]
      if (att) {
        parsedAttachments.push({
          filename: att.filename || `attachment-${i}`,
          contentType: att.contentType || 'application/octet-stream',
          size: att.size || 0,
          url: att.url || null,
        })
      }
    }

    // Analyze with Claude
    const analysis = await analyzeWithClaude(
      parsedAttachments,
      subject,
      bodyPlain || bodyHtml,
      senderInfo
    )

    // Find matching project
    const projectId = await findProject(analysis.project_name)

    // Save to queue
    const { data: queueItem, error } = await supabase
      .from('email_queue')
      .insert({
        from_email: fromEmail,
        from_name: from?.match(/^(.+?)\s*</)?.[1]?.trim() || fromEmail,
        subject: subject || '(no subject)',
        body: bodyPlain?.substring(0, 2000) || '',
        sender_type: senderInfo.type,
        detected_doc_type: analysis.document_type,
        detected_project_id: projectId,
        confidence: analysis.confidence,
        extracted_data: analysis,
        attachments: parsedAttachments,
        status: analysis.action_required ? 'action-required' : 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return res.status(200).json({ success: true, id: queueItem.id })

  } catch (err) {
    console.error('Email ingest error:', err)
    return res.status(500).json({ error: err.message })
  }
}
