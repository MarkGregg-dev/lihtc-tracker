import { useState, useEffect } from 'react'
import { getProjects, upsertProject, deleteProject, upsertDrawData, upsertLeasing } from './lib/supabase'
import { fm, pct, clr, STAGE_STYLE, daysUntil } from './lib/helpers'
import { Bar, Kpi, SectionLabel, TabBar, Card, Btn } from './components/ui'
import { DocsTab } from './components/DocsTab'
import { BinsTab } from './components/BinsTab'
import { LeaseUpTab } from './components/LeaseUpTab'
import { SiteMapTab } from './components/SiteMapTab'

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
              {['Tranche', 'Amount', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(d.equity_schedule || []).map((eq, i) => (
                <tr key={i} style={{ borderBottom: i < d.equity_schedule.length-1 ? S.border : 'none', background: eq.status === 'funded' ? '#f5faf0' : '#fff' }}>
                  <td style={{ padding: '7px 10px', color: '#1a1a18', fontWeight: 500 }}>{eq.label}</td>
                  <td style={{ padding: '7px 10px', color: '#1a1a18' }}>{fm(eq.amount)}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ background: eq.status === 'funded' ? '#EAF3DE' : '#FAEEDA', color: eq.status === 'funded' ? '#27500A' : '#633806', padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>
                      {eq.status === 'funded' ? 'Funded' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px', color: '#6b6a63', fontSize: 11 }}>{eq.date}</td>
                </tr>
              ))}
              <tr style={{ background: '#eceae3', borderTop: S.border }}>
                <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>Total equity</td>
                <td style={{ padding: '7px 10px', fontWeight: 500, color: '#1a1a18' }}>{fm((d.equity_schedule||[]).reduce((a,e) => a+e.amount,0))}</td>
                <td colSpan={2} style={{ padding: '7px 10px', fontSize: 11, color: '#6b6a63' }}>
                  {(d.equity_schedule||[]).filter(e=>e.status==='funded').length} of {(d.equity_schedule||[]).length} funded
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
  const funded = (lpa.capital_contributions || []).filter(c => c.status === 'funded')
  const totalFunded = funded.reduce((a, c) => a + (c.amount || 0), 0)
  const sbg = { funded: '#EAF3DE', pending: '#FAEEDA', 'at-risk': '#FCEBEB', complete: '#EAF3DE' }
  const scl = { funded: '#27500A', pending: '#633806', 'at-risk': '#791F1F', complete: '#27500A' }
  const sevcl = { critical: '#a32d2d', high: '#633806' }
  const sevbg = { critical: '#FCEBEB', high: '#FAEEDA' }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 12 }}>{lpa.entity} · {lpa.investor_lp}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 14 }}>
        <Kpi label="Total equity" value={fm(lpa.total_equity)} sub={`@ $${lpa.credit_price}/credit`} />
        <Kpi label="Funded" value={fm(totalFunded)} sub={`${Math.round(totalFunded / lpa.total_equity * 100)}% of total`} />
        <Kpi label="NCF % to GP/SLP" value={`${lpa.ncf_pct}%`} />
        <Kpi label="Dev fee deferred" value={fm(lpa.dev_fee_deferred)} warn />
        <Kpi label="Stabilization deadline" value="Jun 30, 2027" warn />
      </div>

      <SectionLabel mt={0}>Capital contribution schedule</SectionLabel>
      <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead><tr style={{ background: '#eceae3' }}>
            {['Tranche', 'Amount', 'Status', 'Conditions / earliest date'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{(lpa.capital_contributions || []).map((c, i) => (
            <tr key={i} style={{ borderBottom: S.border }}>
              <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1a1a18' }}>{c.label}</td>
              <td style={{ padding: '6px 10px' }}>{fm(c.amount)}</td>
              <td style={{ padding: '6px 10px' }}>
                <span style={{ background: sbg[c.status] || '#FAEEDA', color: scl[c.status] || '#633806', padding: '2px 7px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>
                  {c.status === 'funded' ? 'Funded' : 'Pending'}
                </span>
              </td>
              <td style={{ padding: '6px 10px', color: '#6b6a63', fontSize: 11 }}>{c.trigger || c.date}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <SectionLabel>Key dates & deadlines</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {(lpa.key_dates || []).map((d, i) => {
          const days = daysUntil(d.date)
          const urgent = days !== null && days < 180 && d.status !== 'complete'
          const critical = days !== null && days < 60 && d.status !== 'complete'
          const bg = d.status === 'complete' ? '#EAF3DE' : d.status === 'at-risk' ? '#FCEBEB' : urgent ? '#FAEEDA' : '#eceae3'
          const dot = d.status === 'complete' ? '#639922' : d.status === 'at-risk' ? '#E24B4A' : urgent ? '#BA7517' : '#c8c6bc'
          return (
            <div key={i} style={{ padding: '8px 10px', borderRadius: S.radius, background: bg, border: S.border }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 3 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{d.label}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {days !== null && d.status !== 'complete' && (
                        <span style={{ fontSize: 11, color: critical ? '#a32d2d' : urgent ? '#633806' : '#8f8e87', fontWeight: critical ? 500 : 400 }}>
                          {days > 0 ? `${days}d` : `${Math.abs(days)}d ago`}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#6b6a63' }}>{d.date}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: d.status === 'at-risk' ? '#791F1F' : '#6b6a63', marginTop: 2, lineHeight: 1.4 }}>{d.risk}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <SectionLabel>Reporting obligations</SectionLabel>
      <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead><tr style={{ background: '#eceae3' }}>
            {['Requirement', 'Due', 'Next due', 'Penalty'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{(lpa.reporting || []).map((r, i) => (
            <tr key={i} style={{ borderBottom: S.border }}>
              <td style={{ padding: '6px 10px', color: '#1a1a18' }}>{r.what}</td>
              <td style={{ padding: '6px 10px', color: '#6b6a63' }}>{r.due}</td>
              <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1a1a18' }}>{r.nextDue}</td>
              <td style={{ padding: '6px 10px', color: r.penalty ? '#791F1F' : '#8f8e87' }}>{r.penalty || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <SectionLabel>Guarantees (all on SLP)</SectionLabel>
      {(lpa.guarantees || []).map((g, i) => (
        <div key={i} style={{ padding: '8px 10px', borderRadius: S.radius, background: '#eceae3', border: S.border, marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{g.name}</span>
            <span style={{ fontSize: 11, color: g.cap ? '#6b6a63' : '#791F1F', fontWeight: g.cap ? 400 : 500, flexShrink: 0 }}>
              {g.cap ? `Cap: ${fm(g.cap)}` : 'No cap'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#6b6a63', lineHeight: 1.4 }}>{g.desc}</div>
        </div>
      ))}

      <SectionLabel>Cash flow waterfall</SectionLabel>
      {(lpa.waterfall || []).map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 10px', background: '#eceae3', borderRadius: S.radius, border: S.border, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#8f8e87', width: 18, textAlign: 'right', flexShrink: 0 }}>{w.priority}.</span>
          <span style={{ fontSize: 12, color: '#6b6a63', lineHeight: 1.4 }}>{w.label}</span>
        </div>
      ))}

      <SectionLabel>Conversion triggers</SectionLabel>
      {(lpa.conversion_triggers || []).map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: S.radius, background: sevbg[c.severity] || '#FAEEDA', marginBottom: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sevcl[c.severity] || '#633806', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: sevcl[c.severity], flex: 1 }}>{c.trigger}</span>
          <span style={{ fontSize: 10, color: sevcl[c.severity], fontWeight: 500, flexShrink: 0 }}>{c.severity}</span>
        </div>
      ))}
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

// ── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('lihtc-auth') === 'true')
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
        <div style={{ fontSize: 18, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>LIHTC Project Tracker</div>
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

  useEffect(() => { if (authed) load() }, [authed])

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
        <span style={{ fontSize: 20, fontWeight: 500, color: '#1a1a18' }}>LIHTC project tracker</span>
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

      {/* Edit modal */}
      {editing && <EditModal project={editing} onSave={() => { setEditing(null); load() }} onClose={() => setEditing(null)} />}

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
