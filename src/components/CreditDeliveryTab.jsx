import { useState, useEffect } from 'react'
import { Kpi, SectionLabel } from './ui'

const S = { border: '0.5px solid #e5e3db', radius: '8px' }
const fm = v => v == null ? '—' : '$' + Math.abs(Math.round(v)).toLocaleString()

// LPA constants
const PROJECTED_ANNUAL = 3809306
const PROJECTED_TOTAL = 38093060
const CREDIT_PRICE = 0.8275
const FY2026_THRESHOLD = 2317826
const FY2027_THRESHOLD = 3808544
const LATE_DELIVERY_RATE = 0.60
const CERTIFIED_CREDIT_BASE = 38085441
const TOTAL_UNITS = 363

// Building credit shares (proportional to units)
const BLDG_UNITS = [36, 30, 30, 39, 36, 36, 36, 36, 30, 54]
const BLDG_CREDITS = BLDG_UNITS.map(u => Math.round(u / TOTAL_UNITS * PROJECTED_ANNUAL))

// LPA bonus depr requirements
// 2 buildings (smallest 2) by Dec 31 2025 = 40% bonus
// 8 buildings by Dec 31 2026 = 20% bonus
const DEPR2025_REQUIRED = 2
const DEPR2026_REQUIRED = 8
const PIS_DEADLINE_ALL = new Date('2026-12-31')
const STAB_DEADLINE = new Date('2027-06-30')
const TODAY = new Date()

