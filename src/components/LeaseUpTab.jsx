import { useState } from 'react'
import { SectionLabel, Kpi } from './ui'

const S = {
  border: '0.5px solid #e5e3db',
  radius: '8px',
}

const PRIORITY_ORDER = [1, 2, 10, 3, 4, 8, 5, 6, 7, 9]

const BUILDING_DATA = {
  1:  { total: 35, occupied: 14, vacant: 21, firstMovein: '2025-11-14', ratePerMonth: 2.6, daysOpen: 159 },
  2:  { total: 30, occupied: 11, vacant: 19, firstMovein: '2025-11-28', ratePerMonth: 2.3, daysOpen: 145 },
  3:  { total: 30, occupied: 4,  vacant: 26, firstMovein: '2026-02-20', ratePerMonth: 2.0, daysOpen: 61  },
  4:  { total: 39, occupied: 6,  vacant: 33, firstMovein: '2026-03-02', ratePerMonth: 3.5, daysOpen: 51  },
  5:  { total: 36, occupied: 1,  vacant: 35, firstMovein: '2026-03-28', ratePerMonth: 1.2, daysOpen: 25  },
  6:  { total: 36, occupied: 3,  vacant: 33, firstMovein: '2026-04-01', ratePerMonth: 4.3, daysOpen: 21  },
  7:  { total: 36, occupied: 0,  vacant: 36, firstMovein: null,         ratePerMonth: 0,   daysOpen: 0   },
  8:  { total: 36, occupied: 8,  vacant: 28, firstMovein: '2026-01-02', ratePerMonth: 2.2, daysOpen: 110 },
  9:  { total: 30, occupied: 0,  vacant: 30, firstMovein: null,         ratePerMonth: 0,   daysOpen: 0   },
  10: { total: 54, occupied: 16, vacant: 38, firstMovein: '2025-12-19', ratePerMonth: 3.9, daysOpen: 124 },
}

const BIN_MAP = {
  1: 'TX 24-40001', 2: 'TX 24-40002', 3: 'TX 24-40003', 4: 'TX 24-40004',
  5: 'TX 24-40005', 6: 'TX 24-40006', 7: 'TX 24-40007', 8: 'TX 24-40008',
  9: 'TX 24-40009', 10: 'TX 24-40010',
}

