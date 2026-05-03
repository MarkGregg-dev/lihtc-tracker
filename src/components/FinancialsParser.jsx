import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function FinancialsParser({ projectId, onParsed }) {
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setParsing(true)
    setError(null)
    setResult(null)

    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })

      const response = await fetch('/api/parse-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              {
                type: 'text',
                text: `This is a monthly property management report. Extract the following data and return ONLY a JSON object with no markdown or explanation.

From the "Budget Comparison Summary" (PTD Actual column):
- period: format as "YYYY-MM"
- period_date: format as "YYYY-MM-01"
- gross_potential_rent
- vacancy_loss (negative number)
- concessions (negative number)
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
- noi (total_operating_income + total_operating_expenses)
- ptd_budget_income (PTD Budget column - total operating income)
- ptd_budget_expenses (PTD Budget column - total operating expenses)
- ptd_budget_noi

From the "Affordable Gross Potential Rent" section (rent roll):
- total_units: count all units listed
- occupied_units: count units where resident is NOT "VACANT"
- vacant_units: count VACANT units
- occupancy_pct: occupied/total * 100 rounded to 1 decimal
- actual_rent_collected: sum of "Actual Rent" column for occupied units
- delinquency: sum of "Current Unpaid Charges" column

Also extract building-level occupancy as building_data object where keys are building numbers and values have total, occupied, actualRent fields.

Return all as a single flat JSON object.`
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

      // Calculate vacancy_loss from gross potential if not provided
      if (!parsed.vacancy_loss && parsed.gross_potential_rent && parsed.actual_rent_collected) {
        parsed.vacancy_loss = -(parsed.gross_potential_rent - parsed.actual_rent_collected)
      }

      const snapshot = {
        project_id: projectId,
        ...parsed,
      }

      const { error: dbErr } = await supabase
        .from('monthly_snapshots')
        .upsert(snapshot, { onConflict: 'project_id,period' })

      if (dbErr) throw new Error(dbErr.message)

      setResult(parsed)
      if (onParsed) onParsed(parsed)

    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ background: '#eceae3', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>Upload Sandalwood monthly report</div>
      <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 8 }}>
        Upload the monthly PDF from Sandalwood — extracts P&L, NOI, budget variance, occupancy, and building breakdown all at once. Takes ~20 seconds.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} disabled={parsing} style={{ fontSize: 12 }} />
        {parsing && <span style={{ fontSize: 12, color: '#633806' }}>Reading report with Claude (~20 seconds)...</span>}
      </div>
      {error && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#FCEBEB', borderRadius: 6, fontSize: 11, color: '#a32d2d' }}>
          Error: {error}
        </div>
      )}
      {result && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#EAF3DE', borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A', marginBottom: 6 }}>
            Parsed {result.period} — {result.occupancy_pct}% occupied ({result.occupied_units}/{result.total_units} units)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 6 }}>
            {[
              ['Total income', result.total_operating_income],
              ['Total expenses', result.total_operating_expenses],
              ['NOI', result.noi],
              ['Actual rent', result.actual_rent_collected],
              ['Vacancy loss', result.vacancy_loss],
              ['Delinquency', result.delinquency],
            ].map(([label, val]) => (
              <div key={label} style={{ fontSize: 11, color: '#27500A' }}>
                <span style={{ color: '#6b6a63' }}>{label}: </span>
                <strong style={{ color: val < 0 ? '#a32d2d' : '#27500A' }}>
                  {val != null ? '$' + Math.abs(Math.round(val)).toLocaleString() : '—'}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
