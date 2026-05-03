import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SectionLabel, Kpi } from './ui'
import { FinancialsParser } from './FinancialsParser'

const S = { border: '0.5px solid #e5e3db', radius: '8px' }
const fm = (v) => v == null ? '—' : '$' + Math.abs(Math.round(v)).toLocaleString()
const pct = (v) => v == null ? '—' : Math.round(v * 10) / 10 + '%'

function MiniChart({ data, color, height = 50, label }) {
  if (!data || data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8f8e87' }}>Not enough data</div>
  const max = Math.max(...data.map(d => Math.abs(d.value)))
  const min = 0
  const range = max - min || 1
  const w = 100 / data.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((Math.abs(d.value) - min) / range * (height - 10)))
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ width: '80%', height: h, background: color, borderRadius: '2px 2px 0 0', opacity: i === data.length - 1 ? 1 : 0.6 }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', marginTop: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: '#8f8e87', lineHeight: 1.2 }}>
            {d.label.split(' ').map((part, j) => <div key={j}>{part}</div>)}
          </div>
        ))}
      </div>
    </div>
  )
}

function TrendCard({ label, value, previous, format, color, chartData, chartColor }) {
  const change = previous != null ? value - previous : null
  const changePct = previous != null && previous !== 0 ? (change / Math.abs(previous)) * 100 : null
  const isPositive = change >= 0

  return (
    <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff' }}>
      <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || '#1a1a18', marginBottom: 4 }}>
        {format === 'currency' ? fm(value) : format === 'pct' ? pct(value) : value?.toLocaleString() || '—'}
      </div>
      {change != null && (
        <div style={{ fontSize: 11, color: isPositive ? '#27500A' : '#a32d2d', marginBottom: 8 }}>
          {isPositive ? '+' : ''}{format === 'currency' ? fm(change) : format === 'pct' ? pct(change) : change?.toFixed(1)}
          {changePct != null && ` (${isPositive ? '+' : ''}${changePct.toFixed(1)}%)`} vs prior month
        </div>
      )}
      {chartData && <MiniChart data={chartData} color={chartColor || '#378ADD'} height={40} />}
    </div>
  )
}