function addMonths(months) {
  const d = new Date('2026-04-22')
  d.setDate(d.getDate() + Math.round(months * 30.5))
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function projectedFull(bldg) {
  const d = BUILDING_DATA[bldg]
  if (!d.firstMovein || d.ratePerMonth === 0) return null
  return addMonths(d.vacant / d.ratePerMonth)
}

function riskLevel(bldg) {
  const d = BUILDING_DATA[bldg]
  const occ = d.total ? d.occupied / d.total : 0
  if (occ >= 0.9) return { dot: '#639922', bg: '#EAF3DE', label: 'On track' }
  if (d.ratePerMonth >= 3) return { dot: '#378ADD', bg: '#E6F1FB', label: 'Good pace' }
  if (d.ratePerMonth >= 1.5) return { dot: '#BA7517', bg: '#FAEEDA', label: 'Slow pace' }
  if (d.ratePerMonth > 0) return { dot: '#E24B4A', bg: '#FCEBEB', label: 'At risk' }
  return { dot: '#8f8e87', bg: '#f5f4f0', label: 'Not open' }
}

const STAB_TARGET = 326
const CURRENT_OCC = 63
const MONTHLY_RATE = 22
const MONTHS_TO_DEADLINE = 14
const MONTHS_TO_STAB = Math.ceil((STAB_TARGET - CURRENT_OCC) / MONTHLY_RATE)
const NEEDED_PER_MONTH = Math.ceil((STAB_TARGET - CURRENT_OCC) / MONTHS_TO_DEADLINE)
const ON_TRACK = MONTHS_TO_STAB <= MONTHS_TO_DEADLINE

export function LeaseUpTab() {
  const [view, setView] = useState('priority')

  const byPriority = PRIORITY_ORDER.map(b => ({ bldg: b, ...BUILDING_DATA[b] }))
  const byVacancy = [...byPriority].sort((a, b) => b.vacant - a.vacant)
  const displayed = view === 'priority' ? byPriority : byVacancy

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 14 }}>
        <Kpi label="Current occupancy" value={`${((CURRENT_OCC/363)*100).toFixed(1)}%`} sub={`${CURRENT_OCC} / 363 units`} warn />
        <Kpi label="Still needed" value={STAB_TARGET - CURRENT_OCC} sub={`to reach ${STAB_TARGET} (90%)`} warn />
        <Kpi label="Current pace" value={`${MONTHLY_RATE}/mo`} sub="last 30 days" />
        <Kpi label="Required pace" value={`${NEEDED_PER_MONTH}/mo`} sub="to hit Jun 2027" warn={MONTHLY_RATE < NEEDED_PER_MONTH} />
        <Kpi label="Proj. stabilization" value={addMonths(MONTHS_TO_STAB)} sub={ON_TRACK ? "on track" : "2 months tight"} warn={!ON_TRACK} />
        <Kpi label="Deadline" value="Jun 30, 2027" sub="repurchase put risk" warn />
      </div>

      {/* Pace bar */}
      <div style={{ background: ON_TRACK ? '#EAF3DE' : '#FCEBEB', border: `0.5px solid ${ON_TRACK ? '#C0DD97' : '#F09595'}`, borderRadius: S.radius, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: ON_TRACK ? '#27500A' : '#791F1F' }}>
            {ON_TRACK ? 'Stabilization pace — on track' : '⚠ Need to accelerate — currently {MONTHLY_RATE} units/mo, need {NEEDED_PER_MONTH}'}
          </span>
          <span style={{ fontSize: 11, color: '#6b6a63' }}>{CURRENT_OCC} / {STAB_TARGET} ({((CURRENT_OCC/STAB_TARGET)*100).toFixed(0)}%)</span>
        </div>
        <div style={{ height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((CURRENT_OCC/STAB_TARGET)*100,100)}%`, height: '100%', background: ON_TRACK ? '#639922' : '#E24B4A', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#6b6a63' }}>At {MONTHLY_RATE}/mo → {addMonths(MONTHS_TO_STAB)}</span>
          <span style={{ fontSize: 10, color: '#6b6a63' }}>Need {NEEDED_PER_MONTH}/mo for Jun 2027 — add {NEEDED_PER_MONTH - MONTHLY_RATE} more units/month</span>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: S.border, borderRadius: S.radius, overflow: 'hidden', width: 'fit-content' }}>
        {[['priority', 'Priority order'], ['vacancy', 'Most vacant first']].map(([id, label]) => (
          <div key={id} onClick={() => setView(id)} style={{
            padding: '5px 14px', fontSize: 12, cursor: 'pointer',
            borderRight: id === 'priority' ? S.border : 'none',
            background: view === id ? '#eceae3' : '#fff',
            color: view === id ? '#1a1a18' : '#6b6a63',
            fontWeight: view === id ? 500 : 400,
          }}>{label}</div>
        ))}
      </div>

      {/* Building cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {displayed.map(({ bldg, total, occupied, vacant, firstMovein, ratePerMonth, daysOpen }) => {
          const occPct = total ? Math.round((occupied / total) * 100) : 0
          const risk = riskLevel(bldg)
          const proj = projectedFull(bldg)
          const priority = PRIORITY_ORDER.indexOf(bldg) + 1
          const needsAction = ratePerMonth > 0 && ratePerMonth < 2
          const notOpen = ratePerMonth === 0 && !firstMovein
          const avgDaysVacant = firstMovein && vacant > 0 ? daysOpen : 0

          return (
            <div key={bldg} style={{ background: '#fff', border: needsAction ? '0.5px solid #F09595' : S.border, borderRadius: S.radius, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: priority <= 3 ? '#1a1a18' : '#eceae3',
                  color: priority <= 3 ? '#fff' : '#6b6a63',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                }}>{priority}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>Building {bldg}</span>
                    <span style={{ fontSize: 10, color: '#8f8e87', fontFamily: 'monospace' }}>{BIN_MAP[bldg]}</span>
                    <span style={{ background: risk.bg, color: risk.dot, padding: '2px 7px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>{risk.label}</span>
                    {needsAction && <span style={{ background: '#FCEBEB', color: '#a32d2d', padding: '2px 7px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>⚠ Needs focus</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, height: 6, background: '#e5e3db', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${occPct}%`, height: '100%', borderRadius: 3, background: occPct >= 90 ? '#639922' : occPct >= 50 ? '#378ADD' : occPct >= 20 ? '#BA7517' : '#E24B4A' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#1a1a18', width: 32, textAlign: 'right' }}>{occPct}%</span>
                  </div>

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#6b6a63' }}><strong style={{ color: '#1a1a18' }}>{vacant}</strong> vacant / {total} total</span>
                    {avgDaysVacant > 0 && <span style={{ fontSize: 11, color: avgDaysVacant > 120 ? '#a32d2d' : '#6b6a63' }}>~<strong style={{ color: avgDaysVacant > 120 ? '#a32d2d' : '#1a1a18' }}>{avgDaysVacant}d</strong> avg vacant</span>}
                    {ratePerMonth > 0 && <span style={{ fontSize: 11, color: '#6b6a63' }}><strong style={{ color: '#1a1a18' }}>{ratePerMonth.toFixed(1)}</strong>/mo</span>}
                    {proj && <span style={{ fontSize: 11, color: ratePerMonth < 2 ? '#a32d2d' : '#6b6a63' }}>Full: <strong style={{ color: ratePerMonth < 2 ? '#a32d2d' : '#1a1a18' }}>{proj}</strong></span>}
                    {notOpen && <span style={{ fontSize: 11, color: '#8f8e87' }}>No leases yet — confirm CO & activate leasing</span>}
                  </div>

                  {needsAction && (
                    <div style={{ marginTop: 6, padding: '4px 8px', background: '#FCEBEB', borderRadius: 6, fontSize: 11, color: '#791F1F' }}>
                      Only {ratePerMonth.toFixed(1)} units/month — prioritize marketing, walk traffic, and application processing for Building {bldg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      </div>
  )
}
