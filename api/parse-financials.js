export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, mediaType } = req.body

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
    return res.status(200).json(parsed)

  } catch (err) {
    console.error('Parse financials error:', err)
    return res.status(500).json({ error: err.message })
  }
}
