import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const PROJECT_MAP = {
  '306': '79ab3b84-8837-4d77-b160-5a66861f45c0',
  'centerpoint': '79ab3b84-8837-4d77-b160-5a66861f45c0',
  'tapestry': '79ab3b84-8837-4d77-b160-5a66861f45c0',
}

function detectProject(subject, from) {
  const text = ((subject || '') + ' ' + (from || '')).toLowerCase()
  for (const [key, id] of Object.entries(PROJECT_MAP)) {
    if (text.includes(key)) return id
  }
  return null
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, mediaType, from, subject, project_id } = req.body

    if (!base64) return res.status(400).json({ error: 'No base64 content provided' })

    console.log('base64 length:', base64.length, 'from:', from, 'subject:', subject)

    // Truncate large PDFs - first 600KB covers the financial summary pages
    const truncated = base64.length > 800000 ? base64.substring(0, 800000) : base64
    console.log('truncated length:', truncated.length)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: truncated }
            },
            {
              type: 'text',
              text: `This is a monthly property management report for a LIHTC apartment complex. Extract financial data and return ONLY a JSON object with no markdown or explanation.

From the Budget Comparison Summary (PTD Actual column):
- period: format "YYYY-MM" (e.g. "2026-02" for February 2026)
- period_date: format "YYYY-MM-01"
- gross_potential_rent: number
- vacancy_loss: negative number
- concessions: negative number or 0
- net_rental_income: number
- other_income: number
- total_operating_income: number
- salaries_benefits: negative number
- repairs_maintenance: negative number
- contract_services: negative number
- utilities: negative number
- general_admin: negative number
- leasing: negative number
- management_fee: negative number
- total_operating_expenses: negative number
- noi: number (income + expenses)
- ptd_budget_income: number
- ptd_budget_expenses: negative number
- ptd_budget_noi: number

From the rent roll or occupancy summary:
- total_units: integer
- occupied_units: integer
- vacant_units: integer
- occupancy_pct: decimal (e.g. 17.4)
- actual_rent_collected: number
- delinquency: number

Return ONLY the JSON object.`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    console.log('Claude response:', text.substring(0, 400))

    let parsed = {}
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch (e) {
      console.error('JSON parse error:', e.message, 'text was:', text.substring(0, 200))
      return res.status(200).json({ success: false, error: 'Could not parse Claude response', raw: text.substring(0, 200) })
    }

    const projectId = project_id || detectProject(subject, from)

    if (projectId && parsed.period) {
      const snapshot = { project_id: projectId, ...parsed }
      const { error: dbErr } = await supabase
        .from('monthly_snapshots')
        .upsert(snapshot, { onConflict: 'project_id,period' })
      if (dbErr) console.error('Supabase error:', dbErr.message)
      else console.log('Saved snapshot for period:', parsed.period)
    } else {
      console.log('No project or period — projectId:', projectId, 'period:', parsed.period)
    }

    if (from || subject) {
      await supabase.from('email_queue').insert({
        from_email: from || '',
        subject: subject || '(no subject)',
        sender_type: 'pm',
        detected_doc_type: 'pm-report',
        detected_project_id: projectId,
        confidence: parsed.period ? 'high' : 'low',
        extracted_data: parsed,
        attachments: [{ name: 'financials.pdf', contentType: 'application/pdf' }],
        status: parsed.period ? 'approved' : 'pending',
      })
    }

    return res.status(200).json({ success: true, period: parsed.period, occupancy_pct: parsed.occupancy_pct, noi: parsed.noi })

  } catch (err) {
    console.error('Parse financials error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
