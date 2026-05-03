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
      // Send to Claude API to parse the PDF
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              {
                type: 'text',
                text: `Extract the Budget Comparison Summary from this property management report. Find the PTD (Period to Date) Actual column values for the most recent period.

Extract these exact fields and return ONLY a JSON object:
{
  "period": "YYYY-MM (e.g. 2026-03)",
  "period_date": "YYYY-MM-01",
  "gross_potential_rent": number,
  "vacancy_loss": number (negative),
  "concessions": number (negative),
  "net_rental_income": number,
  "other_income": number,
  "total_operating_income": number,
  "salaries_benefits": number (negative),
  "repairs_maintenance": number (negative),
  "contract_services": number (negative),
  "utilities": number (negative),
  "general_admin": number (negative),
  "leasing": number (negative),
  "management_fee": number (negative),
  "total_operating_expenses": number (negative),
  "noi": number,
  "ptd_budget_income": number,
  "ptd_budget_expenses": number,
  "ptd_budget_noi": number
}

No markdown, no explanation, just the JSON.`
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

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
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>Upload PM financials</div>
      <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 8 }}>Monthly PDF report from Sandalwood — extracts P&L, NOI, and budget variance automatically.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} disabled={parsing} style={{ fontSize: 12 }} />
        {parsing && <span style={{ fontSize: 12, color: '#633806' }}>Parsing financials (this takes ~15 seconds)...</span>}
      </div>
      {error && <div style={{ marginTop: 8, padding: '6px 10px', background: '#FCEBEB', borderRadius: 6, fontSize: 11, color: '#a32d2d' }}>Error: {error}</div>}
      {result && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#EAF3DE', borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A', marginBottom: 4 }}>Parsed {result.period}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6 }}>
            {[
              ['Total income', result.total_operating_income],
              ['Total expenses', result.total_operating_expenses],
              ['NOI', result.noi],
              ['Budget NOI', result.ptd_budget_noi],
            ].map(([label, val]) => (
              <div key={label} style={{ fontSize: 11, color: '#27500A' }}>
                <span style={{ color: '#6b6a63' }}>{label}: </span>
                <strong style={{ color: val < 0 ? '#a32d2d' : '#27500A' }}>${val != null ? Math.round(Math.abs(val)).toLocaleString() : '—'}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
