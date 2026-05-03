const { createClient } = require('@supabase/supabase-js')
const pdfParse = require('pdf-parse')

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

module.exports.config = { api: { bodyParser: { sizeLimit: "50mb" } } }

module.exports.config = { api: { bodyParser: { sizeLimit: "50mb" } } }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, mediaType, from, subject, project_id } = req.body
    if (!base64) return res.status(400).json({ error: 'No base64 content provided' })

    console.log('base64 length:', base64.length, 'subject:', subject)

    let pdfText = null
    try {
      const buffer = Buffer.from(base64, 'base64')
      const data = await pdfParse(buffer, { max: 10 })
      pdfText = data.text
      console.log('PDF text length:', pdfText.length)
      const budgetIdx = pdfText.indexOf('Budget Comparison')
      if (budgetIdx > -1) {
        console.log('Budget section:', pdfText.substring(budgetIdx, budgetIdx + 400))
      } else {
        console.log('No budget section found. Sample:', pdfText.substring(0, 300))
      }
    } catch (err) {
      console.error('PDF parse error:', err.message)
      return res.status(200).json({ success: false, error: 'PDF extraction failed: ' + err.message })
    }

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
          content: `Extract financial data from this property management report. Return ONLY a JSON object.

Look for "Period = " to find the month. Find PTD Actual column values.

TEXT:
${textToSend}

Return JSON with:
- period: "YYYY-MM"
- period_date: "YYYY-MM-01"
- gross_potential_rent, vacancy_loss (neg), concessions (neg), net_rental_income, other_income, total_operating_income
- salaries_benefits (neg), repairs_maintenance (neg), contract_services (neg), utilities (neg), general_admin (neg), leasing (neg), management_fee (neg), total_operating_expenses (neg)
- noi, ptd_budget_income, ptd_budget_expenses (neg), ptd_budget_noi
- total_units, occupied_units, vacant_units, occupancy_pct, actual_rent_collected, delinquency`
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
      console.error('JSON parse error:', e.message)
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

    return res.status(200).json({ success: true, period: parsed.period, noi: parsed.noi, occupancy_pct: parsed.occupancy_pct })

  } catch (err) {
    console.error('Handler error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
