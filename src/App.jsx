import { useState, useEffect } from 'react'
import { getProjects, upsertProject, deleteProject, upsertDrawData, upsertLeasing, subscribeToProjects } from './lib/supabase'
import { fm, pct, clr, STAGE_STYLE, daysUntil } from './lib/helpers'
import { Bar, Kpi, SectionLabel, TabBar, Card, Btn } from './components/ui'
import { DocsTab } from './components/DocsTab'
import { BinsTab } from './components/BinsTab'
import { LeaseUpTab } from './components/LeaseUpTab'
import { SiteMapTab } from './components/SiteMapTab'
import { EmailQueue } from './components/EmailQueue'
import { CapitalTab } from './components/CapitalTab'
import { PerformanceTab } from './components/PerformanceTab'

// ── Project logos ────────────────────────────────────────────────────
const PROJECT_LOGOS = {
  'Centerpoint Depot': 'data:image/png;base64,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',
}

// ── Helpers ──────────────────────────────────────────────────────────
function barColor(v, type) {
  if (type === 'c') return v === 100 ? '#639922' : v >= 60 ? '#378ADD' : '#BA7517'
  if (type === 'l') return v >= 90 ? '#639922' : v >= 60 ? '#378ADD' : v >= 30 ? '#BA7517' : '#E24B4A'
  return v <= 75 ? '#378ADD' : v <= 95 ? '#BA7517' : '#E24B4A'
}

const S = {
  border: '0.5px solid #e5e3db',
  borderMed: '0.5px solid #c8c6bc',
  radius: '8px',
  radiusLg: '12px',
}

// ── Capital sufficiency ───────────────────────────────────────────
function CapitalSufficiency({ d, leasing }) {
  const [monthlyDeficit, setMonthlyDeficit] = useState(23834)
  const [monthsToStab, setMonthsToStab] = useState(12)

  // Sources
  const constructionRemaining = d?.construction_remaining || 0
  const coContingency = d?.co_contingency_remaining || 0
  const wcRemaining = d?.working_capital_remaining || 0
  const opReserve = leasing?.cash_op_reserve || 0
  const softCost = leasing?.cash_soft_cost || 0
  const equityRemaining = (d?.equity_schedule || []).filter(e => e.status !== 'funded').reduce((a,e) => a+e.amount, 0)
  const odgCap = 2695000

  // Construction sufficiency — HUD 221(d)(4): construction paid from HUD draws not escrows
  // CO contingency is for change orders only, not base construction
  const hudRemaining = 4815030
  const softCostsRemaining = 1576510
  const interestRemaining = 287384
  const totalConstructionUses = constructionRemaining + softCostsRemaining + interestRemaining
  const constructionBuffer = hudRemaining - totalConstructionUses
  const constructionOk = constructionBuffer >= 0

  // Lease-up deficit projection — linear from current deficit to break-even at stabilization
  const stabNoi = 22749
  let totalDeficit = 0
  const monthlyProjection = []
  for (let m = 1; m <= monthsToStab; m++) {
    const progress = m / monthsToStab
    const noi = -monthlyDeficit + (monthlyDeficit + stabNoi) * progress
    if (noi < 0) totalDeficit += Math.abs(noi)
    monthlyProjection.push({ month: m, noi: Math.round(noi) })
  }

  const liquidAvailable = wcRemaining + opReserve + softCost
  const totalAvailable = liquidAvailable + odgCap
  const leaseupSurplus = liquidAvailable - totalDeficit
  const leaseupOk = leaseupSurplus >= 0

  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel mt={0}>Capital sufficiency analysis</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Construction */}
        <div style={{ padding: '12px 14px', borderRadius: S.radius, background: constructionOk ? '#EAF3DE' : '#FCEBEB', border: `0.5px solid ${constructionOk ? '#C0DD97' : '#F09595'}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginBottom: 10 }}>
            {constructionOk ? '✓' : '⚠'} Construction — {constructionOk ? 'HUD draws sufficient' : 'Monitor closely'}
          </div>
          {[
            ['HUD loan draws remaining', hudRemaining, false],
            ['Construction remaining (NRP)', constructionRemaining, true],
            ['Soft costs remaining', softCostsRemaining, true],
            ['Interest reserve remaining', interestRemaining, true],
            ['Total uses remaining', totalConstructionUses, true],
            ['HUD buffer', constructionBuffer, false],
          ].map(([label, val, isUse]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: label === 'HUD buffer' ? '#1a1a18' : '#6b6a63', fontWeight: label === 'HUD buffer' || label === 'HUD loan draws remaining' ? 500 : 400 }}>{label}</span>
              <span style={{ fontWeight: 500, color: val < 0 ? '#a32d2d' : '#1a1a18' }}>{isUse ? `(${fm(val)})` : fm(val)}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: constructionOk ? '#27500A' : '#791F1F', marginTop: 6, lineHeight: 1.4 }}>
            {constructionOk
              ? `HUD draws cover all remaining construction, soft costs, and interest with ${fm(constructionBuffer)} to spare. CO contingency ($${(coContingency/1000).toFixed(0)}K) is separate and reserved for change orders only.`
              : `HUD draws may fall short. Review draw schedule immediately.`}
          </div>
        </div>

        {/* Lease-up */}
        <div style={{ padding: '12px 14px', borderRadius: S.radius, background: leaseupOk ? '#EAF3DE' : '#FCEBEB', border: `0.5px solid ${leaseupOk ? '#C0DD97' : '#F09595'}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginBottom: 8 }}>
            {leaseupOk ? '✓' : '⚠'} Lease-up through stabilization — {leaseupOk ? 'Sufficient' : 'Monitor closely'}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: '#6b6a63', display: 'block', marginBottom: 2 }}>Monthly deficit ($)</label>
              <input type="number" value={monthlyDeficit} onChange={e => setMonthlyDeficit(parseInt(e.target.value)||0)}
                style={{ width: '100%', fontSize: 12, padding: '4px 7px', border: S.border, borderRadius: 6 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: '#6b6a63', display: 'block', marginBottom: 2 }}>Months to stabilization</label>
              <input type="number" value={monthsToStab} onChange={e => setMonthsToStab(parseInt(e.target.value)||1)}
                style={{ width: '100%', fontSize: 12, padding: '4px 7px', border: S.border, borderRadius: 6 }} />
            </div>
          </div>
          {[
            ['Projected total deficit', -totalDeficit, true],
            ['Working capital', wcRemaining, false],
            ['Operating reserve', opReserve, false],
            ['Soft cost contingency', softCost, false],
            ['Total liquid available', liquidAvailable, false],
            ['Surplus / (Gap)', leaseupSurplus, false],
          ].map(([label, val, isUse]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: '#6b6a63', fontWeight: label.includes('Total') || label.includes('Surplus') ? 500 : 400 }}>{label}</span>
              <span style={{ fontWeight: 500, color: val < 0 ? '#a32d2d' : '#1a1a18' }}>{isUse ? `(${fm(Math.abs(val))})` : fm(val)}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#6b6a63', marginTop: 6, lineHeight: 1.4 }}>
            ODG cap {fm(odgCap)} available as backstop if reserves are exhausted. Equity remaining: {fm(equityRemaining)}.
          </div>
        </div>
      </div>

      {/* Monthly NOI projection */}
      <SectionLabel>Monthly NOI projection to stabilization</SectionLabel>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80, marginBottom: 4 }}>
        {monthlyProjection.map((m, i) => {
          const maxAbs = Math.max(...monthlyProjection.map(x => Math.abs(x.noi)))
          const h = Math.max(4, Math.round((Math.abs(m.noi) / maxAbs) * 70))
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ fontSize: 8, color: m.noi < 0 ? '#a32d2d' : '#27500A', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {m.noi < 0 ? `(${fm(Math.abs(m.noi))})` : fm(m.noi)}
              </div>
              <div style={{ width: '80%', height: h, background: m.noi < 0 ? '#E24B4A' : '#639922', borderRadius: 2 }} />
              <div style={{ fontSize: 8, color: '#8f8e87' }}>{(() => { const d = new Date('2026-03-02'); d.setMonth(d.getMonth() + m.month); return d.toLocaleDateString('en-US', {month:'short', year:'2-digit'}) })()}</div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 10, color: '#8f8e87', textAlign: 'center' }}>Red = operating deficit · Green = positive NOI · Adjust inputs above to model different scenarios</div>
    </div>
  )
}

