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

function cleanPdfText(raw) {
  // Fix spaced-out characters like "M O N T H L Y" -> "MONTHLY"
  // Replace single chars separated by spaces
  let text = raw
  // Fix letter-by-letter spacing
  text = text.replace(/([A-Z]) ([A-Z]) ([A-Z])/g, '$1$2$3')
  text = text.replace(/([A-Z]) ([A-Z])/g, '$1$2')
  return text
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, mediaType, from, subject, project_id } = req.body
    if (!base64) return res.status(400).json({ error: 'No base64 content provided' })

    console.log('base64 length:', base64.length, 'subject:', subject)

    // Extract text using pdf-parse
    let pdfText = null
    try {
      const pdfParse = (await import('pdf-parse')).default
      const buffer = Buffer.from(base64, 'base64')
      const data = await pdfParse(buffer, { max: 10 })
      pdfText = cleanPdfText(data.text)
      console.log('PDF text length:', pdfText.length)
      console.log('PDF text sample:', pdfText.substring(200, 600))
    } catch (err) {
      console.error('PDF parse error:', err.message)
      return res.status(200).json({ success: false, error: 'PDF extraction failed: ' + err.message })
    }

    const textToSend = pdfText.substring(0, 12000)

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
          content: `Extract financial data from this property management report text. The text may have some formatting artifacts. Look for the Budget Comparison Summary section with PTD Actual values.

Return ONLY a JSON object with these fields:
- period: "YYYY-MM" (look for "Period = " followed by month/year)
- period_date: "YYYY-MM-01"
- gross_potential_rent: (GROSS POTENTIAL RENT PTD Actual value)
- vacancy_loss: (VACANCY LOSS PTD Actual, negative)
- concessions: (CONCESSIONS PTD Actual, negative)
- net_rental_income: (Net Rental Income PTD Actual)
- other_income: (OTHER OPERATING INCOME PTD Actual)
- total_operating_income: (TOTAL OPERATING INCOME PTD Actual)
- salaries_benefits: (SALARIES and BENEFITS PTD Actual, negative)
- repairs_maintenance: (RPRS and MAINTENANCE PTD Actual, negative)
- contract_services: (CONTRACT SVCS PTD Actual, negative)
- utilities: (UTILITIES EXPENSES PTD Actual, negative)
- general_admin: (GENERAL AND ADMIN PTD Actual, negative)
- leasing: (LEASING PTD Actual, negative)
- management_fee: (MANAGEMENT FEES PTD Actual, negative)
- total_operating_expenses: (TOTAL OPERATING EXPENSES PTD Actual, negative)
- noi: (NET OPERATING INCOME PTD Actual)
- ptd_budget_income: (TOTAL OPERATING INCOME PTD Budget)
- ptd_budget_expenses: (TOTAL OPERATING EXPENSES PTD Budget, negative)
- ptd_budget_noi: (NET OPERATING INCOME PTD Budget)

TEXT:
${textToSend}

Return ONLY the JSON.`
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    console.log('Claude response:', text.substring(0, 500))

    let parsed = {}
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch (e) {
      console.error('JSON parse error:', e.message, 'raw:', text.substring(0, 300))
      return res.status(200).json({ success: false, error: 'JSON parse failed', raw: text.substring(0, 300) })
    }

    const projectId = project_id || detectProject(subject, from)
    console.log('Period:', parsed.period, 'NOI:', parsed.noi, 'Project:', projectId)

    if (projectId && parsed.period) {
      const { error: dbErr } = await supabase
        .from('monthly_snapshots')
        .upsert({ project_id: projectId, ...parsed }, { onConflict: 'project_id,period' })
      if (dbErr) console.error('Supabase error:', dbErr.message)
      else console.log('Saved snapshot:', parsed.period)
    }

    if (from || subject) {
      await supabase.from('email_queue').insert({
        from_email: from || '',
        subject: subject || '',
        sender_type: 'pm',
        detected_doc_type: 'pm-report',
        detected_project_id: projectId,
        confidence: parsed.period ? 'high' : 'low',
        extracted_data: parsed,
        attachments: [{ name: 'financials.pdf', contentType: 'application/pdf' }],
        status: parsed.period ? 'approved' : 'pending',
      })
    }

    return res.status(200).json({ success: true, period: parsed.period, noi: parsed.noi })

  } catch (err) {
    console.error('Handler error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
