import { useState } from 'react'
import { Kpi, SectionLabel } from './ui'

const S = { border: '0.5px solid #e5e3db', radius: '8px' }
const fm = v => v == null ? '—' : '$' + Math.abs(Math.round(v)).toLocaleString()
const pct = v => v == null ? '—' : (Math.round(v * 1000) / 10) + '%'

// LPA constants
const PROJECTED_ANNUAL = 3809306
const FY2026_THRESHOLD = 2317826
const FY2027_THRESHOLD = 3808544
const LATE_RATE = 0.60
const CREDIT_PRICE = 0.8275
const TOTAL_UNITS = 363
const BLDG_UNITS = [36, 30, 30, 39, 36, 36, 36, 36, 30, 54]
const BLDG_ANNUAL = BLDG_UNITS.map(u => Math.round(u / TOTAL_UNITS * PROJECTED_ANNUAL))

const TODAY = new Date()

// Section 42(f)(2) partial year rule
// first_credit_year = year elected; co_date = placed in service date
function creditsForYear(coDate, annualCredits, firstCreditYear, year, appFraction) {
  if (!coDate || !firstCreditYear) return 0
  const pisDate = new Date(coDate)
  if (year < firstCreditYear) return 0
  if (year > firstCreditYear + 10) return 0

  if (year === firstCreditYear) {
    // Partial year: months from max(Jan 1 of FCY, PIS date) to Dec 31
    const fcy = new Date(`${firstCreditYear}-01-01`)
    const start = pisDate > fcy ? pisDate : fcy
    const yearEnd = new Date(`${firstCreditYear}-12-31`)
    const months = Math.max(0, (yearEnd - start) / (1000 * 60 * 60 * 24 * 30.5))
    return Math.round(annualCredits * appFraction * Math.min(1, months / 12))
  }

  // Year 11 catchup: gets months missed in year 1
  if (year === firstCreditYear + 10) {
    const fcy = new Date(`${firstCreditYear}-01-01`)
    const start = pisDate > fcy ? pisDate : fcy
    const yearEnd = new Date(`${firstCreditYear}-12-31`)
    const monthsGot = Math.min(12, Math.max(0, (yearEnd - start) / (1000 * 60 * 60 * 24 * 30.5)))
    const monthsMissed = 12 - monthsGot
    return Math.round(annualCredits * appFraction * monthsMissed / 12)
  }

  return Math.round(annualCredits * appFraction)
}

// Project occupancy at end of a given year
function projAppFraction(bldg, year, currentOccupied, leasePace) {
  const yearEnd = new Date(`${year}-12-31`)
  const monthsFromNow = Math.max(0, (yearEnd - TODAY) / (1000 * 60 * 60 * 24 * 30.5))
  const projTotal = Math.min(TOTAL_UNITS * 0.97, currentOccupied + leasePace * monthsFromNow)
  const projBldg = Math.round(projTotal * (bldg.total_units / TOTAL_UNITS))
  return Math.min(1, projBldg / bldg.total_units)
}

// Calculate total late delivery adjustment for a given set of buildings + elections
function calcLateAdj(buildings, leasePace, currentOccupied) {
  let total2026 = 0, total2027 = 0
  buildings.forEach((b, i) => {
    if (!b.co_date) return
    const af2026 = projAppFraction(b, 2026, currentOccupied, leasePace)
    const af2027 = projAppFraction(b, 2027, currentOccupied, leasePace)
    total2026 += creditsForYear(b.co_date, BLDG_ANNUAL[i], b.fcy, 2026, af2026)
    total2027 += creditsForYear(b.co_date, BLDG_ANNUAL[i], b.fcy, 2027, af2027)
  })
  const adj2026 = total2026 < FY2026_THRESHOLD ? Math.round((FY2026_THRESHOLD - total2026) * LATE_RATE) : 0
  const adj2027 = total2027 < FY2027_THRESHOLD ? Math.round((FY2027_THRESHOLD - total2027) * LATE_RATE) : 0
  return { total2026: Math.round(total2026), total2027: Math.round(total2027), adj2026, adj2027, totalAdj: adj2026 + adj2027 }
}

