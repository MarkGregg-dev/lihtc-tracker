import { useState, useEffect } from 'react'
import { getProjects, upsertProject, deleteProject, upsertDrawData, upsertLeasing } from './lib/supabase'
import { fm, pct, clr, STAGE_STYLE, daysUntil } from './lib/helpers'
import { Bar, Kpi, SectionLabel, TabBar, Card, Btn } from './components/ui'
import { DocsTab } from './components/DocsTab'
import { BinsTab } from './components/BinsTab'
import { LeaseUpTab } from './components/LeaseUpTab'

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
