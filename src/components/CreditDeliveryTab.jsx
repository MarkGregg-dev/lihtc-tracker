import { useState } from 'react'
import { Kpi, SectionLabel } from './ui'

const S = { border: '0.5px solid #e5e3db', radius: '8px' }
const fm = v => v == null ? '—' : '$' + Math.abs(Math.round(v)).toLocaleString()
const pct = v => v == null ? '—' : Math.round(v * 10) / 10 + '%'

// LPA constants
const PROJECTED_ANNUAL = 3809306
const FY2026_THRESHOLD = 2317826
const FY2027_THRESHOLD = 3808544
const LATE_RATE = 0.60
const TOTAL_UNITS = 363
const BLDG_UNITS = [36, 30, 30, 39, 36, 36, 36, 36, 30, 54]
const BLDG_CREDITS_ANNUAL = BLDG_UNITS.map(u => Math.round(u / TOTAL_UNITS * PROJECTED_ANNUAL))

const STATUS_COLOR = {
  'Placed in service': { bg: '#EAF3DE', color: '#27500A', dot: '#639922' },
  'CO received':       { bg: '#E6F1FB', color: '#185FA5', dot: '#378ADD' },
  'Under construction':{ bg: '#FAEEDA', color: '#633806', dot: '#BA7517' },
  'Not started':       { bg: '#eceae3', color: '#6b6a63', dot: '#8f8e87' },
}

const SK = 'lihtc-bins'

function defaultBuildings() {
  return [
    { id:1,  building:1,  bin:'TX 24-40001', total_units:36, ami_mix:'30% & 60%', status:'Placed in service', pis_date:'2025-09-01', co_date:'2025-08-15', bonus_depr_year:2025, first_credit_year:'2026' },
    { id:2,  building:2,  bin:'TX 24-40002', total_units:30, ami_mix:'60%',       status:'Placed in service', pis_date:'2025-09-01', co_date:'2025-08-15', bonus_depr_year:2025, first_credit_year:'2026' },
    { id:3,  building:3,  bin:'TX 24-40003', total_units:30, ami_mix:'60%',       status:'CO received',       pis_date:'2025-12-01', co_date:'2025-11-01', bonus_depr_year:2025, first_credit_year:'2026' },
    { id:4,  building:4,  bin:'TX 24-40004', total_units:39, ami_mix:'30% & 60%', status:'CO received',       pis_date:'2025-12-15', co_date:'2025-12-01', bonus_depr_year:2025, first_credit_year:'2026' },
    { id:5,  building:5,  bin:'TX 24-40005', total_units:36, ami_mix:'60%',       status:'CO received',       pis_date:'2026-02-01', co_date:'2026-01-15', bonus_depr_year:2026, first_credit_year:'2026' },
    { id:6,  building:6,  bin:'TX 24-40006', total_units:36, ami_mix:'60%',       status:'CO received',       pis_date:'2026-03-01', co_date:'2026-02-01', bonus_depr_year:2026, first_credit_year:'2026' },
    { id:7,  building:7,  bin:'TX 24-40007', total_units:36, ami_mix:'60%',       status:'Under construction', pis_date:'', co_date:'', bonus_depr_year:2026, first_credit_year:'2026' },
    { id:8,  building:8,  bin:'TX 24-40008', total_units:36, ami_mix:'60%',       status:'CO received',       pis_date:'2026-02-01', co_date:'2026-01-01', bonus_depr_year:2026, first_credit_year:'2026' },
    { id:9,  building:9,  bin:'TX 24-40009', total_units:30, ami_mix:'60%',       status:'Under construction', pis_date:'', co_date:'', bonus_depr_year:2026, first_credit_year:'2026' },
    { id:10, building:10, bin:'TX 24-40010', total_units:54, ami_mix:'30% & 60%', status:'Placed in service', pis_date:'2025-09-01', co_date:'2025-08-01', bonus_depr_year:2025, first_credit_year:'2026' },
  ]
}