// Find optimal FCY election for each building — brute force all 2^n combinations
function findOptimalElections(buildings, leasePace, currentOccupied) {
  // Only buildings with a CO date that have a choice (CO year vs CO year+1)
  const flexible = buildings.filter(b => {
    if (!b.co_date) return false
    const coYear = parseInt(b.co_date.substring(0, 4))
    return coYear >= 2025 // buildings with CO in 2025 or 2026 have a meaningful choice
  })

  if (flexible.length === 0) return buildings

  // For each flexible building, try both elections and pick the combination minimizing total adj
  // Since we have at most 10 buildings, brute force is fine
  let best = null
  let bestAdj = Infinity

  const combos = 1 << flexible.length
  for (let mask = 0; mask < combos; mask++) {
    const testBuildings = buildings.map(b => {
      const idx = flexible.findIndex(f => f.id === b.id)
      if (idx === -1) return b
      const coYear = parseInt(b.co_date.substring(0, 4))
      const useCurrent = (mask >> idx) & 1
      return { ...b, fcy: useCurrent ? coYear : coYear + 1 }
    })
    const { totalAdj } = calcLateAdj(testBuildings, leasePace, currentOccupied)
    if (totalAdj < bestAdj) {
      bestAdj = totalAdj
      best = testBuildings
    }
  }
  return best || buildings
}

const SK = 'lihtc-bins'

function defaultBuildings() {
  return [
    { id:1,  building:1,  bin:'TX 24-40001', total_units:36, ami_mix:'30% & 60%', status:'CO received', co_date:'2025-09-01', bonus_depr_year:2025, fcy:2026 },
    { id:2,  building:2,  bin:'TX 24-40002', total_units:30, ami_mix:'60%',       status:'CO received', co_date:'2025-09-01', bonus_depr_year:2025, fcy:2026 },
    { id:3,  building:3,  bin:'TX 24-40003', total_units:30, ami_mix:'60%',       status:'CO received', co_date:'2025-11-01', bonus_depr_year:2025, fcy:2026 },
    { id:4,  building:4,  bin:'TX 24-40004', total_units:39, ami_mix:'30% & 60%', status:'CO received', co_date:'2025-12-01', bonus_depr_year:2025, fcy:2026 },
    { id:5,  building:5,  bin:'TX 24-40005', total_units:36, ami_mix:'60%',       status:'CO received', co_date:'2026-02-01', bonus_depr_year:2026, fcy:2026 },
    { id:6,  building:6,  bin:'TX 24-40006', total_units:36, ami_mix:'60%',       status:'CO received', co_date:'2026-02-01', bonus_depr_year:2026, fcy:2026 },
    { id:7,  building:7,  bin:'TX 24-40007', total_units:36, ami_mix:'60%',       status:'Under construction', co_date:'', bonus_depr_year:2026, fcy:2026 },
    { id:8,  building:8,  bin:'TX 24-40008', total_units:36, ami_mix:'60%',       status:'CO received', co_date:'2026-01-01', bonus_depr_year:2026, fcy:2026 },
    { id:9,  building:9,  bin:'TX 24-40009', total_units:30, ami_mix:'60%',       status:'Under construction', co_date:'', bonus_depr_year:2026, fcy:2026 },
    { id:10, building:10, bin:'TX 24-40010', total_units:54, ami_mix:'30% & 60%', status:'CO received', co_date:'2025-09-01', bonus_depr_year:2025, fcy:2026 },
  ]
}