function daysUntil(d) { return Math.round((d - TODAY) / 86400000) }
function qtrLabel(dt) {
  if (!dt) return null
  const d = new Date(dt)
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${String(d.getFullYear()).slice(2)}`
}

const STATUS_COLOR = {
  'Placed in service': { bg: '#EAF3DE', color: '#27500A', dot: '#639922' },
  'CO received':       { bg: '#E6F1FB', color: '#185FA5', dot: '#378ADD' },
  'Under construction':{ bg: '#FAEEDA', color: '#633806', dot: '#BA7517' },
  'Not started':       { bg: '#eceae3', color: '#6b6a63', dot: '#8f8e87' },
}

const SK = 'lihtc-bins'

export function CreditDeliveryTab({ project }) {
  const [buildings, setBuildings] = useState(() => {
    try {
      const saved = localStorage.getItem(SK + '-' + (project?.id || ''))
      return saved ? JSON.parse(saved) : defaultBuildings()
    } catch { return defaultBuildings() }
  })
  const [leasePace, setLeasePace] = useState(22)
  const [currentOccupied, setCurrentOccupied] = useState(63)
  const [editingBldg, setEditingBldg] = useState(null)
  const [editVals, setEditVals] = useState({})
  const [section, setSection] = useState('overview')

  function defaultBuildings() {
    return [
      { id:1, building:1, bin:'TX 24-40001', total_units:36, ami_mix:'30% & 60%', status:'Placed in service', pis_date:'2025-09-01', co_date:'2025-08-15', bonus_depr_year:2025 },
      { id:2, building:2, bin:'TX 24-40002', total_units:30, ami_mix:'60%', status:'Placed in service', pis_date:'2025-09-01', co_date:'2025-08-15', bonus_depr_year:2025 },
      { id:3, building:3, bin:'TX 24-40003', total_units:30, ami_mix:'60%', status:'CO received', pis_date:'', co_date:'2025-11-01', bonus_depr_year:2025 },
      { id:4, building:4, bin:'TX 24-40004', total_units:39, ami_mix:'30% & 60%', status:'CO received', pis_date:'', co_date:'2025-12-01', bonus_depr_year:2025 },
      { id:5, building:5, bin:'TX 24-40005', total_units:36, ami_mix:'60%', status:'CO received', pis_date:'', co_date:'2026-01-15', bonus_depr_year:2026 },
      { id:6, building:6, bin:'TX 24-40006', total_units:36, ami_mix:'60%', status:'CO received', pis_date:'', co_date:'2026-02-01', bonus_depr_year:2026 },
      { id:7, building:7, bin:'TX 24-40007', total_units:36, ami_mix:'60%', status:'Under construction', pis_date:'', co_date:'', bonus_depr_year:2026 },
      { id:8, building:8, bin:'TX 24-40008', total_units:36, ami_mix:'60%', status:'CO received', pis_date:'', co_date:'2026-01-01', bonus_depr_year:2026 },
      { id:9, building:9, bin:'TX 24-40009', total_units:30, ami_mix:'60%', status:'Under construction', pis_date:'', co_date:'', bonus_depr_year:2026 },
      { id:10, building:10, bin:'TX 24-40010', total_units:54, ami_mix:'30% & 60%', status:'Placed in service', pis_date:'2025-09-01', co_date:'2025-08-01', bonus_depr_year:2025 },
    ]
  }

  function save(updated) {
    setBuildings(updated)
    try { localStorage.setItem(SK + '-' + project?.id, JSON.stringify(updated)) } catch {}
  }

  function startEdit(b) { setEditingBldg(b.id); setEditVals({ ...b }) }
  function saveEdit() { save(buildings.map(b => b.id === editingBldg ? { ...editVals } : b)); setEditingBldg(null) }

  // --- Credit delivery calculations ---
  function estimateActualCredits(year) {
    let total = 0
    const startUnits = currentOccupied
    buildings.forEach((b, i) => {
      const pisDate = b.pis_date ? new Date(b.pis_date) : null
      if (!pisDate) return
      if (pisDate.getFullYear() > year) return

      const yearStart = new Date(`${year}-01-01`)
      const yearEnd = new Date(`${year}-12-31`)
      const effectiveStart = pisDate > yearStart ? pisDate : yearStart

      // Months in service this year
      const monthsInService = (yearEnd - effectiveStart) / (1000 * 60 * 60 * 24 * 30.5)
      const fractionOfYear = Math.min(1, Math.max(0, monthsInService / 12))

      // Estimate applicable fraction: occupied / total at end of year
      // Simplified: use current pace projecting forward
      const monthsFromNow = (yearEnd - TODAY) / (1000 * 60 * 60 * 24 * 30.5)
      const projectedTotal = Math.min(TOTAL_UNITS * 0.95, startUnits + leasePace * Math.max(0, monthsFromNow))
      const projectedOccupied = Math.round(projectedTotal * (b.total_units / TOTAL_UNITS))
      const appFraction = Math.min(1, projectedOccupied / b.total_units)

      const bldgCredits = BLDG_CREDITS[i] * appFraction * fractionOfYear
      total += bldgCredits
    })
    return Math.round(total)
  }

  const actual2026 = estimateActualCredits(2026)
  const actual2027 = estimateActualCredits(2027)

  const lateDelivery2026 = actual2026 < FY2026_THRESHOLD
    ? Math.round((FY2026_THRESHOLD - actual2026) * LATE_DELIVERY_RATE) : 0
  const lateDelivery2027 = actual2027 < FY2027_THRESHOLD
    ? Math.round((FY2027_THRESHOLD - actual2027) * LATE_DELIVERY_RATE) : 0
  const totalLateDelivery = lateDelivery2026 + lateDelivery2027

  // Bonus depreciation status
  const pis2025 = buildings.filter(b => b.pis_date && new Date(b.pis_date) <= new Date('2025-12-31'))
  const pis2026 = buildings.filter(b => b.pis_date && new Date(b.pis_date) <= new Date('2026-12-31'))
  const allPIS2026 = pis2026.length
  const miss2025 = Math.max(0, DEPR2025_REQUIRED - pis2025.length)
  const miss2026 = Math.max(0, DEPR2026_REQUIRED - pis2026.length)
  const pisDeadlineOk = allPIS2026 === 10

  // Downward adjustor estimate
  const downwardAdjustor = totalLateDelivery // simplified — certified credit adjustor calculated at 8609

  const daysAllPIS = daysUntil(PIS_DEADLINE_ALL)
  const daysStab = daysUntil(STAB_DEADLINE)

  const navItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'bins', label: 'BIN tracker' },
    { key: 'calculator', label: 'Adjustor calculator' },
    { key: 'deadlines', label: 'Deadlines' },
  ]

  return (
    <div>
      {/* Nav */}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
            <Kpi label="2025 bonus depr" value={`${pis2025.length}/${DEPR2025_REQUIRED} req'd`}
              sub="40% — Dec 31 2025 deadline" warn={pis2025.length < DEPR2025_REQUIRED} />
            <Kpi label="2026 bonus depr" value={`${pis2026.length}/${DEPR2026_REQUIRED} req'd`}
              sub="20% — Dec 31 2026 deadline" warn={pis2026.length < DEPR2026_REQUIRED} />
            <Kpi label="All PIS by Dec 31 2026" value={`${allPIS2026}/10`}
              sub={daysAllPIS > 0 ? daysAllPIS + ' days' : 'PAST'} warn={allPIS2026 < 10} />
            <Kpi label="Est. FY2026 credits" value={fm(actual2026)}
              sub={`vs $${(FY2026_THRESHOLD/1000).toFixed(0)}K threshold`} warn={actual2026 < FY2026_THRESHOLD} />
            <Kpi label="Est. late delivery adj" value={fm(totalLateDelivery)}
              sub="reduces capital contributions" warn={totalLateDelivery > 0} />
            <Kpi label="Stabilization deadline" value="Jun 30, 2027"
              sub={daysStab + ' days remaining'} warn={daysStab < 180} />
          </div>

          {/* Building focus strategy */}
      <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', marginBottom: 14, background: '#fff' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 8 }}>Building focus strategy — maximize credit delivery</div>
        <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 10, lineHeight: 1.5 }}>
          To maximize FY2026 credit delivery, concentrate leasing in one building at a time until it hits 100% occupancy. A fully leased building has applicable fraction = 1.0, generating maximum credits. Splitting leases across buildings reduces every building's applicable fraction.
        </div>
        {(() => {
          // Find best buildings to focus on — PIS buildings with lowest occupancy first
          const pisBldgs = buildings.filter(b => b.pis_date && new Date(b.pis_date) <= new Date('2026-12-31'))
          const totalOcc = currentOccupied
          const totalUnitsAll = buildings.reduce((a, b) => a + b.total_units, 0)
          // Estimate current occupancy per building proportionally
          const bldgsWithOcc = pisBldgs.map((b, i) => {
            const estOcc = Math.round(totalOcc * b.total_units / totalUnitsAll)
            const needed = b.total_units - estOcc
            const monthsToFill = leasePace > 0 ? (needed / leasePace).toFixed(1) : '—'
            const fullYrIdx = buildings.findIndex(x => x.id === b.id)
            const credits = BLDG_CREDITS[fullYrIdx] || 0
            return { ...b, estOcc, needed, monthsToFill, credits }
          }).sort((a, b) => a.needed - b.needed)

          const focusBldg = bldgsWithOcc[0]
          if (!focusBldg) return <div style={{ fontSize: 11, color: '#8f8e87' }}>No buildings placed in service yet.</div>

          return (
            <div>
              <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: S.radius, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#27500A', marginBottom: 2 }}>
                  Priority: Building {focusBldg.building} ({focusBldg.bin})
                </div>
                <div style={{ fontSize: 11, color: '#3B6D11' }}>
                  {focusBldg.estOcc}/{focusBldg.total_units} units occupied · {focusBldg.needed} units to fill · ~{focusBldg.monthsToFill} months at current pace · {fm(focusBldg.credits)}/yr when full
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
                {bldgsWithOcc.slice(0, 6).map((b, i) => {
                  const pct = Math.round(b.estOcc / b.total_units * 100)
                  const color = pct >= 90 ? '#27500A' : pct >= 50 ? '#633806' : '#a32d2d'
                  const bg = pct >= 90 ? '#EAF3DE' : pct >= 50 ? '#FAEEDA' : '#FCEBEB'
                  return (
                    <div key={b.id} style={{ background: bg, border: `0.5px solid ${pct >= 90 ? '#C0DD97' : pct >= 50 ? '#FAC775' : '#F09595'}`, borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 2 }}>Building {b.building}{i === 0 ? ' ← Focus' : ''}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color }}>{pct}%</div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '4px 0' }}>
                        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color }}>{b.estOcc}/{b.total_units} · {b.needed} to fill</div>
                      <div style={{ fontSize: 9, color, marginTop: 2 }}>{fm(b.credits)}/yr at full occ</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Risk summary */}
          {[
            miss2025 > 0 && { sev: 'red', title: `${miss2025} building(s) may have missed 2025 bonus depreciation deadline`, body: 'Dec 31, 2025 has passed. If 2 buildings were not placed in service, AHF will calculate a Downward Bonus Depreciation Adjustor reducing the 4th Capital Contribution ($600K). Get your accountants to estimate the exposure now.' },
            miss2026 > 0 && { sev: 'red', title: `${miss2026} building(s) still need PIS by Dec 31, 2026`, body: 'Missing this date triggers the Repurchase Put — AHF can require SLP to buy back all contributed capital at Prime+2% or 10% interest. Non-negotiable deadline.' },
            actual2026 < FY2026_THRESHOLD && { sev: 'amber', title: `FY2026 credit delivery shortfall — estimated ${fm(actual2026)} vs ${fm(FY2026_THRESHOLD)} required`, body: `Late Delivery Adjustment: ${fm(lateDelivery2026)} (shortfall × $0.60). This reduces capital contributions. Update lease pace and PIS dates below to refine this estimate.` },
            actual2027 < FY2027_THRESHOLD && { sev: 'amber', title: `FY2027 credit delivery may also miss threshold`, body: `Estimated ${fm(actual2027)} vs ${fm(FY2027_THRESHOLD)} required. Late Delivery Adjustment: ${fm(lateDelivery2027)}.` },
          ].filter(Boolean).map((r, i) => (
            <div key={i} style={{
              background: r.sev === 'red' ? '#FCEBEB' : '#FAEEDA',
              border: `0.5px solid ${r.sev === 'red' ? '#F09595' : '#FAC775'}`,
              borderRadius: S.radius, padding: '10px 14px', marginBottom: 8
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: r.sev === 'red' ? '#791F1F' : '#633806', marginBottom: 3 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: r.sev === 'red' ? '#a32d2d' : '#854F0B', lineHeight: 1.4 }}>{r.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* BIN TRACKER */}
      {section === 'bins' && (
        <div>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 12 }}>
            Track each building's CO and placed-in-service dates against LPA bonus depreciation requirements. Click Edit to update dates as COs are received.
          </div>

          {/* LPA requirement summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: '2 bldgs by Dec 31, 2025', sub: '40% bonus depreciation', count: pis2025.length, req: 2, sev: pis2025.length >= 2 ? 'green' : 'red' },
              { label: '8 bldgs by Dec 31, 2026', sub: '20% bonus depreciation', count: pis2026.length, req: 8, sev: pis2026.length >= 8 ? 'green' : 'amber' },
              { label: 'All 10 by Dec 31, 2026', sub: 'Repurchase Put trigger', count: allPIS2026, req: 10, sev: allPIS2026 >= 10 ? 'green' : 'red' },
            ].map(r => {
              const bg = r.sev === 'green' ? '#EAF3DE' : r.sev === 'amber' ? '#FAEEDA' : '#FCEBEB'
              const color = r.sev === 'green' ? '#27500A' : r.sev === 'amber' ? '#633806' : '#791F1F'
              return (
                <div key={r.label} style={{ background: bg, border: `0.5px solid ${r.sev === 'green' ? '#C0DD97' : r.sev === 'amber' ? '#FAC775' : '#F09595'}`, borderRadius: S.radius, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color, fontWeight: 500, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color }}>{r.count}/{r.req}</div>
                  <div style={{ fontSize: 10, color }}>{r.sub}</div>
                </div>
              )
            })}
          </div>

          {/* Building table */}
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 80px 100px 100px 80px 80px 60px', background: '#eceae3', borderBottom: S.border }}>
              {['Building', 'BIN', 'Units', 'CO date', 'PIS date', 'Bonus yr', 'Status', ''].map(h => (
                <div key={h} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 500, color: '#6b6a63' }}>{h}</div>
              ))}
            </div>
            {buildings.map(b => {
              const sc = STATUS_COLOR[b.status] || STATUS_COLOR['Not started']
              const lpaReq = b.bonus_depr_year === 2025 ? 'Dec 31, 2025' : 'Dec 31, 2026'
              const pisOk = b.pis_date && new Date(b.pis_date) <= new Date(b.bonus_depr_year === 2025 ? '2025-12-31' : '2026-12-31')
              const isEditing = editingBldg === b.id

              return (
                <div key={b.id}>
                  {!isEditing ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 80px 100px 100px 80px 80px 60px', borderBottom: S.border, background: '#fff', alignItems: 'center' }}>
                      <div style={{ padding: '8px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                      <div style={{ padding: '8px 8px', fontSize: 11, color: '#6b6a63', fontFamily: 'monospace' }}>{b.bin}</div>
                      <div style={{ padding: '8px 8px', fontSize: 12, color: '#1a1a18' }}>{b.total_units}</div>
                      <div style={{ padding: '8px 8px', fontSize: 11, color: b.co_date ? '#1a1a18' : '#8f8e87' }}>
                        {b.co_date || '—'}
                        {b.co_date && new Date(b.co_date) <= new Date('2025-12-31') && <div style={{ fontSize: 9, color: '#639922', fontWeight: 600 }}>2025 ✓</div>}
                      </div>
                      <div style={{ padding: '8px 8px', fontSize: 11 }}>
                        {b.pis_date ? (
                          <span style={{ color: pisOk ? '#27500A' : '#a32d2d', fontWeight: 500 }}>
                            {b.pis_date}
                            {pisOk && <div style={{ fontSize: 9, color: '#639922' }}>✓ meets LPA</div>}
                            {!pisOk && <div style={{ fontSize: 9, color: '#a32d2d' }}>⚠ misses LPA</div>}
                          </span>
                        ) : <span style={{ color: '#8f8e87' }}>—</span>}
                      </div>
                      <div style={{ padding: '8px 8px', fontSize: 11, color: b.bonus_depr_year === 2025 ? '#a32d2d' : '#633806', fontWeight: 500 }}>
                        {b.bonus_depr_year}
                        <div style={{ fontSize: 9, color: '#8f8e87' }}>{b.bonus_depr_year === 2025 ? '40%' : '20%'} bonus</div>
                      </div>
                      <div style={{ padding: '8px 6px' }}>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                          {b.status}
                        </span>
                      </div>
                      <div style={{ padding: '8px 6px' }}>
                        <button onClick={() => startEdit(b)} style={{ fontSize: 10, color: '#185FA5', background: 'none', border: '0.5px solid #e5e3db', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}>Edit</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 12px', background: '#f5f4f0', borderBottom: S.border }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 10 }}>Edit Building {b.building}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 10 }}>
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
                        <button onClick={saveEdit} style={{ fontSize: 11, padding: '4px 12px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingBldg(null)} style={{ fontSize: 11, padding: '4px 12px', background: '#eceae3', color: '#6b6a63', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ADJUSTOR CALCULATOR */}
      {section === 'calculator' && (
        <div>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 14 }}>
            Model adjustor exposure. Update PIS dates in the BIN tracker tab and lease-up assumptions below. Numbers auto-update.
          </div>

          {/* Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a18', marginBottom: 10 }}>Lease-up assumptions</div>
              {[
                ['Current occupied units', currentOccupied, setCurrentOccupied],
                ['Monthly absorption (units/mo)', leasePace, setLeasePace],
              ].map(([label, val, setter]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#6b6a63', marginBottom: 3 }}>{label}</div>
                  <input type="number" value={val} onChange={e => setter(parseInt(e.target.value) || 0)}
                    style={{ fontSize: 12, padding: '5px 8px', border: S.border, borderRadius: 6, width: '100%' }} />
                </div>
              ))}
            </div>
            <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a18', marginBottom: 10 }}>LPA thresholds (from §5.1(c))</div>
              {[
                ['Projected annual credits', '$3,809,306'],
                ['FY2026 threshold', '$2,317,826'],
                ['FY2027+ threshold', '$3,808,544'],
                ['Late delivery rate', '$0.60 per credit $'],
                ['Certified credit price', '$0.8275 per credit $'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '0.5px solid #f5f4f0', fontSize: 11 }}>
                  <span style={{ color: '#6b6a63' }}>{label}</span>
                  <span style={{ color: '#1a1a18', fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <SectionLabel mt={0}>Estimated credit delivery and adjustor exposure</SectionLabel>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { label: 'FY2026 estimated actual credits', val: actual2026, threshold: FY2026_THRESHOLD, year: 2026 },
              { label: 'FY2027 estimated actual credits', val: actual2027, threshold: FY2027_THRESHOLD, year: 2027 },
            ].map(row => {
              const shortfall = Math.max(0, row.threshold - row.val)
              const adj = Math.round(shortfall * LATE_DELIVERY_RATE)
              const ok = row.val >= row.threshold
              return (
                <div key={row.year} style={{ padding: '12px 14px', borderBottom: S.border, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{row.label}</div>
                      <div style={{ fontSize: 11, color: '#6b6a63', marginTop: 2 }}>Threshold: {fm(row.threshold)} · Rate: $0.60/credit $</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: ok ? '#27500A' : '#a32d2d' }}>{fm(row.val)}</div>
                      <div style={{ fontSize: 10, color: ok ? '#639922' : '#a32d2d' }}>{ok ? '✓ above threshold' : `${fm(shortfall)} shortfall`}</div>
                    </div>
                  </div>
                  <div style={{ height: 8, background: '#eceae3', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ width: Math.min(100, row.val / row.threshold * 100) + '%', height: '100%', background: ok ? '#639922' : '#E24B4A', borderRadius: 4 }} />
                  </div>
                  {!ok && (
                    <div style={{ background: '#FCEBEB', borderRadius: 6, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#791F1F' }}>Late Delivery Adjustment FY{row.year}: {fm(shortfall)} × $0.60</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#791F1F' }}>{fm(adj)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Adjustor summary */}
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '8px 14px', background: '#eceae3', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Downward adjustor — capital contribution impact</div>
            {[
              ['Late Delivery Adj — FY2026', fm(lateDelivery2026), lateDelivery2026 > 0],
              ['Late Delivery Adj — FY2027', fm(lateDelivery2027), lateDelivery2027 > 0],
              ['Bonus Depreciation Adjustor', 'TBD by AHF', miss2025 > 0 || miss2026 > 0],
              ['Certified Credit Decrease', 'TBD at 8609 issuance', false],
              ['Total estimated Downward Adjustor', fm(totalLateDelivery) + '+', totalLateDelivery > 0],
            ].map(([label, val, warn]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '0.5px solid #f5f4f0', background: '#fff' }}>
                <span style={{ fontSize: 12, color: '#6b6a63' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: warn ? '#a32d2d' : '#27500A' }}>{val}</span>
              </div>
            ))}
            <div style={{ padding: '10px 14px', background: '#FAEEDA', borderTop: '0.5px solid #FAC775' }}>
              <div style={{ fontSize: 11, color: '#633806', lineHeight: 1.4 }}>
                Downward Adjustor reduces 2nd Capital Contribution first ($100K), then 3rd ($3.35M), then 4th ($600K). If excess remains, SLP pays within 75 days.
              </div>
            </div>
          </div>

          {/* Per-building credit contribution */}
          <SectionLabel>Per-building FY2026 credit estimate</SectionLabel>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 100px', background: '#eceae3', borderBottom: S.border }}>
              {['Building', 'Status', 'Units', 'Full yr credits', 'FY2026 est.'].map(h => (
                <div key={h} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 500, color: '#6b6a63' }}>{h}</div>
              ))}
            </div>
            {buildings.map((b, i) => {
              const pisDate = b.pis_date ? new Date(b.pis_date) : null
              const inService2026 = pisDate && pisDate <= new Date('2026-12-31')
              const fullYrCredits = BLDG_CREDITS[i]

              let est2026 = 0
              if (pisDate && pisDate.getFullYear() <= 2026) {
                const yearStart = new Date('2026-01-01'), yearEnd = new Date('2026-12-31')
                const effectiveStart = pisDate > yearStart ? pisDate : yearStart
                const monthsInService = (yearEnd - effectiveStart) / (1000 * 60 * 60 * 24 * 30.5)
                const fractionOfYear = Math.min(1, Math.max(0, monthsInService / 12))
                const monthsFromNow = (yearEnd - TODAY) / (1000 * 60 * 60 * 24 * 30.5)
                const projectedTotal = Math.min(TOTAL_UNITS * 0.95, currentOccupied + leasePace * Math.max(0, monthsFromNow))
                const projectedOccupied = Math.round(projectedTotal * (b.total_units / TOTAL_UNITS))
                const appFraction = Math.min(1, projectedOccupied / b.total_units)
                est2026 = Math.round(fullYrCredits * appFraction * fractionOfYear)
              }

              const sc = STATUS_COLOR[b.status] || STATUS_COLOR['Not started']
              return (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 100px', borderBottom: '0.5px solid #f5f4f0', background: '#fff', alignItems: 'center' }}>
                  <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                  <div style={{ padding: '7px 8px' }}>
                    <span style={{ background: sc.bg, color: sc.color, fontSize: 9, padding: '1px 5px', borderRadius: 100 }}>{b.status}</span>
                    {b.pis_date && <span style={{ fontSize: 10, color: '#8f8e87', marginLeft: 6 }}>PIS {b.pis_date}</span>}
                  </div>
                  <div style={{ padding: '7px 8px', fontSize: 11, color: '#6b6a63' }}>{b.total_units}</div>
                  <div style={{ padding: '7px 8px', fontSize: 11, color: '#6b6a63' }}>{fm(fullYrCredits)}</div>
                  <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 500, color: est2026 > 0 ? '#27500A' : '#a32d2d' }}>
                    {est2026 > 0 ? fm(est2026) : '—'}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 100px', background: '#eceae3', borderTop: S.border }}>
              <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 600, color: '#1a1a18', gridColumn: '1/5', textAlign: 'right' }}>Total FY2026 est.</div>
              <div style={{ padding: '7px 8px', fontSize: 12, fontWeight: 600, color: actual2026 >= FY2026_THRESHOLD ? '#27500A' : '#a32d2d' }}>{fm(actual2026)}</div>
            </div>
          </div>
        </div>
      )}

      {/* DEADLINES */}
      {section === 'deadlines' && (
        <div>
          {[
            { date: '2025-12-31', label: '2 buildings placed in service (40% bonus depr)', sev: pis2025.length >= 2 ? 'green' : 'red', status: pis2025.length >= 2 ? `${pis2025.length} buildings confirmed` : `Only ${pis2025.length} confirmed — exposure TBD`, past: true },
            { date: '2026-07-01', label: 'Draw 5 eligible ($3,438,553) — 90% construction', sev: 'amber', status: 'Submit draw documents if 90% complete', past: false },
            { date: '2026-07-31', label: 'Semi-annual report due to AHF — $250/day penalty', sev: 'amber', status: `${daysUntil(new Date('2026-07-31'))} days remaining`, past: false },
            { date: '2026-12-31', label: 'ALL 10 buildings placed in service — Repurchase Put trigger', sev: allPIS2026 >= 10 ? 'green' : 'red', status: `${allPIS2026}/10 confirmed · ${daysAllPIS} days`, past: false },
            { date: '2026-12-31', label: '8 buildings PIS for 20% bonus depreciation', sev: pis2026.length >= 8 ? 'green' : 'amber', status: `${pis2026.length}/8 confirmed`, past: false },
            { date: '2027-01-15', label: '3rd Capital Contribution ($3,348,772) eligible', sev: 'blue', status: 'Requires stabilization + cost cert + 8609s + Initial Occupancy Date', past: false },
            { date: '2027-01-31', label: 'Initial Occupancy Date required for 3rd CC', sev: 'amber', status: '100% of TC units leased to qualified tenants', past: false },
            { date: '2027-03-01', label: 'Draft audited financials + tax returns due', sev: 'green', status: '60 days after FY2026 year-end · $250/day penalty', past: false },
            { date: '2027-06-01', label: '4th Capital Contribution ($600K less adjustors) eligible', sev: 'blue', status: 'Requires 8609s + first year tax returns', past: false },
            { date: '2027-06-30', label: 'Stabilization deadline — Repurchase Put trigger', sev: daysStab > 180 ? 'amber' : 'red', status: `90% occ + 1.15x DSCR × 3 months + Final Closing · ${daysStab} days`, past: false },
          ].map(d => {
            const days = daysUntil(new Date(d.date))
            const bg = d.sev === 'red' ? '#FCEBEB' : d.sev === 'amber' ? '#FAEEDA' : d.sev === 'green' ? '#EAF3DE' : '#E6F1FB'
            const color = d.sev === 'red' ? '#791F1F' : d.sev === 'amber' ? '#633806' : d.sev === 'green' ? '#27500A' : '#185FA5'
            const border = d.sev === 'red' ? '#F09595' : d.sev === 'amber' ? '#FAC775' : d.sev === 'green' ? '#C0DD97' : '#B5D4F4'
            return (
              <div key={d.date + d.label} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: '#fff', border: `0.5px solid ${border}`, borderRadius: S.radius, marginBottom: 8 }}>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1 }}>
                    {d.past && days < 0 ? 'PAST' : Math.abs(days)}
                  </div>
                  <div style={{ fontSize: 9, color, fontWeight: 500 }}>{d.past && days < 0 ? 'days ago' : 'days'}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 2 }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: '#6b6a63' }}>{d.date} · {d.status}</div>
                </div>
                <div style={{ background: bg, color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
                  {d.sev === 'green' ? 'OK' : d.sev === 'red' ? 'CRITICAL' : d.sev === 'amber' ? 'WATCH' : 'UPCOMING'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