// Section 42(f)(2): first year credits = annual × applicable_fraction × months_in_service/12
// Section 42(f)(1): election to defer first credit year to following year
function buildingCreditsForYear(b, idx, year, appFraction) {
  if (!b.pis_date) return 0
  const pisDate = new Date(b.pis_date)
  const firstCreditYear = parseInt(b.first_credit_year || b.pis_date?.substring(0, 4) || '2026')
  const fullAnnual = BLDG_CREDITS_ANNUAL[idx]

  if (year < firstCreditYear) return 0

  if (year === firstCreditYear) {
    // 42(f)(2) partial year rule — months from PIS or Jan 1 of first credit year
    const fcy = new Date(`${firstCreditYear}-01-01`)
    const effectiveStart = pisDate > fcy ? pisDate : fcy
    const yearEnd = new Date(`${firstCreditYear}-12-31`)
    const months = Math.max(0, (yearEnd - effectiveStart) / (1000 * 60 * 60 * 24 * 30.5))
    return Math.round(fullAnnual * appFraction * Math.min(1, months / 12))
  }

  // Subsequent years — check if within 10-year credit period
  if (year > firstCreditYear + 10) return 0
  // 11th year catchup: gets the months missed in year 1
  if (year === firstCreditYear + 10) {
    const fcy = new Date(`${firstCreditYear}-01-01`)
    const effectiveStart = pisDate > fcy ? pisDate : fcy
    const yearEnd = new Date(`${firstCreditYear}-12-31`)
    const monthsGot = Math.max(0, (yearEnd - effectiveStart) / (1000 * 60 * 60 * 24 * 30.5))
    const monthsMissed = 12 - Math.min(12, monthsGot)
    return Math.round(fullAnnual * appFraction * monthsMissed / 12)
  }

  return Math.round(fullAnnual * appFraction)
}

function projectedAppFraction(b, year, currentOccupied, leasePace) {
  const yearEnd = new Date(`${year}-12-31`)
  const today = new Date()
  const monthsFromNow = Math.max(0, (yearEnd - today) / (1000 * 60 * 60 * 24 * 30.5))
  const projTotal = Math.min(TOTAL_UNITS * 0.95, currentOccupied + leasePace * monthsFromNow)
  const projBldg = Math.round(projTotal * (b.total_units / TOTAL_UNITS))
  return Math.min(1, projBldg / b.total_units)
}

