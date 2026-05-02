import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { Btn } from './ui'

// Labels to extract from column B — maps spreadsheet label to a key
// Parser searches for these strings (case-insensitive, partial match)
const SOURCE_MAP = [
  { key: 'hud_remaining',       match: ['gershman', 'fha mortgage', 'hud loan'] },
  { key: 'equity_remaining',    match: ['lihtc equity', 'ahp', 'equity (ahp)'] },
  { key: 'interest_remaining',  match: ['interest reserve', 'interest'] },
  { key: 'op_deficit_escrow',   match: ['operating deficit escrow'] },
  { key: 'wc_escrow_source',    match: ['working capital (hud)', 'working capital escrow'] },
  { key: 'co_contingency_src',  match: ['construction contingency', 'change order escrow', 'co contingency'] },
  { key: 'total_budget',        match: ['total'] },
]

// Uses to extract
const USE_MAP = [
  { key: 'construction_remaining', match: ['nrp construction', 'general contractor', 'construction contract'] },
  { key: 'interest_remaining',     match: ['interest'] },
  { key: 'hud_mip_remaining',      match: ['hud mip', 'mip'] },
  { key: 'ff_e_remaining',         match: ["ff&e", "furniture"] },
  { key: 'title_remaining',        match: ['title & recording', 'title and recording'] },
]

function findVal(rows, matchTerms, colIdx = 5) {
  // Search column B (idx 1) for label, return value at colIdx
  for (const row of rows) {
    const label = row[1] ? String(row[1]).toLowerCase().trim() : ''
    if (!label) continue
    for (const term of matchTerms) {
      if (label.includes(term.toLowerCase())) {
        const val = row[colIdx]
        if (val != null && val !== '' && !isNaN(parseFloat(val))) {
          return parseFloat(val)
        }
      }
    }
  }
  return null
}

function findLastBalance(rows, startHint, endHint) {
  // Find the last non-null numeric value in col H (idx 7) in a range
  let last = null
  for (let i = startHint; i < Math.min(endHint, rows.length); i++) {
    const val = rows[i][7]
    if (val != null && !isNaN(parseFloat(val))) {
      last = parseFloat(val)
    }
  }
  return last
}

function findLastDraw(rows) {
  // Find last draw number and date from header rows
  let lastNum = 0
  let lastDate = null
  for (const cell of rows[1] || []) {
    if (cell && String(cell).toLowerCase().includes('draw')) {
      const num = parseInt(String(cell).replace(/\D/g, ''))
      if (!isNaN(num) && num > lastNum) lastNum = num
    }
  }
  // Find date for last draw
  for (let col = rows[1].length - 1; col >= 0; col--) {
    if (rows[1][col] && String(rows[1][col]).toLowerCase().includes('draw')) {
      const date = rows[2] && rows[2][col]
      if (date) {
        lastDate = date instanceof Date
          ? date.toISOString().split('T')[0]
          : String(date).split('T')[0]
        break
      }
    }
  }
  return { lastNum, lastDate }
}

function extractAllLineItems(rows) {
  // Extract all rows between sources total and uses total with label + remaining
  const items = []
  let inUses = false
  for (const row of rows) {
    const label = row[1] ? String(row[1]).trim() : ''
    if (!label) continue
    if (label.toUpperCase() === 'USES') { inUses = true; continue }
    if (!inUses) continue
    if (label.toUpperCase().startsWith('TOTAL')) break
    const remaining = row[5]
    if (remaining != null && !isNaN(parseFloat(remaining)) && parseFloat(remaining) !== 0) {
      items.push({ label, remaining: parseFloat(remaining) })
    }
  }
  return items
}