// ── Draw tab ──────────────────────────────────────────────────────────
function DrawTab({ d }) {
  if (!d) return <div style={{ fontSize: 13, color: '#8f8e87', padding: '1rem 0' }}>No draw data loaded.</div>
  const spentPct = pct(d.total_spent, d.total_budget)
  const totalCO = (d.change_orders || []).reduce((a, c) => a + (c.amount || 0), 0)
  const wcUsed = d.working_capital_start - d.working_capital_remaining
  const coUsed = d.co_contingency_start - d.co_contingency_remaining

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* LEFT COLUMN */}
      <div>
        {/* Top KPIs - 3 across */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          <Kpi label="Total budget" value={fm(d.total_budget)} />
          <Kpi label="Total spent" value={fm(d.total_spent)} sub={`${spentPct}% of budget`} />
          <Kpi label="Remaining" value={fm(d.total_budget - d.total_spent)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          <Kpi label="Draw #" value={`#${d.last_draw_num}`} sub={`of ~24 draws`} />
          <Kpi label="Construction remaining" value={fm(d.construction_remaining)} />
          <Kpi label="Total change orders" value={fm(totalCO)} sub={`${(d.change_orders||[]).length} COs`} />
        </div>

        <SectionLabel mt={0}>Budget vs spent</SectionLabel>
        {[
          ['Total project', d.total_spent, d.total_budget],
          ['Construction (NRP)', d.construction_spent, d.construction_budget],
          ['Working capital escrow', wcUsed, d.working_capital_start],
          ['CO contingency escrow', coUsed, d.co_contingency_start],
        ].map(([label, spent, budget]) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b6a63', marginBottom: 3 }}>
              <span>{label}</span>
              <span style={{ fontWeight: 500, color: '#1a1a18' }}>{fm(spent)} / {fm(budget)} <span style={{ color: '#8f8e87', fontWeight: 400 }}>({pct(spent, budget)}%)</span></span>
            </div>
            <Bar value={spent} max={budget} color={barColor(pct(spent, budget), 'b')} height={8} />
          </div>
        ))}

        <SectionLabel>Contingency balances</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 0 }}>
          {[
            ['Working capital remaining', d.working_capital_remaining, d.working_capital_start],
            ['CO contingency remaining', d.co_contingency_remaining, d.co_contingency_start],
          ].map(([label, val, start]) => (
            <div key={label} style={{ padding: '10px 12px', background: '#eceae3', borderRadius: S.radius }}>
              <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: val < start * 0.2 ? '#a32d2d' : '#1a1a18' }}>{fm(val)}</div>
              <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 2 }}>of {fm(start)} · {pct(start-val, start)}% used</div>
              <div style={{ marginTop: 6, height: 5, background: '#c8c6bc', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct(start-val, start)}%`, height: '100%', background: val < start*0.2 ? '#E24B4A' : '#378ADD', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div>
        <SectionLabel mt={0}>Equity pay-in schedule</SectionLabel>
        <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#eceae3' }}>
              {['Tranche', 'Scheduled', 'Status', 'Remaining', 'Date / conditions'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(d.equity_schedule || []).map((eq, i) => {
                const remaining = eq.status === 'funded' ? 0 : eq.amount
                return (
                  <tr key={i} style={{ borderBottom: i < d.equity_schedule.length-1 ? S.border : 'none', background: eq.status === 'funded' ? '#f5faf0' : '#fff' }}>
                    <td style={{ padding: '7px 10px', color: '#1a1a18', fontWeight: 500 }}>{eq.label}</td>
                    <td style={{ padding: '7px 10px', color: '#1a1a18' }}>{fm(eq.amount)}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ background: eq.status === 'funded' ? '#EAF3DE' : '#FAEEDA', color: eq.status === 'funded' ? '#27500A' : '#633806', padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>
                        {eq.status === 'funded' ? 'Funded' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', fontWeight: 500, color: remaining > 0 ? '#633806' : '#8f8e87' }}>
                      {remaining > 0 ? fm(remaining) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#6b6a63', fontSize: 11 }}>{eq.date}</td>
                  </tr>
                )
              })}
              <tr style={{ background: '#eceae3', borderTop: S.border }}>
                <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>Total equity</td>
                <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>{fm((d.equity_schedule||[]).reduce((a,e) => a+e.amount,0))}</td>
                <td style={{ padding: '7px 10px', fontSize: 11, color: '#6b6a63' }}>{(d.equity_schedule||[]).filter(e=>e.status==='funded').length} of {(d.equity_schedule||[]).length} funded</td>
                <td style={{ padding: '7px 10px', fontWeight: 500, color: '#633806' }}>{fm((d.equity_schedule||[]).filter(e=>e.status!=='funded').reduce((a,e)=>a+e.amount,0))}</td>
                <td style={{ padding: '7px 10px', fontSize: 11, color: '#8f8e87' }}>remaining to fund</td>
              </tr>
            </tbody>
          </table>
        </div>


        <CapitalSufficiency d={d} leasing={null} />

        {(d.change_orders || []).length > 0 && <>
          <SectionLabel>Change orders — {fm(totalCO)} total across {d.change_orders.length} COs</SectionLabel>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#eceae3' }}>
                {['CO #', 'Description', 'Amount', 'Date'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{(d.change_orders || []).map((co, i) => (
                <tr key={i} style={{ borderBottom: i < d.change_orders.length-1 ? S.border : 'none' }}>
                  <td style={{ padding: '6px 10px', color: '#6b6a63' }}>CO #{co.num}</td>
                  <td style={{ padding: '6px 10px', color: '#1a1a18' }}>{co.desc || '—'}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1a1a18' }}>{fm(co.amount)}</td>
                  <td style={{ padding: '6px 10px', color: '#6b6a63' }}>{co.date}</td>
                </tr>
              ))}
              <tr style={{ background: '#eceae3', borderTop: S.border }}>
                <td colSpan={2} style={{ padding: '6px 10px', fontWeight: 500, color: '#1a1a18' }}>Total CO spend</td>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1a1a18' }}>{fm(totalCO)}</td>
                <td style={{ padding: '6px 10px', fontSize: 11, color: '#6b6a63' }}>of {fm(d.co_contingency_start)} contingency</td>
              </tr>
              </tbody>
            </table>
          </div>
        </>}
      </div>
    </div>
  )
}

// ── Leasing tab ───────────────────────────────────────────────────────
function LeasingTab({ l }) {
  if (!l) return <div style={{ fontSize: 13, color: '#8f8e87', padding: '1rem 0' }}>No leasing data loaded.</div>
  const econOcc = l.gpr ? Math.round(((l.gpr - l.vacancy_loss) / l.gpr) * 100) : 0

  return (
    <div>
      {l.report_month && <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 12 }}>Period: {l.report_month}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 14 }}>
        <Kpi label="Physical occupancy" value={`${l.physical_occupancy}%`} sub={`${l.occupied} / ${l.total_units} units`} warn={l.physical_occupancy < 80} />
        <Kpi label="Economic occupancy" value={`${econOcc}%`} warn={econOcc < 80} />
        <Kpi label="GPR" value={fm(l.gpr)} />
        <Kpi label="Net rental income" value={fm(l.net_rental_income)} />
        <Kpi label="NOI (month)" value={fm(l.noi)} sub={`budget: ${fm(l.noi_budget)}`} warn={l.noi < l.noi_budget} />
        <Kpi label="YTD NOI" value={fm(l.ytd_noi)} sub={`budget: ${fm(l.ytd_noi_budget)}`} warn={l.ytd_noi < l.ytd_noi_budget} />
      </div>

      <SectionLabel mt={0}>Occupancy breakdown</SectionLabel>
      {[['Occupied', l.occupied, l.total_units, '#639922'], ['Vacant rented ready', l.vacant_rented_ready, l.total_units, '#378ADD'], ['Vacant unrented', l.vacant_unrented, l.total_units, '#E24B4A']].map(([label, val, tot, color]) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b6a63', marginBottom: 3 }}>
            <span>{label}</span><span style={{ fontWeight: 500, color: '#1a1a18' }}>{val} units ({pct(val, tot)}%)</span>
          </div>
          <Bar value={val} max={tot} color={color} height={7} />
        </div>
      ))}

      <SectionLabel>AMI tier absorption</SectionLabel>
      {[['30% AMI', l.ami30_occ, l.ami30_total], ['60% AMI', l.ami60_occ, l.ami60_total]].filter(([, , t]) => t > 0).map(([label, occ, total]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#6b6a63', width: 90 }}>{label}</span>
          <Bar value={occ} max={total} color={occ === total ? '#639922' : occ / total > 0.6 ? '#378ADD' : '#BA7517'} height={7} />
          <span style={{ fontSize: 12, fontWeight: 500, width: 60, textAlign: 'right' }}>{occ}/{total}</span>
        </div>
      ))}

      {(l.unit_mix_detail || []).length > 0 && <>
        <SectionLabel>Unit mix absorption</SectionLabel>
        <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead><tr style={{ background: '#eceae3' }}>
              {['Type', 'Occ / Total', '%', 'Market rent'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{(l.unit_mix_detail || []).map((u, i) => {
              const op = Math.round((u.occ / u.total) * 100)
              const tc = op >= 90 ? { bg: '#EAF3DE', cl: '#27500A' } : op >= 50 ? { bg: '#E6F1FB', cl: '#0C447C' } : op >= 20 ? { bg: '#FAEEDA', cl: '#633806' } : { bg: '#FCEBEB', cl: '#791F1F' }
              return <tr key={i} style={{ borderBottom: S.border }}>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1a1a18' }}>{u.label}</td>
                <td style={{ padding: '6px 10px', color: '#6b6a63' }}>{u.occ} / {u.total}</td>
                <td style={{ padding: '6px 10px' }}><span style={{ background: tc.bg, color: tc.cl, padding: '2px 7px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>{op}%</span></td>
                <td style={{ padding: '6px 10px', color: '#6b6a63' }}>${u.rent?.toLocaleString()}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
      </>}

      {(l.delinquency || []).length > 0 && <>
        <SectionLabel>Delinquency ({l.delinquency.length} units)</SectionLabel>
        <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead><tr style={{ background: '#eceae3' }}>
              {['Unit', 'Resident', 'Balance'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>)}
            </tr></thead>
            <tbody>{l.delinquency.map((d, i) => (
              <tr key={i} style={{ borderBottom: S.border }}>
                <td style={{ padding: '6px 10px', color: '#6b6a63' }}>{d.unit}</td>
                <td style={{ padding: '6px 10px', color: '#1a1a18' }}>{d.name}</td>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: d.balance > 500 ? '#a32d2d' : '#1a1a18' }}>${d.balance?.toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}

      <SectionLabel>Cash & reserves</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 }}>
        <Kpi label="Operating cash" value={fm(l.cash_operating)} />
        {l.cash_reserves > 0 && <Kpi label="Replacement reserve" value={fm(l.cash_reserves)} />}
        {l.cash_op_reserve > 0 && <Kpi label="Operating reserve" value={fm(l.cash_op_reserve)} />}
        {l.cash_soft_cost > 0 && <Kpi label="Soft cost contingency" value={fm(l.cash_soft_cost)} />}
      </div>
    </div>
  )
}

// ── LPA tab ───────────────────────────────────────────────────────────
function LpaTab({ lpa }) {
  if (!lpa) return <div style={{ fontSize: 13, color: '#8f8e87', padding: '1rem 0' }}>No LPA data loaded.</div>
  const [subTab, setSubTab] = useState('overview')

  const funded = (lpa.capital_contributions || []).filter(c => c.status === 'funded')
  const totalFunded = funded.reduce((a, c) => a + (c.amount || 0), 0)
  const totalEquity = lpa.total_equity || 0
  const pendingEquity = totalEquity - totalFunded
  const devFeeRemaining = lpa.dev_fee_deferred || 0
  const odgCap = lpa.odg_cap || 2695000
  const odgUsed = 0 // update as ODG draws are made

  const SUB = [
    { id: 'overview',    label: 'Overview' },
    { id: 'equity',      label: 'Equity & adjustors' },
    { id: 'guarantees',  label: 'Guarantees' },
    { id: 'dates',       label: 'Key dates' },
    { id: 'reporting',   label: 'Reporting' },
    { id: 'waterfall',   label: 'Waterfall & conversion' },
  ]

  const sevcl = { critical: '#a32d2d', high: '#633806' }
  const sevbg = { critical: '#FCEBEB', high: '#FAEEDA' }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 10 }}>{lpa.entity} · Investor LP: {lpa.investor_lp}</div>

      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: S.border, borderRadius: S.radius, overflow: 'hidden', width: 'fit-content', flexWrap: 'wrap' }}>
        {SUB.map((t, i) => (
          <div key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '5px 14px', fontSize: 12, cursor: 'pointer',
            borderRight: i < SUB.length - 1 ? S.border : 'none',
            background: subTab === t.id ? '#eceae3' : '#fff',
            color: subTab === t.id ? '#1a1a18' : '#6b6a63',
            fontWeight: subTab === t.id ? 500 : 400,
          }}>{t.label}</div>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {subTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionLabel mt={0}>Deal summary</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <Kpi label="Total equity" value={fm(totalEquity)} sub={`@ $${lpa.credit_price}/credit`} />
              <Kpi label="Funded to date" value={fm(totalFunded)} sub={`${Math.round(totalFunded/totalEquity*100)}% of total`} />
              <Kpi label="Pending equity" value={fm(pendingEquity)} warn />
              <Kpi label="Projected credits" value={fm(lpa.projected_credits)} sub="at $0.8275/credit" />
              <Kpi label="Dev fee total" value={fm(lpa.dev_fee_total)} sub={`$${(lpa.dev_fee_paid/1e6).toFixed(1)}M paid`} />
              <Kpi label="Dev fee deferred" value={fm(devFeeRemaining)} sub="due by Dec 31 2039" warn />
              <Kpi label="NCF % to GP/SLP" value={`${lpa.ncf_pct}%`} sub="drops if LP loans > $50K" />
              <Kpi label="ODG cap" value={fm(odgCap)} sub="Operating deficit guaranty" />
            </div>

            <SectionLabel>Parties</SectionLabel>
            {[
              ['Partnership', lpa.entity],
              ['General Partner', lpa.gp],
              ['Special LP (SLP)', lpa.slp],
              ['Investor LP', lpa.investor_lp],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '0.5px solid #f0ede6', fontSize: 12 }}>
                <span style={{ color: '#6b6a63', width: 130, flexShrink: 0 }}>{label}</span>
                <span style={{ fontWeight: 500, color: '#1a1a18' }}>{val}</span>
              </div>
            ))}
          </div>

          <div>
            <SectionLabel mt={0}>Critical risk flags</SectionLabel>
            {[
              { label: 'Stabilization deadline', date: 'Jun 30, 2027', risk: 'Repurchase put activates — SLP buys back AHF interest at all capital contributed + Prime+2% or 10% interest', severity: 'critical' },
              { label: 'All buildings in service', date: 'Dec 31, 2026', risk: 'Required for bonus depreciation (8 bldgs at 20%) and Repurchase Put avoidance', severity: 'critical' },
              { label: 'Bonus depreciation (40%) — 2 bldgs', date: 'Dec 31, 2025', risk: 'If missed: Downward Bonus Depreciation Adjustor reduces 4th capital contribution — amount determined by AHF unilaterally', severity: 'critical' },
              { label: 'Property tax exemption', date: 'Ongoing', risk: 'UNCAPPED guarantee — if SMHA/PFC exemption is lost, SLP funds the entire tax bill. Also a Conversion Event.', severity: 'critical' },
              { label: 'NCF % dilution threshold', date: 'Ongoing', risk: 'If Investor LP Loans ever exceed $50,000, NCF % permanently drops from 85%. Never reversible.', severity: 'high' },
              { label: 'Bonds paid in full', date: 'Jul 1, 2028', risk: '$38M bonds must be fully redeemed. Failure is a Repurchase Event.', severity: 'high' },
              { label: 'ODG cap watch', date: 'Ongoing', risk: `ODG cap is ${fm(odgCap)}. At current burn rate, monitor balance closely. Exceeding cap means AHF makes Investor LP Loans at 10-15% interest.`, severity: 'high' },
            ].map((r, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: S.radius, background: sevbg[r.severity], border: `0.5px solid ${r.severity === 'critical' ? '#F09595' : '#FAC775'}`, marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: '#6b6a63', flexShrink: 0 }}>{r.date}</span>
                </div>
                <div style={{ fontSize: 11, color: sevcl[r.severity], lineHeight: 1.4 }}>{r.risk}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EQUITY & ADJUSTORS ── */}
      {subTab === 'equity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionLabel mt={0}>Capital contribution schedule</SectionLabel>
            <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#eceae3' }}>
                  {['Tranche', 'Amount', 'Status', 'Earliest / conditions'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(lpa.capital_contributions || []).map((c, i) => (
                    <tr key={i} style={{ borderBottom: S.border, background: c.status === 'funded' ? '#f5faf0' : '#fff' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>{c.label}</td>
                      <td style={{ padding: '7px 10px', color: '#1a1a18' }}>{fm(c.amount)}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ background: c.status === 'funded' ? '#EAF3DE' : '#FAEEDA', color: c.status === 'funded' ? '#27500A' : '#633806', padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>
                          {c.status === 'funded' ? 'Funded' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: '#6b6a63', fontSize: 11, lineHeight: 1.3 }}>{c.trigger || c.date}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#eceae3', borderTop: S.border }}>
                    <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>Total equity</td>
                    <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>{fm(totalEquity)}</td>
                    <td colSpan={2} style={{ padding: '7px 10px', fontSize: 11, color: '#6b6a63' }}>{funded.length} of {(lpa.capital_contributions||[]).length} tranches funded · {fm(pendingEquity)} remaining</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SectionLabel>Developer fee</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              <Kpi label="Dev fee total" value={fm(lpa.dev_fee_total)} />
              <Kpi label="Paid to date" value={fm(lpa.dev_fee_paid)} />
              <Kpi label="Deferred" value={fm(lpa.dev_fee_deferred)} sub="due by Dec 31 2039" warn />
            </div>
            <div style={{ height: 8, background: '#e5e3db', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ width: `${Math.round((lpa.dev_fee_paid/lpa.dev_fee_total)*100)}%`, height: '100%', background: '#378ADD', borderRadius: 4 }} />
            </div>
          </div>

          <div>
            <SectionLabel mt={0}>The 5 adjustors — what can reduce your equity</SectionLabel>

            {[
              {
                name: '1. Downward Adjustor (§5.1(c)(i))',
                severity: 'high',
                formula: 'Certified Credit Decrease = ($38,085,441 − Certified Credits) × $0.8275',
                trigger: 'Certified credits come in below $38,085,441 at cost cert',
                impact: 'Reduces 2nd contribution first, then 3rd, then 4th. If it exceeds all unfunded contributions, SLP pays AHF the excess within 75 days.',
                live: 'Monitor qualified basis at each building — any reduction in eligible basis reduces credits.',
              },
              {
                name: '2. Late Delivery Adjustment (§5.1(c)(iii))',
                severity: 'critical',
                formula: 'Component A: If FY2026 Actual Credits < $2,317,826, shortfall x $0.60. Component B: Each subsequent year with no Actual Credits, ($3,808,544 - Actual Credits) x $0.60',
                trigger: 'Buildings not generating sufficient credits in first credit year (2026)',
                impact: 'Stacks with Downward Adjustor. Reduces 4th contribution first then works backward. SLP pays any excess within 75 days.',
                live: '⚠ Most live risk. Have accountants model FY2026 Actual Credits now based on current PIS dates.',
              },
              {
                name: '3. Downward Bonus Depreciation Adjustor (§5.1(c)(vi))',
                severity: 'critical',
                formula: 'Amount = AHF-determined amount to maintain its closing rate of return (NO formula — AHF sets it unilaterally)',
                trigger: '2 bldgs not PIS in 2025 (40% bonus) AND/OR 8 bldgs not PIS in 2026 (20% bonus)',
                impact: 'Reduces 4th contribution. If it exceeds the 4th contribution, SLP pays the excess within 75 days.',
                live: 'Confirm with accountants whether 2 buildings placed in service in 2025 actually qualify.',
              },
              {
                name: '4. Section 5.4 Withholding',
                severity: 'high',
                formula: 'No formula — AHF withholds any otherwise-due contribution at its sole election',
                trigger: 'GP/SLP not in substantial compliance, FHA loan in default, or foreclosure commenced',
                impact: 'Any contribution can be withheld entirely until default is cured. Exception: if the contribution itself cures the default, AHF must fund it.',
                live: 'Keep HUD loan current. No defaults. No open compliance violations.',
              },
              {
                name: '5. Projected Late Delivery / Credit Decrease Withholding (§5.1(c)(v))',
                severity: 'high',
                formula: 'AHF may withhold any otherwise-due contribution in amount it determines in good faith',
                trigger: 'AHF projects (based on draft cost cert or accountant estimates) that adjustors will exceed the 4th contribution',
                impact: 'Pre-8609 withholding reserve. Released on 4th contribution date if adjustors do not materialize.',
                live: 'Early accountant engagement reduces this risk — give AHF clean cost cert data as early as possible.',
              },
            ].map((adj, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: S.radius, background: sevbg[adj.severity], border: `0.5px solid ${adj.severity === 'critical' ? '#F09595' : '#FAC775'}`, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginBottom: 5 }}>{adj.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 8px', fontSize: 11, lineHeight: 1.45 }}>
                  <span style={{ color: '#8f8e87', fontWeight: 500 }}>Formula:</span><span style={{ color: '#1a1a18', whiteSpace: 'pre-line' }}>{adj.formula}</span>
                  <span style={{ color: '#8f8e87', fontWeight: 500 }}>Trigger:</span><span style={{ color: '#1a1a18' }}>{adj.trigger}</span>
                  <span style={{ color: '#8f8e87', fontWeight: 500 }}>Impact:</span><span style={{ color: '#1a1a18' }}>{adj.impact}</span>
                  <span style={{ color: sevcl[adj.severity], fontWeight: 500 }}>Action:</span><span style={{ color: sevcl[adj.severity], fontWeight: 500 }}>{adj.live}</span>
                </div>
              </div>
            ))}

            <div style={{ padding: '8px 12px', background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: S.radius, marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#27500A', marginBottom: 3 }}>Upward Adjustor (§5.1(c)(ii)) — works in your favor</div>
              <div style={{ fontSize: 11, color: '#27500A', lineHeight: 1.45 }}>
                If Certified Credits exceed $38,085,441, the 4th contribution increases by (Certified Credit Increase × $0.8275) minus any Late Delivery Adjustment. Increase used first for development costs, then as Cost Savings.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GUARANTEES ── */}
      {subTab === 'guarantees' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionLabel mt={0}>SLP guarantees (Mark Gregg / Streamline)</SectionLabel>
            {[
              { name: 'Construction guaranty', cap: null, obligor: 'SLP', status: 'active', detail: 'Completion by earliest of Dec 31 2026, Project Documents date, or date required for Tax Credits. SLP pays ALL excess development costs from own funds. DDF Election available with AHF consent.' },
              { name: 'Operating deficit guaranty', cap: odgCap, obligor: 'SLP', status: 'active', detail: `Commences at Stabilization, runs 5 years (Initial Period). ODG cap: ${fm(odgCap)}. Note: Real Estate Tax Exemption Guaranty is NOT subject to the ODG cap. If new project built within 1-mile radius, ODG period extends to 6 years after that project's last CO.` },
              { name: 'Stabilization guaranty', cap: null, obligor: 'SLP', status: 'active', detail: 'Stabilization by Jun 30, 2027. SLP funds First Priority Loan payments from own funds if needed to achieve Stabilization. All such payments are Excess Development Costs.' },
              { name: 'Tax credit compliance guaranty', cap: null, obligor: 'SLP', status: 'active', detail: 'Pay AHF for any Tax Credit Shortfall including: shortfall amount, IRS penalties/interest, gross-up for AHF tax liability on receipt, legal/accounting costs. Due 75 days after Tax Credit Loss Event.' },
              { name: 'Real estate tax exemption guaranty', cap: null, obligor: 'SLP', status: 'active', detail: 'UNCAPPED — no ODG Cap applies. If property tax exemption is lost (SMHA/PFC structure), SLP funds via Operating Deficit Loan with no cap. Also a Conversion Event.' },
              { name: 'Bond / First Priority Loan guaranty', cap: null, obligor: 'SLP', status: 'active', detail: 'Bonds of $38M must be issued and remain outstanding until Apartment Complex placed in service. Bonds paid in full by Jul 1, 2028. No redemption/refunding/remarketing without AHF consent.' },
              { name: 'Misconduct indemnity', cap: null, obligor: 'SLP & GP', status: 'active', detail: 'Breach of fiduciary duty, intentional misstatement, gross negligence, willful breach, intentional misconduct, bad faith, misappropriation of funds, or fraud by GP, SLP, Developer, PM, or Contractor.' },
              { name: 'Corporate Transparency Act', cap: null, obligor: 'SLP', status: 'active', detail: 'SLP indemnifies Partnership and AHF for any failure by Partnership, SLP, or Affiliates to file required beneficial ownership reports with FinCEN.' },
            ].map((g, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: S.radius, background: '#eceae3', border: S.border, marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{g.name}</span>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#6b6a63' }}>{g.obligor}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: g.cap ? '#6b6a63' : '#791F1F' }}>{g.cap ? `Cap: ${fm(g.cap)}` : 'No cap'}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#6b6a63', lineHeight: 1.5 }}>{g.detail}</div>
              </div>
            ))}
          </div>

          <div>
            <SectionLabel mt={0}>Property manager removal triggers</SectionLabel>
            <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { trigger: 'Investor LP Loans outstanding > $50,000', note: 'Made during PM engagement period' },
                { trigger: 'Tax credit shortfall attributable to PM noncompliance', note: 'Not reimbursed by SLP' },
                { trigger: 'Occupancy < 87% for any consecutive 3-month period after Stabilization', note: 'Key ongoing threshold' },
                { trigger: 'Failing TDHCA inspection', note: '' },
                { trigger: 'Code violation outstanding > 90 days (or allotted correction period)', note: '' },
                { trigger: 'PM materially breaches Management Agreement', note: '' },
                { trigger: 'PM becomes Bankrupt or defaults under Management Agreement', note: '' },
                { trigger: 'PM is Affiliate of GP/SLP and a Conversion Event has occurred', note: '' },
              ].map((t, i) => (
                <div key={i} style={{ padding: '7px 12px', borderBottom: i < 7 ? S.border : 'none', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#BA7517', flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#1a1a18' }}>{t.trigger}</div>
                    {t.note && <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 1 }}>{t.note}</div>}
                  </div>
                </div>
              ))}
            </div>

            <SectionLabel>AHF approval required (SLP cannot act without)</SectionLabel>
            <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
              {[
                'Any sale or disposition of Apartment Complex',
                'Any amendment to Bond Documents or First Priority Loan Documents',
                'Bond redemption, refunding, remarketing or reissuance',
                'Replacing GNMA as credit enhancer',
                'Borrowing more than $10,000 on general credit of Partnership',
                'Capital improvements > $10,000 in single fiscal year (post-Stabilization)',
                'Settling any claim or litigation related to payment/performance bonds',
                'Change of name or principal place of business (30 days prior notice)',
                'Use of Affiliate as Property Manager',
                'Any election or decision under IRS Audit Rules',
              ].map((item, i) => (
                <div key={i} style={{ padding: '6px 12px', borderBottom: i < 9 ? S.border : 'none', fontSize: 11, color: '#6b6a63', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <span style={{ color: '#378ADD', flexShrink: 0, marginTop: 1 }}>•</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KEY DATES ── */}
      {subTab === 'dates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionLabel mt={0}>Hard deadlines — repurchase put triggers</SectionLabel>
            {[
              { label: 'All buildings placed in service', date: 'Dec 31, 2026', status: 'pending', risk: 'Repurchase Event if missed — AHF can force buyback at all capital contributed + Prime+2% or 10% interest', severity: 'critical' },
              { label: 'Stabilization', date: 'Jun 30, 2027', status: 'pending', risk: 'Repurchase Event if missed. SLP must buy back AHF interest within 60 days of AHF exercising the Repurchase Put.', severity: 'critical' },
              { label: '8609s issued (first credit year)', date: 'Dec 31, 2026', status: 'pending', risk: 'Must allow Partnership to claim Tax Credits for first Credit Period year. Failure is a Repurchase Event.', severity: 'critical' },
              { label: 'Extended Use Agreement recorded', date: 'Before end of first credit year', status: 'pending', risk: 'Must be in effect before end of first year of Credit Period. Failure is a Repurchase Event.', severity: 'critical' },
              { label: 'Tax-exempt bond financing (50% test)', date: 'Ongoing', status: 'pending', risk: 'At least 50% of aggregate basis of Apartment Complex and Land must be financed by volume-cap tax-exempt bonds. Failure is a Repurchase Event.', severity: 'critical' },
              { label: 'Bonds outstanding until PIS', date: 'Ongoing', status: 'pending', risk: 'All Bonds must remain outstanding until Apartment Complex placed in service. Premature retirement is a Repurchase Event.', severity: 'critical' },
              { label: 'Bonds paid in full', date: 'Jul 1, 2028', status: 'pending', risk: '$38M bonds must be fully redeemed by this date.', severity: 'high' },
            ].map((d, i) => {
              const days = daysUntil(d.date)
              const urgent = days !== null && days < 180
              const critical = days !== null && days < 60
              return (
                <div key={i} style={{ padding: '9px 12px', borderRadius: S.radius, background: sevbg[d.severity], border: `0.5px solid ${d.severity === 'critical' ? '#F09595' : '#FAC775'}`, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{d.label}</span>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {days !== null && <span style={{ fontSize: 11, color: critical ? '#a32d2d' : urgent ? '#633806' : '#8f8e87', fontWeight: critical ? 600 : 400 }}>{days > 0 ? `${days}d` : `${Math.abs(days)}d ago`}</span>}
                      <span style={{ fontSize: 11, color: '#6b6a63' }}>{d.date}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: sevcl[d.severity], lineHeight: 1.4 }}>{d.risk}</div>
                </div>
              )
            })}
          </div>

          <div>
            <SectionLabel mt={0}>Equity milestones</SectionLabel>
            {(lpa.key_dates || []).filter(d => d.label.includes('contribution') || d.label.includes('capital')).concat(
              (lpa.key_dates || []).filter(d => !d.label.includes('contribution') && !d.label.includes('capital'))
            ).map((d, i) => {
              const days = daysUntil(d.date)
              const urgent = days !== null && days < 180 && d.status !== 'complete'
              const critical = days !== null && days < 60 && d.status !== 'complete'
              const bg = d.status === 'complete' ? '#EAF3DE' : d.status === 'at-risk' ? '#FCEBEB' : urgent ? '#FAEEDA' : '#eceae3'
              const dot = d.status === 'complete' ? '#639922' : d.status === 'at-risk' ? '#E24B4A' : urgent ? '#BA7517' : '#c8c6bc'
              return (
                <div key={i} style={{ padding: '8px 10px', borderRadius: S.radius, background: bg, border: S.border, marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{d.label}</span>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {days !== null && d.status !== 'complete' && <span style={{ fontSize: 11, color: critical ? '#a32d2d' : urgent ? '#633806' : '#8f8e87' }}>{days > 0 ? `${days}d` : `${Math.abs(days)}d ago`}</span>}
                          <span style={{ fontSize: 11, color: '#6b6a63' }}>{d.date}</span>
                        </div>
                      </div>
                      {d.risk && <div style={{ fontSize: 11, color: d.status === 'at-risk' ? '#791F1F' : '#6b6a63', marginTop: 2, lineHeight: 1.4 }}>{d.risk}</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── REPORTING ── */}
      {subTab === 'reporting' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionLabel mt={0}>Periodic reporting obligations (§12.5)</SectionLabel>
            <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#eceae3' }}>
                  {['Requirement', 'Due', 'Next due', 'Penalty'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{(lpa.reporting || []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: S.border, background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={{ padding: '7px 10px', color: '#1a1a18', lineHeight: 1.4 }}>{r.what}</td>
                    <td style={{ padding: '7px 10px', color: '#6b6a63' }}>{r.due}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>{r.nextDue}</td>
                    <td style={{ padding: '7px 10px', color: r.penalty ? '#791F1F' : '#8f8e87', fontWeight: r.penalty ? 500 : 400 }}>{r.penalty || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <SectionLabel>Year-end package (due 75 days after Dec 31 = Mar 16)</SectionLabel>
            {[
              'Certification: First Priority Loan payments current',
              'Certification: Taxes and insurance payments current',
              'Certification: No material default under Project Documents',
              'Certification: No building/health/fire code violations (or description if any)',
              'Description of all related-party transactions during the year',
              'Net Cash Flow statement',
              'Copy of annual Agency report on low-income housing status',
            ].map((item, i) => (
              <div key={i} style={{ padding: '5px 10px', borderBottom: i < 6 ? S.border : 'none', fontSize: 11, color: '#6b6a63', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <span style={{ color: '#378ADD', flexShrink: 0 }}>•</span>{item}
              </div>
            ))}
          </div>

          <div>
            <SectionLabel mt={0}>Monthly report contents (§12.5(b)(ii)) — due 35 days after month end</SectionLabel>
            <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
              {[
                ['Balance sheet (unaudited)', 'Required every month'],
                ['Income & expense statement', 'Month and period-to-date'],
                ['Cash flow statement', 'Month and period-to-date'],
                ['Rent roll', 'Certified by Property Manager AND SLP'],
                ['Development budget update', 'Until Stabilization only — actual vs original with all variances'],
                ['Other material partnership information', 'Any material operational items'],
              ].map(([item, note], i) => (
                <div key={i} style={{ padding: '7px 12px', borderBottom: i < 5 ? S.border : 'none' }}>
                  <div style={{ fontSize: 12, color: '#1a1a18', fontWeight: 500 }}>{item}</div>
                  <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 1 }}>{note}</div>
                </div>
              ))}
            </div>

            <SectionLabel>Immediate notice requirements (within 15 days)</SectionLabel>
            {[
              'Any default under Project Documents or payment of mortgage, taxes, interest',
              'Any reserve reduced or terminated for purposes different from those intended',
              'Receipt of any notice of material fact that may affect distributions or adversely affect Partnership',
              'Default by First Priority Lender',
              'Commencement of foreclosure proceedings',
            ].map((item, i) => (
              <div key={i} style={{ padding: '6px 10px', borderBottom: i < 4 ? S.border : 'none', fontSize: 11, color: '#6b6a63', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <span style={{ color: '#E24B4A', flexShrink: 0, fontWeight: 700 }}>!</span>{item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WATERFALL & CONVERSION ── */}
      {subTab === 'waterfall' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionLabel mt={0}>Cash flow waterfall — Net Cash Flow (§9.1)</SectionLabel>
            <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 10 }}>No distributions before Stabilization. Any unauthorized distribution must be returned with 20% interest.</div>
            {(lpa.waterfall || []).map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', background: i % 2 === 0 ? '#eceae3' : '#f5f4f0', borderRadius: S.radius, border: S.border, marginBottom: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{w.priority}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: '#1a1a18', lineHeight: 1.4 }}>{w.label}</span>
                </div>
              </div>
            ))}

            <SectionLabel>Asset management fee</SectionLabel>
            <div style={{ padding: '10px 12px', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: S.radius, fontSize: 11, color: '#633806', lineHeight: 1.5 }}>
              $7,500/year starting when rental revenue is first received. Increases 3% per year. If unpaid, accrues at 12% interest. Already accruing — check balance against operating cash.
            </div>
          </div>

          <div>
            <SectionLabel mt={0}>Conversion events — AHF can convert GP/SLP to passive LP</SectionLabel>
            <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 10 }}>After conversion, AHF selects Substitute GP/SLP. Full removal if uncured within 90 days. Guarantees remain in effect even after removal.</div>
            {(lpa.conversion_triggers || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: S.radius, background: sevbg[c.severity], marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: sevcl[c.severity], flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, color: sevcl[c.severity] }}>{c.trigger}</span>
                </div>
                <span style={{ fontSize: 10, color: sevcl[c.severity], fontWeight: 600, flexShrink: 0 }}>{c.severity}</span>
              </div>
            ))}

            <SectionLabel>NCF % dilution — permanent and irreversible</SectionLabel>
            <div style={{ padding: '10px 12px', background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: S.radius, fontSize: 11, color: '#791F1F', lineHeight: 1.5 }}>
              NCF Percentage starts at 85%. If Investor LP Loans EVER exceed $50,000 outstanding, the NCF % permanently drops to a formula based on the Greatest Excess Investor LP Loan Amount. It CANNOT recover. This directly reduces your incentive management fee and cash distributions forever. Never let LP loans exceed $50K.
            </div>

            <SectionLabel>Repurchase Put terms (§5.6)</SectionLabel>
            <div style={{ padding: '10px 12px', background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: S.radius, fontSize: 11, color: '#791F1F', lineHeight: 1.5, marginTop: 4 }}>
              AHF gives notice → closing 60 days later → SLP pays all capital contributed to Partnership + interest at greater of Prime Rate + 2% per annum or 10% per annum → AHF withdraws. SLP also releases all letters of credit, indemnifies AHF for all losses. Current capital contributions funded: {fm(totalFunded)}.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('draw')
  const stage = STAGE_STYLE[project.stage] || STAGE_STYLE['Stabilized']
  const draw = project.draw_data?.[0] || project.draw_data || null
  const leasing = project.leasing_snapshots?.[0] || null
  const lpa = project.lpa_data?.[0] || project.lpa_data || null

  const tabs = [
    { id: 'draw', label: 'Draws & budget' },
    { id: 'leasing', label: 'Leasing & financials' },
    { id: 'lpa', label: 'LPA compliance' },
    { id: 'bins', label: 'BINs & buildings' },
    { id: 'leaseup', label: 'Lease-up intel' },
    { id: 'sitemap', label: 'Site map' },
    { id: 'capital', label: 'Capital sufficiency' },
    { id: 'performance', label: 'Performance' },
    { id: 'docs', label: 'Documents' },
    { id: 'info', label: 'Info' },
  ]

  return (
    <div style={{ background: '#fff', border: open ? '0.5px solid #888780' : S.border, borderRadius: S.radiusLg, padding: '1rem 1.25rem', transition: 'border-color .15s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {PROJECT_LOGOS[project.name] && (
            <img src={PROJECT_LOGOS[project.name]} alt={project.name} style={{ height: 28, marginBottom: 6, display: 'block' }} />
          )}
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
          <div style={{ fontSize: 12, color: '#6b6a63', marginTop: 2 }}>{project.city} · {project.units} units · {(project.ami || []).map(a => a + '% AMI').join(', ')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: clr[project.alert] || clr.green, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#6b6a63' }}>{project.alert_msg}</span>
          </div>
        </div>
        <span style={{ ...stage, padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{project.stage}</span>
        <span style={{ fontSize: 11, color: '#8f8e87', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginTop: 2 }}>▼</span>
      </div>

      {/* Summary bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        {draw && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>
              <span>Budget spent</span><span style={{ fontWeight: 500, color: '#1a1a18' }}>{pct(draw.total_spent, draw.total_budget)}%</span>
            </div>
            <Bar value={draw.total_spent} max={draw.total_budget} color="#378ADD" />
          </div>
        )}
        {leasing && (project.stage === 'Lease-up' || project.stage === 'Stabilized') && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>
              <span>Physical occupancy</span><span style={{ fontWeight: 500, color: '#1a1a18' }}>{leasing.physical_occupancy}%</span>
            </div>
            <Bar value={leasing.physical_occupancy} max={100} color={leasing.physical_occupancy >= 90 ? '#639922' : leasing.physical_occupancy >= 70 ? '#378ADD' : '#E24B4A'} />
          </div>
        )}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: S.border }} onClick={e => e.stopPropagation()}>
          <TabBar tabs={tabs} active={tab} onChange={setTab} />

          {tab === 'draw' && <DrawTab d={draw} />}
          {tab === 'leasing' && <LeasingTab l={leasing} />}
          {tab === 'lpa' && <LpaTab lpa={lpa} />}
          {tab === 'bins' && <BinsTab project={project} />}
          {tab === 'leaseup' && <LeaseUpTab project={project} />}
          {tab === 'sitemap' && <SiteMapTab project={project} />}
          {tab === 'capital' && <CapitalTab project={project} />}
          {tab === 'performance' && <PerformanceTab project={project} />}
          {tab === 'docs' && <DocsTab project={project} />}
          {tab === 'info' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 12 }}>
                {[['Tax credit year', project.tc_year], ['Equity investor', project.investor], ['Lender', project.lender], ['PM company', project.pm_company || '—']].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{v}</div></div>
                ))}
              </div>
              <SectionLabel mt={0}>Unit mix</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {Object.entries(project.mix || {}).map(([k, v]) => (
                  <span key={k} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: '#eceae3', color: '#6b6a63', border: S.border }}>{k}: <strong style={{ color: '#1a1a18' }}>{v}</strong></span>
                ))}
              </div>
              {project.notes && <>
                <SectionLabel>Notes</SectionLabel>
                <div style={{ fontSize: 12, color: '#6b6a63', lineHeight: 1.6, padding: '8px 10px', background: '#eceae3', borderRadius: S.radius }}>{project.notes}</div>
              </>}
              <SectionLabel>Tax-exempt bond</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, marginBottom: 4 }}>
                {[
                  ['Issuer', 'SMHA Finance PFC'],
                  ['Trustee', 'BOKF, NA'],
                  ['Remarketing agent', 'Piper Sandler & Co.'],
                  ['Bond counsel', 'Bracewell LLP'],
                  ['Principal amount', '$38,000,000'],
                  ['Interest rate', '3.70% per annum'],
                  ['Dated', 'July 1, 2024'],
                  ['Mandatory tender date', 'July 1, 2027'],
                  ['Maturity date', 'July 1, 2028'],
                  ['HUD lender', 'Gershman Investment Corp.'],
                  ['HUD loan amount', '$53,000,000'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{v}</div>
                  </div>
                ))}
              </div>

              {project.pm_contact && <>
                <SectionLabel>On-site property manager</SectionLabel>
                <div style={{ padding: '10px 14px', background: '#eceae3', borderRadius: S.radius, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{project.pm_contact.name}</div>
                  <div style={{ fontSize: 12, color: '#6b6a63' }}>{project.pm_contact.title}</div>
                  <div style={{ fontSize: 12, color: '#6b6a63' }}>{project.pm_contact.address}</div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 2 }}>
                    <a href={`tel:${project.pm_contact.phone}`} style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none' }}>{project.pm_contact.phone}</a>
                    <a href={`mailto:${project.pm_contact.email}`} style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none' }}>{project.pm_contact.email}</a>
                  </div>
                </div>
              </>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Btn onClick={() => onEdit(project)}>Edit project</Btn>
                <Btn danger onClick={() => onDelete(project.id)}>Delete</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Edit project modal ───────────────────────────────────────────────
function EditModal({ project, onSave, onClose }) {
  const [form, setForm] = useState({
    name: project.name || '',
    city: project.city || '',
    stage: project.stage || 'Construction',
    units: project.units || '',
    alert: project.alert || 'green',
    alert_msg: project.alert_msg || '',
    tc_year: project.tc_year || '',
    investor: project.investor || '',
    lender: project.lender || '',
    pm_company: project.pm_company || '',
    notes: project.notes || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    try {
      await upsertProject({ ...project, ...form, units: parseInt(form.units) || 0, tc_year: parseInt(form.tc_year) || null })
      onSave()
    } catch (err) { alert('Save failed: ' + err.message) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a18', marginBottom: 16 }}>Edit — {project.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[['Project name','name','text'],['City, state','city','text'],['Total units','units','number'],['Tax credit year','tc_year','number'],['Equity investor','investor','text'],['Lender','lender','text'],['PM company','pm_company','text']].map(([label, key, type]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: 11, color: '#6b6a63' }}>{label}</label>
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                style={{ fontSize: 13, padding: '6px 9px', border: '0.5px solid #c8c6bc', borderRadius: 7 }} />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#6b6a63' }}>Stage</label>
            <select value={form.stage} onChange={e => set('stage', e.target.value)}
              style={{ fontSize: 13, padding: '6px 9px', border: '0.5px solid #c8c6bc', borderRadius: 7 }}>
              {['Pre-development','Construction','Lease-up','Stabilized'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#6b6a63' }}>Alert status</label>
            <select value={form.alert} onChange={e => set('alert', e.target.value)}
              style={{ fontSize: 13, padding: '6px 9px', border: '0.5px solid #c8c6bc', borderRadius: 7 }}>
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="red">Red</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: '#6b6a63' }}>Alert message</label>
          <input value={form.alert_msg} onChange={e => set('alert_msg', e.target.value)}
            style={{ fontSize: 13, padding: '6px 9px', border: '0.5px solid #c8c6bc', borderRadius: 7 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#6b6a63' }}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
            style={{ fontSize: 13, padding: '6px 9px', border: '0.5px solid #c8c6bc', borderRadius: 7, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Save changes</button>
          <button onClick={onClose} style={{ padding: '7px 16px', fontSize: 13, border: '0.5px solid #c8c6bc', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Risk alert bar ───────────────────────────────────────────────────
function RiskAlertBar({ projects }) {
  const alerts = []

  for (const p of projects) {
    const draw = p.draw_data?.[0] || p.draw_data || null
    const leasing = p.leasing_snapshots?.[0] || null

    // ── Alert 1: Interest reserve runway ──
    const MONTHLY_BOND_INTEREST = 117167
    const interestRemaining = draw?.interest_remaining ?? 287384
    const monthsLeft = interestRemaining / MONTHLY_BOND_INTEREST
    const interestColor = monthsLeft <= 1 ? 'critical' : monthsLeft <= 2 ? 'high' : monthsLeft <= 3 ? 'warn' : null
    if (interestColor) {
      const exhaustDate = (() => {
        const d = new Date('2026-03-02')
        d.setMonth(d.getMonth() + Math.round(monthsLeft))
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      })()
      alerts.push({
        project: p.name,
        severity: interestColor,
        icon: '💰',
        title: 'Interest reserve',
        detail: `${monthsLeft.toFixed(1)} months remaining — exhausted ${exhaustDate}`,
      })
    }

    // ── Alert 2: Lease-up pace vs required ──
    if (p.stage === 'Lease-up' && leasing) {
      const occupied = leasing.occupied || 0
      const stabTarget = Math.floor((leasing.total_units || 363) * 0.9)
      const unitsNeeded = stabTarget - occupied
      const deadline = new Date('2027-06-30')
      const today = new Date()
      const monthsToDeadline = (deadline - today) / (1000 * 60 * 60 * 24 * 30.5)
      const requiredPace = unitsNeeded / monthsToDeadline
      // Get 30-day absorption from leasing data if available, else use known value
      const currentPace = leasing.monthly_absorption || 22
      const paceRatio = currentPace / requiredPace
      const paceColor = paceRatio < 0.85 ? 'critical' : paceRatio < 1.0 ? 'high' : paceRatio < 1.15 ? 'warn' : null
      if (paceColor) {
        alerts.push({
          project: p.name,
          severity: paceColor,
          icon: '🏠',
          title: 'Lease-up pace',
          detail: `${currentPace}/mo actual vs ${requiredPace.toFixed(0)}/mo needed for Jun 2027 — ${paceRatio >= 1 ? 'on track' : `${((1 - paceRatio) * 100).toFixed(0)}% below target`}`,
        })
      } else if (paceRatio >= 1.15) {
        alerts.push({
          project: p.name,
          severity: 'ok',
          icon: '🏠',
          title: 'Lease-up pace',
          detail: `${currentPace}/mo actual vs ${requiredPace.toFixed(0)}/mo needed — on track for Jun 2027`,
        })
      }
    }
  }

  if (alerts.length === 0) return null

  const COLORS = {
    critical: { bg: '#FCEBEB', border: '#F09595', dot: '#E24B4A', text: '#791F1F', label: 'CRITICAL' },
    high:     { bg: '#FEF3E2', border: '#FAC775', dot: '#BA7517', text: '#633806', label: 'HIGH' },
    warn:     { bg: '#FAEEDA', border: '#FAC775', dot: '#BA7517', text: '#633806', label: 'WATCH' },
    ok:       { bg: '#EAF3DE', border: '#C0DD97', dot: '#639922', text: '#27500A', label: 'OK' },
  }

  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {alerts.map((a, i) => {
        const c = COLORS[a.severity]
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8, background: c.bg, border: `0.5px solid ${c.border}` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: c.dot, letterSpacing: '.05em', flexShrink: 0 }}>{c.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: c.text, flexShrink: 0 }}>{a.project}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: c.text, flexShrink: 0 }}>{a.icon} {a.title}</span>
            <span style={{ fontSize: 11, color: c.text, flex: 1 }}>— {a.detail}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────
export default function App() {

  const [authed, setAuthed] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)

  const PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'lihtc2024'

  function handleLogin(e) {
    e.preventDefault()
    if (pw.trim() === PASSWORD) {
      sessionStorage.setItem('lihtc-auth', 'true')
      setPwError(false)
      setPw('')
      setAuthed(true)
    } else {
      setPwError(true)
      setPw('')
    }
  }

  if (!authed) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f4f0' }}>
      <div style={{ background: '#fff', border: '0.5px solid #e5e3db', borderRadius: 16, padding: '2.5rem 2rem', width: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>Development Dashboard</div>
        <div style={{ fontSize: 13, color: '#6b6a63', marginBottom: 24 }}>Enter your password to continue</div>
        <form onSubmit={handleLogin}>
          <input
            autoFocus
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false) }}
            placeholder="Password"
            style={{ width: '100%', fontSize: 14, padding: '10px 12px', border: pwError ? '0.5px solid #E24B4A' : '0.5px solid #c8c6bc', borderRadius: 8, marginBottom: 8, outline: 'none', background: '#fafaf8' }}
          />
          {pwError && <div style={{ fontSize: 12, color: '#E24B4A', marginBottom: 8 }}>Incorrect password</div>}
          <button type="submit" style={{ width: '100%', padding: '10px', fontSize: 14, fontWeight: 500, background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  )

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    load()
    // Subscribe to realtime changes — dashboard updates instantly when data changes
    const unsubscribe = subscribeToProjects((payload) => {
      load()
    })
    return () => unsubscribe()
  }, [authed])

  async function handleDelete(id) {
    if (!confirm('Delete this project? All associated data will be permanently removed.')) return
    await deleteProject(id)
    setProjects(p => p.filter(x => x.id !== id))
  }

  const vis = filter === 'all' ? projects : projects.filter(p => p.stage === filter)
  const leasePrj = projects.filter(p => p.stage === 'Lease-up' || p.stage === 'Stabilized')
  const totalUnits = projects.reduce((a, p) => a + (p.units || 0), 0)
  const totalBudget = projects.reduce((a, p) => a + (p.draw_data?.[0]?.total_budget || 0), 0)
  const totalSpent = projects.reduce((a, p) => a + (p.draw_data?.[0]?.total_spent || 0), 0)
  const avgOcc = leasePrj.length ? Math.round(leasePrj.reduce((a, p) => a + (p.leasing_snapshots?.[0]?.physical_occupancy || 0), 0) / leasePrj.length) : null
  const flags = projects.filter(p => p.alert === 'red').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 13, color: '#6b6a63' }}>
      Loading projects...
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 600, margin: '4rem auto', padding: '0 1.5rem' }}>
      <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#791F1F', marginBottom: 8 }}>Could not connect to Supabase</div>
        <div style={{ fontSize: 13, color: '#a32d2d', marginBottom: 12 }}>{error}</div>
        <div style={{ fontSize: 12, color: '#791F1F', lineHeight: 1.6 }}>
          Check that <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set in your <code>.env.local</code> file.
        </div>
        <button onClick={load} style={{ marginTop: 12, fontSize: 12, padding: '6px 14px', border: '0.5px solid #F09595', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem 2rem 4rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: '#1a1a18' }}>Development Dashboard</span>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'Construction', 'Lease-up', 'Stabilized'].map(f => (
            <span key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 12px', borderRadius: 100, fontSize: 12, cursor: 'pointer',
              border: filter === f ? S.borderMed : S.border,
              background: filter === f ? '#eceae3' : '#fff',
              color: filter === f ? '#1a1a18' : '#6b6a63',
              fontWeight: filter === f ? 500 : 400,
              userSelect: 'none',
            }}>{f === 'all' ? 'All' : f}</span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10, marginBottom: '1.5rem' }}>
        <Kpi label="Projects" value={projects.length} sub={`${vis.length} shown`} />
        <Kpi label="Total units" value={totalUnits.toLocaleString()} />
        <Kpi label="Portfolio budget" value={fm(totalBudget)} sub={`${fm(totalSpent)} spent · ${pct(totalSpent, totalBudget)}%`} />
        {avgOcc !== null && <Kpi label="Avg occupancy" value={`${avgOcc}%`} sub={`${leasePrj.length} projects`} warn={avgOcc < 80} />}
        {flags > 0 && <Kpi label="Flagged" value={flags} sub="need attention" warn />}
      </div>

      {/* Risk alerts */}
      <RiskAlertBar projects={projects} />

      {/* Edit modal */}
      {editing && <EditModal project={editing} onSave={() => { setEditing(null); load() }} onClose={() => setEditing(null)} />}

      {/* Email Queue */}
      <EmailQueue projects={projects} />

      {/* Project list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vis.map(p => (
          <ProjectCard key={p.id} project={p} onEdit={setEditing} onDelete={handleDelete} onRefresh={load} />
        ))}
        {vis.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', fontSize: 13, color: '#8f8e87' }}>
            No projects match this filter.
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Btn onClick={() => alert('Add project — coming soon. Run seed.js to add projects via the database.')}>+ Add project</Btn>
      </div>
    </div>
  )
}