export function CreditDeliveryTab({ project }) {
  const [buildings, setBuildings] = useState(() => {
    try {
      const saved = localStorage.getItem(SK + '-' + (project?.id || ''))
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.map(b => ({ ...b, first_credit_year: b.first_credit_year || '2026' }))
      }
    } catch {}
    return defaultBuildings()
  })
  const [leasePace, setLeasePace] = useState(22)
  const [currentOccupied, setCurrentOccupied] = useState(63)
  const [editingBldg, setEditingBldg] = useState(null)
  const [editVals, setEditVals] = useState({})
  const [section, setSection] = useState('overview')

  function save(updated) {
    setBuildings(updated)
    try { localStorage.setItem(SK + '-' + project?.id, JSON.stringify(updated)) } catch {}
  }

  function updateFirstCreditYear(id, val) {
    save(buildings.map(b => b.id === id ? { ...b, first_credit_year: val } : b))
  }

  // --- Credit calculations ---
  function totalActualCredits(year) {
    return buildings.reduce((sum, b, i) => {
      const af = projectedAppFraction(b, year, currentOccupied, leasePace)
      return sum + buildingCreditsForYear(b, i, year, af)
    }, 0)
  }

  const actual2026 = Math.round(totalActualCredits(2026))
  const actual2027 = Math.round(totalActualCredits(2027))
  const lateAdj2026 = actual2026 < FY2026_THRESHOLD ? Math.round((FY2026_THRESHOLD - actual2026) * LATE_RATE) : 0
  const lateAdj2027 = actual2027 < FY2027_THRESHOLD ? Math.round((FY2027_THRESHOLD - actual2027) * LATE_RATE) : 0
  const totalAdj = lateAdj2026 + lateAdj2027

  // PIS stats
  const pis2025 = buildings.filter(b => b.pis_date && new Date(b.pis_date) <= new Date('2025-12-31'))
  const pis2026 = buildings.filter(b => b.pis_date && new Date(b.pis_date) <= new Date('2026-12-31'))
  const daysAllPIS = Math.round((new Date('2026-12-31') - new Date()) / 86400000)
  const daysStab = Math.round((new Date('2027-06-30') - new Date()) / 86400000)

  const navItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'election', label: 'Credit year election' },
    { key: 'bins', label: 'BIN tracker' },
    { key: 'calculator', label: 'Adjustor model' },
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

      {/* OVERVIEW */}
      {section === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
            <Kpi label="2025 bonus depr" value={`${pis2025.length}/2 req'd`} sub="40% — Dec 31 2025" warn={pis2025.length < 2} />
            <Kpi label="All PIS by Dec 31 2026" value={`${pis2026.length}/10`} sub={daysAllPIS + ' days left'} warn={pis2026.length < 10} />
            <Kpi label="Est. FY2026 credits" value={fm(actual2026)} sub={`vs ${fm(FY2026_THRESHOLD)} threshold`} warn={actual2026 < FY2026_THRESHOLD} />
            <Kpi label="Est. FY2027 credits" value={fm(actual2027)} sub={`vs ${fm(FY2027_THRESHOLD)} threshold`} warn={actual2027 < FY2027_THRESHOLD} />
            <Kpi label="Total late delivery adj" value={fm(totalAdj)} sub="reduces capital contributions" warn={totalAdj > 0} />
            <Kpi label="Stabilization" value="Jun 30, 2027" sub={daysStab + ' days'} warn={daysStab < 180} />
          </div>

          {/* Building focus */}
          <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', marginBottom: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 6 }}>Building focus — fill one building at a time</div>
            <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 10, lineHeight: 1.5 }}>
              A fully leased building has applicable fraction = 1.0, generating maximum credits per BIN. Concentrating leases in one building until full then moving to the next maximizes credit delivery and reduces Late Delivery Adjustment exposure.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
              {buildings
                .filter(b => b.pis_date)
                .map((b, i) => {
                  const idx = buildings.findIndex(x => x.id === b.id)
                  const af = projectedAppFraction(b, 2026, currentOccupied, leasePace)
                  const occPct = Math.round(af * 100)
                  const needed = Math.max(0, b.total_units - Math.round(af * b.total_units))
                  const monthsToFill = leasePace > 0 ? (needed / leasePace).toFixed(1) : '—'
                  const color = occPct >= 90 ? '#27500A' : occPct >= 60 ? '#633806' : '#a32d2d'
                  const bg = occPct >= 90 ? '#EAF3DE' : occPct >= 60 ? '#FAEEDA' : '#FCEBEB'
                  const bc = occPct >= 90 ? '#C0DD97' : occPct >= 60 ? '#FAC775' : '#F09595'
                  const credits2026 = buildingCreditsForYear(b, idx, 2026, af)
                  return (
                    <div key={b.id} style={{ background: bg, border: `0.5px solid ${bc}`, borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 2 }}>Bldg {b.building}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{occPct}%</div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '5px 0' }}>
                        <div style={{ width: occPct + '%', height: '100%', background: color, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color }}>{needed} units to fill · {monthsToFill}mo</div>
                      <div style={{ fontSize: 9, color, marginTop: 2 }}>FY26 credits: {fm(credits2026)}</div>
                    </div>
                  )
                })
                .sort((a, b) => parseInt(a.key) - parseInt(b.key))
              }
            </div>
          </div>
        </div>
      )}

      {/* CREDIT YEAR ELECTION */}
      {section === 'election' && (
        <div>
          <div style={{ background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: S.radius, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', marginBottom: 4 }}>Section 42(f)(1) election — irrevocable per building</div>
            <div style={{ fontSize: 11, color: '#185FA5', lineHeight: 1.5 }}>
              Each building (BIN) can elect its first credit year as either the placed-in-service year OR the following year. Under 42(f)(2), if the PIS year is elected, credits are prorated to months in service. Electing the next year gives a full year of credits but generates nothing in the PIS year. This election must be coordinated with your accountants — it is irrevocable once the tax return is filed.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>Current occupied units</div>
              <input type="number" value={currentOccupied} onChange={e => setCurrentOccupied(parseInt(e.target.value)||0)}
                style={{ fontSize: 12, padding: '5px 8px', border: S.border, borderRadius: 6, width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>Monthly absorption (units/mo)</div>
              <input type="number" value={leasePace} onChange={e => setLeasePace(parseInt(e.target.value)||0)}
                style={{ fontSize: 12, padding: '5px 8px', border: S.border, borderRadius: 6, width: '100%' }} />
            </div>
          </div>

          {/* Per-building election table */}
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 90px 90px 80px 90px 90px 110px 90px', background: '#eceae3', borderBottom: S.border }}>
              {['Bldg', 'BIN', 'PIS date', 'Election', 'App frac', 'FY26 cred', 'FY27 cred', 'Recommend'].map(h => (
                <div key={h} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 500, color: '#6b6a63' }}>{h}</div>
              ))}
            </div>
            {buildings.map((b, i) => {
              if (!b.pis_date) {
                return (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '70px 90px 90px 80px 90px 90px 110px 90px', borderBottom: '0.5px solid #f5f4f0', background: '#fff', alignItems: 'center' }}>
                    <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87', fontFamily: 'monospace' }}>{b.bin}</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>No PIS yet</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>—</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>—</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>—</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>—</div>
                    <div style={{ padding: '7px 8px', fontSize: 10, color: '#8f8e87' }}>—</div>
                  </div>
                )
              }

              const pisYear = parseInt(b.pis_date.substring(0, 4))
              const nextYear = pisYear + 1
              const currentElection = b.first_credit_year || String(pisYear)

              const af2026 = projectedAppFraction(b, 2026, currentOccupied, leasePace)
              const af2027 = projectedAppFraction(b, 2027, currentOccupied, leasePace)

              // Credits under current election
              const cred2026 = buildingCreditsForYear(b, i, 2026, af2026)
              const cred2027 = buildingCreditsForYear(b, i, 2027, af2027)

              // Calculate optimal election
              // Option A: elect PIS year
              const bA = { ...b, first_credit_year: String(pisYear) }
              const credA_2026 = buildingCreditsForYear(bA, i, 2026, af2026)
              const credA_2027 = buildingCreditsForYear(bA, i, 2027, af2027)

              // Option B: elect following year
              const bB = { ...b, first_credit_year: String(pisYear + 1) }
              const credB_2026 = buildingCreditsForYear(bB, i, 2026, af2026)
              const credB_2027 = buildingCreditsForYear(bB, i, 2027, af2027)

              // Net financial impact: consider both years' late delivery adjustments
              // If electing PIS year adds credits to a year that's already below threshold, those credits save $0.60 each
              // We need total context but simplified: elect PIS year if it meaningfully contributes to 2026 threshold
              const pisMonth = parseInt(b.pis_date.substring(5, 7))
              const monthsInPISYear = pisYear === 2025 ? 12 : (13 - pisMonth) // months in service in PIS year
              const recommend = pisYear <= 2025 ? String(pisYear)
                : monthsInPISYear >= 6 ? String(pisYear)  // >= 6 months → elect current year
                : String(pisYear + 1)  // < 6 months in PIS year → elect next year for full year

              const recommendReason = pisYear <= 2025 ? 'Already in 2025'
                : monthsInPISYear >= 6 ? `${monthsInPISYear}mo in ${pisYear} — worth claiming`
                : `Only ${monthsInPISYear}mo in ${pisYear} — better to take full ${pisYear+1}`

              const isOptimal = currentElection === recommend
              const electionOptions = [String(pisYear), String(pisYear + 1)]

              return (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '70px 90px 90px 80px 90px 90px 110px 90px', borderBottom: '0.5px solid #f5f4f0', background: '#fff', alignItems: 'center' }}>
                  <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                  <div style={{ padding: '7px 8px', fontSize: 10, color: '#6b6a63', fontFamily: 'monospace' }}>{b.bin}</div>
                  <div style={{ padding: '7px 8px', fontSize: 11, color: '#1a1a18' }}>
                    {b.pis_date}
                    <div style={{ fontSize: 9, color: '#8f8e87' }}>{monthsInPISYear}mo in {pisYear}</div>
                  </div>
                  <div style={{ padding: '4px 8px' }}>
                    <select value={currentElection} onChange={e => updateFirstCreditYear(b.id, e.target.value)}
                      style={{ fontSize: 10, padding: '3px 4px', border: S.border, borderRadius: 4, width: '100%',
                        background: isOptimal ? '#EAF3DE' : '#FCEBEB',
                        color: isOptimal ? '#27500A' : '#a32d2d' }}>
                      {electionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ padding: '7px 8px', fontSize: 11, color: '#1a1a18' }}>{pct(af2026)}</div>
                  <div style={{ padding: '7px 8px', fontSize: 11, fontWeight: 500, color: cred2026 > 0 ? '#27500A' : '#8f8e87' }}>{fm(cred2026)}</div>
                  <div style={{ padding: '7px 8px', fontSize: 11, fontWeight: 500, color: cred2027 > 0 ? '#27500A' : '#8f8e87' }}>{fm(cred2027)}</div>
                  <div style={{ padding: '7px 8px' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: isOptimal ? '#27500A' : '#a32d2d' }}>
                      {isOptimal ? '✓ Optimal' : `→ Elect ${recommend}`}
                    </div>
                    <div style={{ fontSize: 8, color: '#8f8e87', lineHeight: 1.3, marginTop: 1 }}>{recommendReason}</div>
                  </div>
                </div>
              )
            })}
            {/* Totals row */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 90px 90px 80px 90px 90px 110px 90px', background: '#eceae3', borderTop: S.border }}>
              <div style={{ padding: '7px 8px', fontSize: 11, fontWeight: 600, color: '#1a1a18', gridColumn: '1/5' }}>Total actual credits</div>
              <div style={{ padding: '7px 8px', fontSize: 11 }}></div>
              <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 600, color: actual2026 >= FY2026_THRESHOLD ? '#27500A' : '#a32d2d' }}>{fm(actual2026)}</div>
              <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 600, color: actual2027 >= FY2027_THRESHOLD ? '#27500A' : '#a32d2d' }}>{fm(actual2027)}</div>
              <div style={{ padding: '7px 8px' }}></div>
            </div>
          </div>

          {/* Threshold comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { year: 2026, actual: actual2026, threshold: FY2026_THRESHOLD, adj: lateAdj2026 },
              { year: 2027, actual: actual2027, threshold: FY2027_THRESHOLD, adj: lateAdj2027 },
            ].map(row => {
              const ok = row.actual >= row.threshold
              const shortfall = Math.max(0, row.threshold - row.actual)
              return (
                <div key={row.year} style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 8 }}>FY{row.year} credit delivery</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: ok ? '#27500A' : '#a32d2d', marginBottom: 4 }}>{fm(row.actual)}</div>
                  <div style={{ height: 6, background: '#eceae3', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ width: Math.min(100, row.actual / row.threshold * 100) + '%', height: '100%', background: ok ? '#639922' : '#E24B4A', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#6b6a63' }}>Threshold: {fm(row.threshold)}</div>
                  {!ok && (
                    <div style={{ fontSize: 11, color: '#a32d2d', marginTop: 4, fontWeight: 500 }}>
                      Shortfall: {fm(shortfall)} → Late Delivery Adj: {fm(row.adj)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: S.radius, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#633806', marginBottom: 3 }}>Total Late Delivery Adjustment: {fm(totalAdj)}</div>
            <div style={{ fontSize: 11, color: '#854F0B', lineHeight: 1.4 }}>
              This reduces the 2nd CC ($100K) first, then 3rd CC ($3.35M), then 4th CC ($600K). Change elections above to model different scenarios. Confirm optimal elections with your accountants before filing — they are irrevocable.
            </div>
          </div>
        </div>
      )}

      {/* BIN TRACKER */}
      {section === 'bins' && (
        <div>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 12 }}>
            Update CO and PIS dates as they are received. Changes flow through to all credit delivery calculations.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: '2 bldgs PIS by Dec 31, 2025', sub: '40% bonus depr', count: pis2025.length, req: 2, sev: pis2025.length >= 2 ? 'green' : 'red' },
              { label: '8 bldgs PIS by Dec 31, 2026', sub: '20% bonus depr', count: pis2026.length, req: 8, sev: pis2026.length >= 8 ? 'green' : 'amber' },
              { label: 'All 10 by Dec 31, 2026', sub: 'Repurchase Put', count: pis2026.length, req: 10, sev: pis2026.length >= 10 ? 'green' : 'red' },
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
            <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 100px 100px 80px 60px', background: '#eceae3', borderBottom: S.border }}>
              {['Building', 'BIN', 'CO date', 'PIS date', 'Bonus yr', 'Status'].map(h => (
                <div key={h} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 500, color: '#6b6a63' }}>{h}</div>
              ))}
            </div>
            {buildings.map(b => {
              const sc = STATUS_COLOR[b.status] || STATUS_COLOR['Not started']
              const isEditing = editingBldg === b.id
              return (
                <div key={b.id}>
                  {!isEditing ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 100px 100px 80px 60px', borderBottom: S.border, background: '#fff', alignItems: 'center' }}
                      onDoubleClick={() => { setEditingBldg(b.id); setEditVals({ ...b }) }}>
                      <div style={{ padding: '8px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                      <div style={{ padding: '8px 8px', fontSize: 10, color: '#6b6a63', fontFamily: 'monospace' }}>{b.bin}</div>
                      <div style={{ padding: '8px 8px', fontSize: 11, color: b.co_date ? '#1a1a18' : '#8f8e87' }}>{b.co_date || '—'}</div>
                      <div style={{ padding: '8px 8px', fontSize: 11, color: b.pis_date ? '#27500A' : '#8f8e87', fontWeight: b.pis_date ? 500 : 400 }}>{b.pis_date || '—'}</div>
                      <div style={{ padding: '8px 8px', fontSize: 11, fontWeight: 500, color: b.bonus_depr_year === 2025 ? '#a32d2d' : '#633806' }}>{b.bonus_depr_year}</div>
                      <div style={{ padding: '8px 6px' }}>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: 9, fontWeight: 500, padding: '2px 5px', borderRadius: 100 }}>{b.status.replace('Under construction', 'U/C')}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 12px', background: '#f5f4f0', borderBottom: S.border }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Edit Building {b.building}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginBottom: 8 }}>
                        {[
                          ['Status', 'status', 'select', ['Placed in service','CO received','Under construction','Not started']],
                          ['CO date', 'co_date', 'date'],
                          ['PIS date', 'pis_date', 'date'],
                          ['Bonus depr year', 'bonus_depr_year', 'select', ['2025','2026']],
                        ].map(([label, field, type, opts]) => (
                          <div key={field}>
                            <div style={{ fontSize: 10, color: '#6b6a63', marginBottom: 3 }}>{label}</div>
                            {type === 'select' ? (
                              <select value={String(editVals[field] || '')} onChange={e => setEditVals(v => ({ ...v, [field]: field === 'bonus_depr_year' ? parseInt(e.target.value) : e.target.value }))}
                                style={{ fontSize: 11, padding: '4px 6px', border: S.border, borderRadius: 4, width: '100%' }}>
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input type={type} value={editVals[field] || ''} onChange={e => setEditVals(v => ({ ...v, [field]: e.target.value }))}
                                style={{ fontSize: 11, padding: '4px 6px', border: S.border, borderRadius: 4, width: '100%' }} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { save(buildings.map(b2 => b2.id === editingBldg ? { ...editVals } : b2)); setEditingBldg(null) }}
                          style={{ fontSize: 11, padding: '4px 12px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingBldg(null)}
                          style={{ fontSize: 11, padding: '4px 12px', background: '#eceae3', color: '#6b6a63', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 6 }}>Double-click any row to edit</div>
        </div>
      )}

      {/* ADJUSTOR MODEL */}
      {section === 'calculator' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff' }}>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>Assumptions</div>
              {[['Current occupied', currentOccupied, setCurrentOccupied], ['Monthly pace', leasePace, setLeasePace]].map(([l, v, s]) => (
                <div key={l} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#6b6a63', marginBottom: 2 }}>{l}</div>
                  <input type="number" value={v} onChange={e => s(parseInt(e.target.value)||0)}
                    style={{ fontSize: 12, padding: '4px 8px', border: S.border, borderRadius: 6, width: '100%' }} />
                </div>
              ))}
            </div>
            <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff' }}>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>LPA thresholds</div>
              {[
                ['FY2026 threshold', fm(FY2026_THRESHOLD)],
                ['FY2027 threshold', fm(FY2027_THRESHOLD)],
                ['Late delivery rate', '$0.60/credit $'],
                ['Credit price', '$0.8275/credit $'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '0.5px solid #f5f4f0', fontSize: 11 }}>
                  <span style={{ color: '#6b6a63' }}>{l}</span><span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '8px 14px', background: '#eceae3', fontSize: 12, fontWeight: 500 }}>Downward adjustor summary</div>
            {[
              ['Late Delivery Adj FY2026', fm(lateAdj2026), lateAdj2026 > 0],
              ['Late Delivery Adj FY2027', fm(lateAdj2027), lateAdj2027 > 0],
              ['Bonus Depr Adjustor (2025)', pis2025.length >= 2 ? 'None expected' : 'TBD by AHF', pis2025.length < 2],
              ['Bonus Depr Adjustor (2026)', pis2026.length >= 8 ? 'None expected' : 'TBD by AHF', pis2026.length < 8],
              ['Certified Credit Decrease', 'TBD at 8609 issuance', false],
              ['TOTAL estimated Downward Adj', fm(totalAdj) + ' minimum', totalAdj > 0],
            ].map(([l, v, warn]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '0.5px solid #f5f4f0', background: '#fff' }}>
                <span style={{ fontSize: 12, color: '#6b6a63' }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: warn ? '#a32d2d' : '#27500A' }}>{v}</span>
              </div>
            ))}
          </div>
          {/* Per building FY2026 */}
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: '#eceae3', fontSize: 12, fontWeight: 500 }}>Per-building FY2026 credits</div>
            {buildings.map((b, i) => {
              const af = projectedAppFraction(b, 2026, currentOccupied, leasePace)
              const cred = buildingCreditsForYear(b, i, 2026, af)
              const fullYr = BLDG_CREDITS_ANNUAL[i]
              const pisYear = b.pis_date ? parseInt(b.pis_date.substring(0,4)) : null
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '0.5px solid #f5f4f0', background: '#fff' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', minWidth: 60 }}>Bldg {b.building}</span>
                  <span style={{ fontSize: 10, color: '#6b6a63', minWidth: 80 }}>FCY: {b.first_credit_year || '—'}</span>
                  <span style={{ fontSize: 10, color: '#6b6a63', minWidth: 70 }}>AF: {pct(af)}</span>
                  <div style={{ flex: 1, height: 4, background: '#eceae3', borderRadius: 2 }}>
                    <div style={{ width: (cred/fullYr*100) + '%', height: '100%', background: cred > 0 ? '#639922' : '#eceae3', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: cred > 0 ? '#27500A' : '#8f8e87', minWidth: 70, textAlign: 'right' }}>{fm(cred)}</span>
                  <span style={{ fontSize: 10, color: '#8f8e87', minWidth: 70, textAlign: 'right' }}>of {fm(fullYr)}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#eceae3', borderTop: S.border }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Total FY2026</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: actual2026 >= FY2026_THRESHOLD ? '#27500A' : '#a32d2d' }}>{fm(actual2026)} vs {fm(FY2026_THRESHOLD)} threshold</span>
            </div>
          </div>
        </div>
      )}

      {/* DEADLINES */}
      {section === 'deadlines' && (
        <div>
          {[
            { date:'2025-12-31', label:'2 buildings placed in service (40% bonus depr)', sev: pis2025.length >= 2 ? 'green':'red', status: pis2025.length >= 2 ? `${pis2025.length} confirmed`:`Only ${pis2025.length} — check with accountants` },
            { date:'2026-04-01', label:'Draw 5 eligible — $3,438,553 (90% construction)', sev:'amber', status:'Submit draw docs if 90% complete' },
            { date:'2026-06-01', label:'2nd Capital Contribution eligible — $100,000', sev:'blue', status:'Requires Completion + CO all units + as-built survey' },
            { date:'2026-07-31', label:'Semi-annual report to AHF — $250/day penalty', sev:'amber', status:`${Math.round((new Date('2026-07-31')-new Date())/86400000)} days remaining` },
            { date:'2026-12-31', label:'ALL 10 buildings placed in service — Repurchase Put', sev: pis2026.length >= 10 ? 'green':'red', status:`${pis2026.length}/10 · ${daysAllPIS} days` },
            { date:'2026-12-31', label:'Credit year elections finalized with accountants', sev:'amber', status:'Irrevocable — coordinate before first tax return' },
            { date:'2027-01-15', label:'3rd Capital Contribution eligible — $3,348,772', sev:'blue', status:'Requires stabilization + cost cert + 8609s + IOD' },
            { date:'2027-06-30', label:'Stabilization deadline — Repurchase Put', sev: daysStab > 180 ? 'amber':'red', status:`90% occ + 1.15x DSCR × 3mo + Final Closing · ${daysStab} days` },
            { date:'2027-06-01', label:'4th Capital Contribution — $600K less adjustors', sev:'blue', status:'Requires 8609s + first year tax returns' },
          ].map(d => {
            const days = Math.round((new Date(d.date) - new Date()) / 86400000)
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
