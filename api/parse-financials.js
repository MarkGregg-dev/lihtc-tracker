import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'buffer'

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

async function extractPdfText(base64) {
  try {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js')
    const buffer = Buffer.from(base64, 'base64')
    const data = await pdfParse(buffer, { max: 15 })
    return data.text
  } catch (err) {
    console.error('PDF text extraction error:', err.message)
    return null
  }
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, mediaType, from, subject, project_id } = req.body

    if (!base64) return res.status(400).json({ error: 'No base64 content provided' })

    console.log('base64 length:', base64.length, 'subject:', subject)

    // Extract text from PDF instead of sending binary
    const pdfText = await extractPdfText(base64)
    console.log('PDF text length:', pdfText ? pdfText.length : 0)
    console.log('PDF text sample:', pdfText ? pdfText.substring(0, 300) : 'NONE')

    if (!pdfText) {
      return res.status(200).json({ success: false, error: 'Could not extract text from PDF' })
    }

    // Only send first 15000 chars which covers the financial summary
    const textToSend = pdfText.substring(0, 15000)

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
          content: `This is extracted text from a monthly property management report. Extract financial data and return ONLY a JSON object with no markdown.

TEXT:
${textToSend}

Extract these fields:
- period: "YYYY-MM" (e.g. "2026-03" for March 2026)
- period_date: "YYYY-MM-01"
- gross_potential_rent
- vacancy_loss (negative)
- concessions (negative or 0)
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
- ptd_budget_expenses (negative)
- ptd_budget_noi
- total_units (integer)
- occupied_units (integer)
- vacant_units (integer)
- occupancy_pct (decimal)
- actual_rent_collected
- delinquency

Return ONLY the JSON object.`
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
      console.error('JSON parse error:', e.message)
      return res.status(200).json({ success: false, error: 'Could not parse response', raw: text.substring(0, 200) })
    }

    const projectId = project_id || detectProject(subject, from)

    if (projectId && parsed.period) {
      const { error: dbErr } = await supabase
        .from('monthly_snapshots')
        .upsert({ project_id: projectId, ...parsed }, { onConflict: 'project_id,period' })
      if (dbErr) console.error('Supabase error:', dbErr.message)
      else console.log('Saved snapshot for period:', parsed.period)
    } else {
      console.log('Missing project or period — projectId:', projectId, 'period:', parsed.period)
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

    return res.status(200).json({ success: true, period: parsed.period, noi: parsed.noi, occupancy_pct: parsed.occupancy_pct })

  } catch (err) {
    console.error('Parse financials error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