export function DrawParser({ projectId, onParsed }) {
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
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })

      // Find the draw schedule sheet
      const sheetName = wb.SheetNames.find(n =>
        n.toLowerCase().includes('draw') || n.toLowerCase().includes('schedule')
      ) || wb.SheetNames[0]

      const ws = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

      // Extract sources
      const hud_remaining = findVal(rows, SOURCE_MAP.find(s => s.key === 'hud_remaining').match)
      const equity_remaining = findVal(rows, SOURCE_MAP.find(s => s.key === 'equity_remaining').match)
      const op_deficit_escrow_src = findVal(rows, SOURCE_MAP.find(s => s.key === 'op_deficit_escrow').match, 6) // spent col = funded at close

      // Extract uses
      const construction_remaining = findVal(rows, USE_MAP.find(u => u.key === 'construction_remaining').match)
      const interest_remaining = findVal(rows, ['interest'], 5)

      // Total budget / spent
      const total_budget = findVal(rows, ['total'], 4)  // col E = updated budget
      const total_spent = findVal(rows, ['total'], 6)   // col G = spent

      // Last draw
      const { lastNum: last_draw_num, lastDate: last_draw_date } = findLastDraw(rows)

      // Find escrow ledger balances — search for "Working Capital Escrow" section header
      let wcStart = 0, wcEnd = 0, coStart = 0, coEnd = 0
      for (let i = 0; i < rows.length; i++) {
        const c2 = rows[i][2] ? String(rows[i][2]).toLowerCase() : ''
        if (c2.includes('working capital escrow') && wcStart === 0) wcStart = i + 2
        if (c2.includes('change order escrow') || c2.includes('co escrow')) coStart = i + 2
        if (wcStart > 0 && wcEnd === 0 && i > wcStart + 3 && (!rows[i][3] && !rows[i][4] && !rows[i][5] && !rows[i][7])) wcEnd = i
        if (coStart > 0 && coEnd === 0 && i > coStart + 3 && (!rows[i][3] && !rows[i][4] && !rows[i][5] && !rows[i][7])) coEnd = i
      }

      const wc_escrow = findLastBalance(rows, wcStart, wcEnd || wcStart + 30)
      const co_contingency = findLastBalance(rows, coStart, coEnd || coStart + 30)

      // All line items
      const line_items = extractAllLineItems(rows)

      const parsed = {
        project_id: projectId,
        hud_remaining: hud_remaining || 0,
        equity_remaining: equity_remaining || 0,
        interest_remaining: interest_remaining || 0,
        wc_escrow: wc_escrow || 0,
        co_contingency: co_contingency || 0,
        op_deficit_escrow: op_deficit_escrow_src || 1590000,
        total_budget: total_budget || 0,
        total_spent: total_spent || 0,
        last_draw_num,
        last_draw_date,
        line_items,
        updated_at: new Date().toISOString(),
      }

      // Save to Supabase
      const { error: dbErr } = await supabase
        .from('capital_data')
        .upsert(parsed, { onConflict: 'project_id' })

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
    <div style={{ background: '#eceae3', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>Update from draw spreadsheet</div>
      <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 10 }}>
        Upload the latest Excel draw schedule — the parser reads every line item automatically and updates all capital sufficiency numbers.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={parsing} style={{ fontSize: 12 }} />
        {parsing && <span style={{ fontSize: 12, color: '#633806' }}>Parsing spreadsheet...</span>}
      </div>
      {error && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#FCEBEB', borderRadius: 6, fontSize: 11, color: '#a32d2d' }}>
          Error: {error}
        </div>
      )}
      {result && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#EAF3DE', borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A', marginBottom: 4 }}>
            Parsed successfully — Draw #{result.last_draw_num} · {result.last_draw_date}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 6 }}>
            {[
              ['HUD remaining', result.hud_remaining],
              ['Interest reserve', result.interest_remaining],
              ['WC escrow', result.wc_escrow],
              ['CO contingency', result.co_contingency],
              ['Construction remaining', result.line_items?.find(l => l.label.toLowerCase().includes('nrp construction'))?.remaining || 0],
            ].map(([label, val]) => (
              <div key={label} style={{ fontSize: 11, color: '#27500A' }}>
                <span style={{ color: '#6b6a63' }}>{label}: </span>
                <strong>${Math.round(val).toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#6b6a63', marginTop: 4 }}>{result.line_items?.length} line items extracted</div>
        </div>
      )}
    </div>
  )
}