export function PerformanceTab({ project }) {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    if (!project?.id) return
    loadSnapshots()
  }, [project?.id])

  async function loadSnapshots() {
    const { data } = await supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('project_id', project.id)
      .order('period_date', { ascending: true })
    setSnapshots(data || [])
    setLoading(false)
  }

  const latest = snapshots[snapshots.length - 1]
  const previous = snapshots[snapshots.length - 2]

  function chartData(field, format) {
    return snapshots.slice(-6).map(s => ({
      label: s.period ? (() => { const [y,m] = s.period.split('-'); const d = new Date(parseInt(y), parseInt(m)-1); return d.toLocaleDateString('en-US',{month:'short'}) + ' ' + String(y).slice(2) })() : '',
      value: s[field] || 0,
    }))
  }

  if (loading) return <div style={{ fontSize: 12, color: '#8f8e87', padding: 20 }}>Loading performance data...</div>

  return (
    <div>
      {/* Upload parser */}
      <FinancialsParser projectId={project?.id} onParsed={loadSnapshots} />

      {snapshots.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#8f8e87' }}>
          No data yet — upload a rent roll and PM financials above to see performance trends.
        </div>
      )}

      {snapshots.length > 0 && (
        <>
          {/* Period indicator */}
          <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 14 }}>
            Latest data: {latest?.period} · {snapshots.length} month{snapshots.length !== 1 ? 's' : ''} of history
          </div>

          {/* Section nav */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['overview','Overview'],['income','Income'],['expenses','Expenses'],['occupancy','Occupancy'],['buildings','Buildings']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveSection(key)} style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 100, cursor: 'pointer', border: 'none',
                background: activeSection === key ? '#1a1a18' : '#eceae3',
                color: activeSection === key ? '#fff' : '#6b6a63',
                fontWeight: activeSection === key ? 600 : 400,
              }}>{label}</button>
            ))}
          </div>

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                <TrendCard label="Occupancy" value={latest?.occupancy_pct} previous={previous?.occupancy_pct} format="pct"
                  color={latest?.occupancy_pct >= 90 ? '#27500A' : latest?.occupancy_pct >= 50 ? '#633806' : '#a32d2d'}
                  chartData={chartData('occupancy_pct')} chartColor="#378ADD" />
                <TrendCard label="Occupied units" value={latest?.occupied_units} previous={previous?.occupied_units} format="number"
                  chartData={chartData('occupied_units')} chartColor="#639922" />
                <TrendCard label="NOI" value={latest?.noi} previous={previous?.noi} format="currency"
                  color={latest?.noi >= 0 ? '#27500A' : '#a32d2d'}
                  chartData={chartData('noi')} chartColor={latest?.noi >= 0 ? '#639922' : '#E24B4A'} />
                <TrendCard label="Total income" value={latest?.total_operating_income} previous={previous?.total_operating_income} format="currency"
                  chartData={chartData('total_operating_income')} chartColor="#378ADD" />
                <TrendCard label="Total expenses" value={latest?.total_operating_expenses} previous={previous?.total_operating_expenses} format="currency"
                  color="#a32d2d" chartData={chartData('total_operating_expenses')} chartColor="#E24B4A" />
                <TrendCard label="Actual rent" value={latest?.actual_rent_collected} previous={previous?.actual_rent_collected} format="currency"
                  chartData={chartData('actual_rent_collected')} chartColor="#639922" />
              </div>

              {/* NOI vs budget */}
              {latest?.noi != null && latest?.ptd_budget_noi != null && (
                <div style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: '#fff', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 10 }}>NOI vs Budget — {latest.period}</div>
                  {[
                    ['Total income', latest.total_operating_income, latest.ptd_budget_income],
                    ['Total expenses', Math.abs(latest.total_operating_expenses), Math.abs(latest.ptd_budget_expenses)],
                    ['NOI', latest.noi, latest.ptd_budget_noi],
                  ].map(([label, actual, budget]) => {
                    const variance = actual - budget
                    const good = (label === 'Total expenses') ? variance < 0 : variance >= 0
                    return (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid #f5f4f0' }}>
                        <span style={{ fontSize: 12, color: '#6b6a63', width: 120 }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', width: 90, textAlign: 'right' }}>{fm(actual)}</span>
                        <span style={{ fontSize: 11, color: '#8f8e87', width: 90, textAlign: 'right' }}>bud {fm(budget)}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: good ? '#27500A' : '#a32d2d', width: 80, textAlign: 'right' }}>
                          {variance >= 0 ? '+' : ''}{fm(variance)}
                        </span>
                        <div style={{ flex: 1, height: 6, background: '#eceae3', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: Math.min(100, Math.abs(actual) / Math.max(Math.abs(budget), 1) * 100) + '%', height: '100%', background: good ? '#639922' : '#E24B4A', borderRadius: 3 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* INCOME */}
          {activeSection === 'income' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                <TrendCard label="Gross potential rent" value={latest?.gross_potential_rent} format="currency" chartData={chartData('gross_potential_rent')} chartColor="#378ADD" />
                <TrendCard label="Vacancy loss" value={latest?.vacancy_loss} previous={previous?.vacancy_loss} format="currency" color="#a32d2d" chartData={chartData('vacancy_loss')} chartColor="#E24B4A" />
                <TrendCard label="Concessions" value={latest?.concessions} previous={previous?.concessions} format="currency" color="#633806" chartData={chartData('concessions')} chartColor="#BA7517" />
                <TrendCard label="Net rental income" value={latest?.net_rental_income} previous={previous?.net_rental_income} format="currency" chartData={chartData('net_rental_income')} chartColor="#639922" />
                <TrendCard label="Other income" value={latest?.other_income} previous={previous?.other_income} format="currency" chartData={chartData('other_income')} chartColor="#378ADD" />
                <TrendCard label="Total operating income" value={latest?.total_operating_income} previous={previous?.total_operating_income} format="currency" chartData={chartData('total_operating_income')} chartColor="#639922" />
              </div>

              {/* Income waterfall */}
              {latest && (
                <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#eceae3', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Income waterfall — {latest.period}</div>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['Gross potential rent', latest.gross_potential_rent, false],
                        ['Vacancy loss', latest.vacancy_loss, true],
                        ['Concessions', latest.concessions, true],
                        ['Net rental income', latest.net_rental_income, false, true],
                        ['Other income', latest.other_income, false],
                        ['Total operating income', latest.total_operating_income, false, true],
                      ].map(([label, val, isDeduction, isBold]) => (
                        <tr key={label} style={{ borderBottom: '0.5px solid #f5f4f0' }}>
                          <td style={{ padding: '7px 12px', color: '#6b6a63', fontWeight: isBold ? 600 : 400 }}>{label}</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: isBold ? 600 : 500, color: val < 0 ? '#a32d2d' : '#1a1a18' }}>{fm(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* EXPENSES */}
          {activeSection === 'expenses' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                <TrendCard label="Salaries & benefits" value={latest?.salaries_benefits} previous={previous?.salaries_benefits} format="currency" color="#a32d2d" chartData={chartData('salaries_benefits')} chartColor="#E24B4A" />
                <TrendCard label="Repairs & maintenance" value={latest?.repairs_maintenance} previous={previous?.repairs_maintenance} format="currency" color="#633806" chartData={chartData('repairs_maintenance')} chartColor="#BA7517" />
                <TrendCard label="Contract services" value={latest?.contract_services} previous={previous?.contract_services} format="currency" color="#633806" chartData={chartData('contract_services')} chartColor="#BA7517" />
                <TrendCard label="Utilities" value={latest?.utilities} previous={previous?.utilities} format="currency" color="#633806" chartData={chartData('utilities')} chartColor="#BA7517" />
                <TrendCard label="General & admin" value={latest?.general_admin} previous={previous?.general_admin} format="currency" color="#633806" chartData={chartData('general_admin')} chartColor="#BA7517" />
                <TrendCard label="Leasing" value={latest?.leasing} previous={previous?.leasing} format="currency" color="#633806" chartData={chartData('leasing')} chartColor="#BA7517" />
              </div>

              {latest && (
                <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#eceae3', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Expense breakdown — {latest.period}</div>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['Salaries & benefits', latest.salaries_benefits],
                        ['Repairs & maintenance', latest.repairs_maintenance],
                        ['Contract services', latest.contract_services],
                        ['Utilities', latest.utilities],
                        ['General & admin', latest.general_admin],
                        ['Leasing', latest.leasing],
                        ['Management fee', latest.management_fee],
                        ['Total expenses', latest.total_operating_expenses],
                      ].map(([label, val]) => {
                        const isTotal = label === 'Total expenses'
                        const maxExp = Math.abs(latest.total_operating_expenses) || 1
                        const barPct = Math.min(100, Math.abs(val || 0) / maxExp * 100)
                        return (
                          <tr key={label} style={{ borderBottom: '0.5px solid #f5f4f0', background: isTotal ? '#eceae3' : '#fff' }}>
                            <td style={{ padding: '7px 12px', color: '#6b6a63', fontWeight: isTotal ? 600 : 400, width: 180 }}>{label}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: isTotal ? 600 : 500, color: '#a32d2d', width: 100 }}>{fm(val)}</td>
                            <td style={{ padding: '7px 12px' }}>
                              {!isTotal && <div style={{ height: 6, background: '#eceae3', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: barPct + '%', height: '100%', background: '#E24B4A', borderRadius: 3 }} />
                              </div>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* OCCUPANCY */}
          {activeSection === 'occupancy' && latest && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                <TrendCard label="Occupancy rate" value={latest.occupancy_pct} previous={previous?.occupancy_pct} format="pct"
                  color={latest.occupancy_pct >= 90 ? '#27500A' : latest.occupancy_pct >= 50 ? '#633806' : '#a32d2d'}
                  chartData={chartData('occupancy_pct')} chartColor="#378ADD" />
                <TrendCard label="Occupied units" value={latest.occupied_units} previous={previous?.occupied_units} format="number" chartData={chartData('occupied_units')} chartColor="#639922" />
                <TrendCard label="Vacant units" value={latest.vacant_units} previous={previous?.vacant_units} format="number" color="#a32d2d" chartData={chartData('vacant_units')} chartColor="#E24B4A" />
                <TrendCard label="Actual rent" value={latest.actual_rent_collected} previous={previous?.actual_rent_collected} format="currency" chartData={chartData('actual_rent_collected')} chartColor="#639922" />
                <TrendCard label="Potential rent" value={latest.gross_potential_rent} format="currency" chartData={chartData('gross_potential_rent')} chartColor="#8f8e87" />
                <TrendCard label="Delinquency" value={latest.delinquency} previous={previous?.delinquency} format="currency"
                  color={latest.delinquency > 5000 ? '#a32d2d' : '#27500A'}
                  chartData={chartData('delinquency')} chartColor="#E24B4A" />
              </div>

              {/* Occupancy history table */}
              {snapshots.length > 1 && (
                <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#eceae3', fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Month-over-month occupancy</div>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f5f4f0' }}>
                      {['Period','Occupied','Vacant','Occ %','Actual Rent','Vacancy Loss','Delinquency'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {[...snapshots].reverse().map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: S.border, background: i === 0 ? '#FAFAF8' : '#fff' }}>
                          <td style={{ padding: '6px 10px', fontWeight: i === 0 ? 600 : 400, color: '#1a1a18' }}>{s.period}</td>
                          <td style={{ padding: '6px 10px', color: '#1a1a18' }}>{s.occupied_units || '—'}</td>
                          <td style={{ padding: '6px 10px', color: '#a32d2d' }}>{s.vacant_units || '—'}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 500, color: s.occupancy_pct >= 90 ? '#27500A' : s.occupancy_pct >= 50 ? '#633806' : '#a32d2d' }}>{s.occupancy_pct ? s.occupancy_pct + '%' : '—'}</td>
                          <td style={{ padding: '6px 10px', color: '#27500A' }}>{fm(s.actual_rent_collected)}</td>
                          <td style={{ padding: '6px 10px', color: '#a32d2d' }}>{fm(s.vacancy_loss)}</td>
                          <td style={{ padding: '6px 10px', color: s.delinquency > 5000 ? '#a32d2d' : '#1a1a18' }}>{fm(s.delinquency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* BUILDINGS */}
          {activeSection === 'buildings' && latest?.building_data && (
            <div>
              <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 12 }}>Building-by-building occupancy from most recent rent roll ({latest.period})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                {Object.entries(latest.building_data).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([bldg, data]) => {
                  const occPct = data.total > 0 ? Math.round(data.occupied / data.total * 100) : 0
                  const color = occPct >= 90 ? '#27500A' : occPct >= 50 ? '#633806' : occPct > 0 ? '#BA7517' : '#a32d2d'
                  const bg = occPct >= 90 ? '#EAF3DE' : occPct >= 50 ? '#FAEEDA' : occPct > 0 ? '#FEF3E2' : '#FCEBEB'
                  return (
                    <div key={bldg} style={{ border: S.border, borderRadius: S.radius, padding: '12px 14px', background: bg }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 4 }}>Building {bldg}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 6 }}>{occPct}%</div>
                      <div style={{ height: 6, background: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ width: occPct + '%', height: '100%', background: color, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 11, color }}>
                        {data.occupied}/{data.total} units · {fm(data.actualRent)}/mo
                      </div>
                      {occPct === 0 && <div style={{ fontSize: 10, color: '#a32d2d', marginTop: 4, fontWeight: 600 }}>No leases</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
