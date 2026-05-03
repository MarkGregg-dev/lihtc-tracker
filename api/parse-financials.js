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
              source: { type: 'base64', media_type: mediaType || 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: `This is a monthly property management report. Extract the following and return ONLY a JSON object, no markdown.

From the Budget Comparison Summary (PTD Actual column):
- period: "YYYY-MM"
- period_date: "YYYY-MM-01"
- gross_potential_rent
- vacancy_loss (negative)
- concessions (negative)
- net_rental_income
- other_income
- total_operating_income
- salaries_benefits (negative)
- repairs_maintenance (negative)
- contract_services (negative)
- utilities (negative)
- general_admin (negative)
- leasing (negative)
- management_fee (negative)
- total_operating_expenses (negative)
- noi
- ptd_budget_income
- ptd_budget_expenses
- ptd_budget_noi

From the Affordable Gross Potential Rent section:
- total_units
- occupied_units
- vacant_units
- occupancy_pct (1 decimal)
- actual_rent_collected
- delinquency

Return as single flat JSON object.`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    console.log('Claude parsed:', JSON.stringify(parsed).substring(0, 500))

    // Detect project from subject/from
    const projectId = project_id || detectProject(subject, from)

    if (projectId) {
      const snapshot = { project_id: projectId, ...parsed }
      const { error: dbErr } = await supabase
        .from('monthly_snapshots')
        .upsert(snapshot, { onConflict: 'project_id,period' })
      if (dbErr) console.error('Supabase error:', dbErr.message)
    }

    // Also save to email queue if from Power Automate
    if (from || subject) {
      await supabase.from('email_queue').insert({
        from_email: from || '',
        subject: subject || '(no subject)',
        sender_type: 'pm',
        detected_doc_type: 'pm-report',
        detected_project_id: projectId,
        confidence: 'high',
        extracted_data: parsed,
        attachments: [{ name: 'financials.pdf', contentType: 'application/pdf' }],
        status: 'approved',
      })
    }

    return res.status(200).json({ success: true, period: parsed.period, occupancy_pct: parsed.occupancy_pct, noi: parsed.noi })

  } catch (err) {
    console.error('Parse financials error:', err)
    return res.status(500).json({ error: err.message })
  }
}