export function CreditDeliveryTab({ project }) {
  const [buildings, setBuildings] = useState(() => {
    try {
      const saved = localStorage.getItem(SK + '-' + (project?.id || ''))
      if (saved) {
        const p = JSON.parse(saved)
        return p.map(b => ({
          ...b,
          co_date: b.co_date || b.pis_date || '',
          fcy: b.fcy || (b.first_credit_year ? parseInt(b.first_credit_year) : 2026)
        }))
      }
    } catch {}
    return defaultBuildings()
  })
  const [leasePace, setLeasePace] = useState(22)
  const [currentOccupied, setCurrentOccupied] = useState(63)
  const [section, setSection] = useState('election')

  function save(updated) {
    setBuildings(updated)
    try { localStorage.setItem(SK + '-' + project?.id, JSON.stringify(updated)) } catch {}
  }

  function updateBldg(id, field, val) {
    save(buildings.map(b => b.id === id ? { ...b, [field]: val } : b))
  }

  // Current calculations
  const current = calcLateAdj(buildings, leasePace, currentOccupied)

  // Optimal elections
  const optimal = findOptimalElections(buildings, leasePace, currentOccupied)
  const optResult = calcLateAdj(optimal, leasePace, currentOccupied)
  const savings = current.totalAdj - optResult.totalAdj

  const pis2025 = buildings.filter(b => b.co_date && new Date(b.co_date) <= new Date('2025-12-31'))
  const pis2026 = buildings.filter(b => b.co_date && new Date(b.co_date) <= new Date('2026-12-31'))

  const navItems = [
    { key: 'election', label: 'Credit year election' },
    { key: 'bins', label: 'BIN tracker' },
    { key: 'deadlines', label: 'Deadlines' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => setSection(n.key)} style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 100, cursor: 'pointer', border: 'none',
            background: section === n.key ? '#1a1a18' : '#eceae3',
            color: section === n.key ? '#fff' : '#6b6a63',
            fontWeight: section === n.key ? 600 : 400,
          }}>{n.label}</button>
        ))}
      </div>

      {/* CREDIT YEAR ELECTION */}
      {section === 'election' && (
        <div>
          <div style={{ background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: S.radius, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', marginBottom: 4 }}>
              §42(f)(1) election — CO year or following year, irrevocable
            </div>
            <div style={{ fontSize: 11, color: '#185FA5', lineHeight: 1.5 }}>
              Each BIN elects its first credit year as either the CO year (partial year under §42(f)(2)) or the following year (full year). 
              The goal here is to avoid the $0.60/credit Late Delivery Adjustment. 
              CO date = PIS date for depreciation and credit purposes. Confirm elections with your accountants before filing tax returns.
            </div>
          </div>

          {/* Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              ['Current occupied units', currentOccupied, setCurrentOccupied],
              ['Monthly absorption (units/mo)', leasePace, setLeasePace],
            ].map(([l, v, s]) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: '#6b6a63', marginBottom: 3 }}>{l}</div>
                <input type="number" value={v} onChange={e => s(parseInt(e.target.value)||0)}
                  style={{ fontSize: 12, padding: '5px 8px', border: S.border, borderRadius: 6, width: '100%' }} />
              </div>
            ))}
            <div style={{ border: S.border, borderRadius: S.radius, padding: '8px 12px', background: '#EAF3DE' }}>
              <div style={{ fontSize: 10, color: '#27500A', marginBottom: 2 }}>Optimal elections save</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#27500A' }}>{fm(savings)}</div>
              <div style={{ fontSize: 10, color: '#3B6D11' }}>vs current elections</div>
            </div>
          </div>

          {/* Per-building election table */}
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 90px 70px 80px 80px 80px 120px', background: '#eceae3', borderBottom: S.border }}>
              {['Bldg', 'BIN', 'CO date', 'Election', 'AF 2026', 'FY26 cred', 'FY27 cred', 'Recommendation'].map(h => (
                <div key={h} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 500, color: '#6b6a63' }}>{h}</div>
              ))}
            </div>
            {buildings.map((b, i) => {
              if (!b.co_date) {
                return (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '70px 100px 90px 70px 80px 80px 80px 120px', borderBottom: '0.5px solid #f5f4f0', background: '#fafaf8', alignItems: 'center' }}>
                    <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87', fontFamily: 'monospace' }}>{b.bin}</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>No CO yet</div>
                    {[0,0,0,0,0].map((_, j) => <div key={j} style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>—</div>)}
                  </div>
                )
              }

              const coYear = parseInt(b.co_date.substring(0, 4))
              const coMonth = parseInt(b.co_date.substring(5, 7))
              const monthsInCoYear = 13 - coMonth // months from CO to Dec 31
              const af2026 = projAppFraction(b, 2026, currentOccupied, leasePace)
              const af2027 = projAppFraction(b, 2027, currentOccupied, leasePace)

              // Credits under current election
              const cred2026 = creditsForYear(b.co_date, BLDG_ANNUAL[i], b.fcy, 2026, af2026)
              const cred2027 = creditsForYear(b.co_date, BLDG_ANNUAL[i], b.fcy, 2027, af2027)

              // What does optimal say for this building?
              const optBldg = optimal.find(x => x.id === b.id)
              const optFCY = optBldg?.fcy
              const isOptimal = b.fcy === optFCY

              // Credits under optimal election for this building
              const optCred2026 = creditsForYear(b.co_date, BLDG_ANNUAL[i], optFCY, 2026, af2026)
              const optCred2027 = creditsForYear(b.co_date, BLDG_ANNUAL[i], optFCY, 2027, af2027)

              const recReason = optFCY === coYear
                ? `Elect ${coYear} — ${monthsInCoYear}mo of credits helps FY${coYear}`
                : `Elect ${coYear+1} — only ${monthsInCoYear}mo in ${coYear}, full year in ${coYear+1} worth more`

              return (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '70px 100px 90px 70px 80px 80px 80px 120px', borderBottom: '0.5px solid #f5f4f0', background: isOptimal ? '#fafaf8' : '#FEF3E2', alignItems: 'center' }}>
                  <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                  <div style={{ padding: '7px 8px', fontSize: 10, color: '#6b6a63', fontFamily: 'monospace' }}>{b.bin}</div>
                  <div style={{ padding: '7px 8px', fontSize: 11, color: '#1a1a18' }}>
                    {b.co_date}
                    <div style={{ fontSize: 9, color: '#8f8e87', marginTop: 1 }}>{monthsInCoYear}mo in {coYear}</div>
                  </div>
                  <div style={{ padding: '4px 8px' }}>
                    <select value={b.fcy} onChange={e => updateBldg(b.id, 'fcy', parseInt(e.target.value))}
                      style={{ fontSize: 11, padding: '3px 4px', border: S.border, borderRadius: 4, width: '100%',
                        background: isOptimal ? '#EAF3DE' : '#FAEEDA',
                        color: isOptimal ? '#27500A' : '#633806', fontWeight: 500 }}>
                      <option value={coYear}>{coYear}</option>
                      <option value={coYear+1}>{coYear+1}</option>
                    </select>
                  </div>
                  <div style={{ padding: '7px 8px', fontSize: 11, color: '#1a1a18' }}>{pct(af2026)}</div>
                  <div style={{ padding: '7px 8px', fontSize: 11, fontWeight: 500, color: cred2026 > 0 ? '#27500A' : '#8f8e87' }}>{fm(cred2026)}</div>
                  <div style={{ padding: '7px 8px', fontSize: 11, fontWeight: 500, color: cred2027 > 0 ? '#27500A' : '#8f8e87' }}>{fm(cred2027)}</div>
                  <div style={{ padding: '7px 8px' }}>
                    {!isOptimal && (
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#633806', marginBottom: 2 }}>→ Change to {optFCY}</div>
                    )}
                    <div style={{ fontSize: 9, color: isOptimal ? '#27500A' : '#854F0B', lineHeight: 1.3 }}>{recReason}</div>
                  </div>
                </div>
              )
            })}

            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 90px 70px 80px 80px 80px 120px', background: '#eceae3', borderTop: S.border }}>
              <div style={{ padding: '7px 8px', fontSize: 11, fontWeight: 600, color: '#1a1a18', gridColumn: '1/6', textAlign: 'right', paddingRight: 12 }}>Total actual credits</div>
              <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 600, color: current.total2026 >= FY2026_THRESHOLD ? '#27500A' : '#a32d2d' }}>{fm(current.total2026)}</div>
              <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 600, color: current.total2027 >= FY2027_THRESHOLD ? '#27500A' : '#a32d2d' }}>{fm(current.total2027)}</div>
              <div style={{ padding: '7px 8px' }}></div>
            </div>
          </div>

          {/* Threshold panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { year: 2026, actual: current.total2026, threshold: FY2026_THRESHOLD, adj: current.adj2026, optActual: optResult.total2026, optAdj: optResult.adj2026 },
              { year: 2027, actual: current.total2027, threshold: FY2027_THRESHOLD, adj: current.adj2027, optActual: optResult.total2027, optAdj: optResult.adj2027 },
            ].map(row => {
              const ok = row.actual >= row.threshold
              const optOk = row.optActual >= row.threshold
              const shortfall = Math.max(0, row.threshold - row.actual)
              return (
                <div key={row.year} style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 8 }}>FY{row.year} credit delivery</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: ok ? '#27500A' : '#a32d2d', lineHeight: 1, marginBottom: 4 }}>{fm(row.actual)}</div>
                  <div style={{ height: 6, background: '#eceae3', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ width: Math.min(100, row.actual / row.threshold * 100) + '%', height: '100%', background: ok ? '#639922' : '#E24B4A', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 4 }}>Threshold: {fm(row.threshold)}</div>
                  {!ok && <div style={{ fontSize: 11, color: '#a32d2d', fontWeight: 500 }}>Shortfall: {fm(shortfall)} → penalty: {fm(row.adj)}</div>}
                  {ok && <div style={{ fontSize: 11, color: '#639922', fontWeight: 500 }}>✓ Above threshold — no penalty</div>}
                  {!ok && optOk && <div style={{ fontSize: 10, color: '#27500A', marginTop: 4 }}>✓ Optimal elections clear this threshold</div>}
                </div>
              )
            })}
          </div>

          {/* Summary box */}
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '8px 14px', background: '#eceae3', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Late Delivery Adjustment summary</div>
            {[
              ['FY2026 Late Delivery Adj', fm(current.adj2026), current.adj2026 > 0, fm(optResult.adj2026)],
              ['FY2027 Late Delivery Adj', fm(current.adj2027), current.adj2027 > 0, fm(optResult.adj2027)],
              ['Total', fm(current.totalAdj), current.totalAdj > 0, fm(optResult.totalAdj)],
            ].map(([label, val, warn, optVal]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', alignItems: 'center', padding: '8px 14px', borderBottom: '0.5px solid #f5f4f0', background: '#fff' }}>
                <span style={{ fontSize: 12, color: '#6b6a63' }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8f8e87', textAlign: 'right' }}>Threshold</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: warn ? '#a32d2d' : '#27500A', textAlign: 'right' }}>{val}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: parseInt(optVal.replace(/[$,]/g,'')) > 0 ? '#633806' : '#27500A', textAlign: 'right' }}>{optVal} optimal</span>
              </div>
            ))}
          </div>

          {/* Apply optimal button */}
          {savings > 0 && (
            <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: S.radius, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A', marginBottom: 2 }}>Optimal elections save {fm(savings)} in late delivery adjustments</div>
                <div style={{ fontSize: 11, color: '#3B6D11' }}>Buildings highlighted in amber above have non-optimal elections. Apply all optimal elections at once.</div>
              </div>
              <button onClick={() => save(optimal)} style={{ fontSize: 12, padding: '7px 16px', background: '#27500A', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
                Apply optimal elections
              </button>
            </div>
          )}
          {savings <= 0 && (
            <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: S.radius, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A' }}>✓ Current elections are already optimal for minimizing the late delivery penalty</div>
            </div>
          )}
        </div>
      )}

      {/* BIN TRACKER */}
      {section === 'bins' && (
        <div>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 12 }}>
            CO date = PIS date for both depreciation and tax credit purposes. Enter the actual or expected CO date for each building. Double-click to edit.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: '2 bldgs CO by Dec 31, 2025', sub: '40% bonus depr', count: pis2025.length, req: 2, sev: pis2025.length >= 2 ? 'green' : 'red' },
              { label: '8 bldgs CO by Dec 31, 2026', sub: '20% bonus depr', count: pis2026.length, req: 8, sev: pis2026.length >= 8 ? 'green' : 'amber' },
              { label: 'All 10 by Dec 31, 2026', sub: 'Repurchase Put trigger', count: pis2026.length, req: 10, sev: pis2026.length >= 10 ? 'green' : 'red' },
            ].map(r => {
              const bg = r.sev === 'green' ? '#EAF3DE' : r.sev === 'amber' ? '#FAEEDA' : '#FCEBEB'
              const color = r.sev === 'green' ? '#27500A' : r.sev === 'amber' ? '#633806' : '#791F1F'
              const border = r.sev === 'green' ? '#C0DD97' : r.sev === 'amber' ? '#FAC775' : '#F09595'
              return (
                <div key={r.label} style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: S.radius, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color, fontWeight: 500, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color }}>{r.count}/{r.req}</div>
                  <div style={{ fontSize: 10, color }}>{r.sub}</div>
                </div>
              )
            })}
          </div>

          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 110px 90px 80px 60px 80px', background: '#eceae3', borderBottom: S.border }}>
              {['Building', 'BIN', 'AMI mix', 'CO date', 'Depr yr', 'Status'].map(h => (
                <div key={h} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 500, color: '#6b6a63' }}>{h}</div>
              ))}
            </div>
            {buildings.map(b => {
              const coYear = b.co_date ? parseInt(b.co_date.substring(0, 4)) : null
              const statusBg = b.status === 'CO received' ? '#E6F1FB' : b.status === 'Under construction' ? '#FAEEDA' : '#EAF3DE'
              const statusColor = b.status === 'CO received' ? '#185FA5' : b.status === 'Under construction' ? '#633806' : '#27500A'
              return (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '70px 110px 90px 80px 60px 80px', borderBottom: '0.5px solid #f5f4f0', background: '#fff', alignItems: 'center' }}>
                  <div style={{ padding: '8px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                  <div style={{ padding: '8px 8px', fontSize: 10, color: '#6b6a63', fontFamily: 'monospace' }}>{b.bin}</div>
                  <div style={{ padding: '8px 8px', fontSize: 11, color: '#6b6a63' }}>{b.ami_mix}</div>
                  <div style={{ padding: '4px 8px' }}>
                    <input type="date" value={b.co_date || ''} onChange={e => {
                      const newDate = e.target.value
                      const newYear = newDate ? parseInt(newDate.substring(0,4)) : null
                      updateBldg(b.id, 'co_date', newDate)
                      // Also update status
                      if (newDate && new Date(newDate) <= TODAY) {
                        save(buildings.map(x => x.id === b.id ? { ...x, co_date: newDate, status: 'CO received' } : x))
                      }
                    }}
                    style={{ fontSize: 10, padding: '3px 4px', border: S.border, borderRadius: 4, width: '100%' }} />
                  </div>
                  <div style={{ padding: '8px 8px', fontSize: 11, fontWeight: 500, color: b.bonus_depr_year === 2025 ? '#a32d2d' : '#633806' }}>
                    {b.bonus_depr_year}
                  </div>
                  <div style={{ padding: '8px 6px' }}>
                    <select value={b.status} onChange={e => updateBldg(b.id, 'status', e.target.value)}
                      style={{ fontSize: 9, padding: '2px 3px', border: S.border, borderRadius: 4, width: '100%',
                        background: statusBg, color: statusColor }}>
                      {['CO received','Under construction','Placed in service','Not started'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DEADLINES */}
      {section === 'deadlines' && (
        <div>
          {[
            { date:'2025-12-31', label:'2 buildings CO (40% bonus depreciation)', sev: pis2025.length >= 2 ? 'green':'red', status: `${pis2025.length}/2 confirmed — deadline passed` },
            { date:'2026-04-01', label:'Draw 5 — $3,438,553 (90% construction complete)', sev:'amber', status:'Submit draw docs if at 90%' },
            { date:'2026-06-01', label:'2nd Capital Contribution — $100,000', sev:'blue', status:'Requires Completion + CO all units + as-built' },
            { date:'2026-07-31', label:'Semi-annual report to AHF — $250/day penalty', sev:'amber', status:`${Math.round((new Date('2026-07-31')-TODAY)/86400000)} days remaining` },
            { date:'2026-12-31', label:'ALL 10 buildings CO — Repurchase Put trigger', sev: pis2026.length >= 10 ? 'green':'red', status:`${pis2026.length}/10 confirmed · ${Math.round((new Date('2026-12-31')-TODAY)/86400000)} days` },
            { date:'2026-12-31', label:'Credit year elections confirmed with accountants', sev:'amber', status:'Irrevocable — file with first tax return' },
            { date:'2027-01-15', label:'3rd Capital Contribution — $3,348,772', sev:'blue', status:'Requires stabilization + cost cert + 8609s + IOD' },
            { date:'2027-06-30', label:'Stabilization deadline — Repurchase Put trigger', sev:'red', status:`90% occ + 1.15x DSCR × 3 months + Final Closing · ${Math.round((new Date('2027-06-30')-TODAY)/86400000)} days` },
            { date:'2027-06-01', label:'4th Capital Contribution — $600K less adjustors', sev:'blue', status:'Requires 8609s + first year tax returns' },
          ].map(d => {
            const days = Math.round((new Date(d.date) - TODAY) / 86400000)
            const past = days < 0
            const bg = d.sev==='red' ? '#FCEBEB' : d.sev==='amber' ? '#FAEEDA' : d.sev==='green' ? '#EAF3DE' : '#E6F1FB'
            const color = d.sev==='red' ? '#791F1F' : d.sev==='amber' ? '#633806' : d.sev==='green' ? '#27500A' : '#185FA5'
            const border = d.sev==='red' ? '#F09595' : d.sev==='amber' ? '#FAC775' : d.sev==='green' ? '#C0DD97' : '#B5D4F4'
            return (
              <div key={d.date+d.label} style={{ display:'flex', gap:14, padding:'12px 14px', background:'#fff', border:`0.5px solid ${border}`, borderRadius:S.radius, marginBottom:8 }}>
                <div style={{ textAlign:'center', minWidth:52 }}>
                  <div style={{ fontSize:18, fontWeight:600, color, lineHeight:1 }}>{past ? 'PAST' : Math.abs(days)}</div>
                  <div style={{ fontSize:9, color, fontWeight:500 }}>{past ? 'ago' : 'days'}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a18', marginBottom:2 }}>{d.label}</div>
                  <div style={{ fontSize:11, color:'#6b6a63' }}>{d.date} · {d.status}</div>
                </div>
                <span style={{ background:bg, color, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100, alignSelf:'flex-start', whiteSpace:'nowrap' }}>
                  {d.sev==='green'?'OK':d.sev==='red'?'CRITICAL':d.sev==='amber'?'WATCH':'UPCOMING'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
