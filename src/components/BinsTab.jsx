import { useState } from 'react'
import { useRef } from 'react'
import { supabase } from '../lib/supabase'
import { uploadDocument, getDocumentUrl, deleteDocument, fmtBytes } from '../lib/supabase'
import { SectionLabel, Kpi, Btn } from './ui'
import { fm } from '../lib/helpers'

const S = {
  border: '0.5px solid #e5e3db',
  borderMed: '0.5px solid #c8c6bc',
  radius: '8px',
}

const STATUS_OPTS = ['Not started', 'Under construction', 'CO received', 'Placed in service']
const STATUS_COLORS = {
  'Not started':        { bg: '#f5f4f0', color: '#8f8e87' },
  'Under construction': { bg: '#E6F1FB', color: '#0C447C' },
  'CO received':        { bg: '#FAEEDA', color: '#633806' },
  'Placed in service':  { bg: '#EAF3DE', color: '#27500A' },
}

const PIS_CHECKLIST = [
  'Certificate of Occupancy received',
  'HUD final inspection passed',
  'First tenant moved in',
  'Applicable fraction ≥ 20% (40-60 test)',
  'Form 8609 application submitted to TDHCA',
  'Placed-in-service date confirmed with accountant',
  'Bonus depreciation eligibility confirmed',
]

// Default buildings from BIN spreadsheet + rent roll
const DEFAULT_BUILDINGS = [
  { id: 1, building: 1, bin: 'TX 24-40001', total_units: 36, occupied: 14, ami_mix: '30% & 60%', status: 'Placed in service', pis_date: '', co_date: '', expected_pis: 'Q3 2025', bonus_depr_year: 2025, checklist: {}, notes: '' },
  { id: 2, building: 2, bin: 'TX 24-40002', total_units: 30, occupied: 11, ami_mix: '60%', status: 'Placed in service', pis_date: '', co_date: '', expected_pis: 'Q3 2025', bonus_depr_year: 2025, checklist: {}, notes: '' },
  { id: 3, building: 3, bin: 'TX 24-40003', total_units: 30, occupied: 4,  ami_mix: '60%', status: 'CO received', pis_date: '', co_date: '', expected_pis: 'Q4 2025', bonus_depr_year: 2025, checklist: {}, notes: '' },
  { id: 4, building: 4, bin: 'TX 24-40004', total_units: 39, occupied: 6,  ami_mix: '30% & 60%', status: 'CO received', pis_date: '', co_date: '', expected_pis: 'Q4 2025', bonus_depr_year: 2025, checklist: {}, notes: '' },
  { id: 5, building: 5, bin: 'TX 24-40005', total_units: 36, occupied: 1,  ami_mix: '60%', status: 'CO received', pis_date: '', co_date: '', expected_pis: 'Q1 2026', bonus_depr_year: 2026, checklist: {}, notes: '' },
  { id: 6, building: 6, bin: 'TX 24-40006', total_units: 36, occupied: 3,  ami_mix: '60%', status: 'CO received', pis_date: '', co_date: '', expected_pis: 'Q1 2026', bonus_depr_year: 2026, checklist: {}, notes: '' },
  { id: 7, building: 7, bin: 'TX 24-40007', total_units: 36, occupied: 0,  ami_mix: '60%', status: 'Under construction', pis_date: '', co_date: '', expected_pis: 'Q2 2026', bonus_depr_year: 2026, checklist: {}, notes: '' },
  { id: 8, building: 8, bin: 'TX 24-40008', total_units: 36, occupied: 8,  ami_mix: '60%', status: 'CO received', pis_date: '', co_date: '', expected_pis: 'Q1 2026', bonus_depr_year: 2026, checklist: {}, notes: '' },
  { id: 9, building: 9, bin: 'TX 24-40009', total_units: 30, occupied: 0,  ami_mix: '60%', status: 'Under construction', pis_date: '', co_date: '', expected_pis: 'Q2 2026', bonus_depr_year: 2026, checklist: {}, notes: '' },
  { id: 10, building: 10, bin: 'TX 24-40010', total_units: 54, occupied: 16, ami_mix: '30% & 60%', status: 'Placed in service', pis_date: '', co_date: '', expected_pis: 'Q3 2025', bonus_depr_year: 2025, checklist: {}, notes: '' },
]

const SK = 'lihtc-bins'

export function BinsTab({ project }) {
  const [buildings, setBuildings] = useState(() => {
    try {
      const saved = localStorage.getItem(SK + '-' + project.id)
      return saved ? JSON.parse(saved) : DEFAULT_BUILDINGS
    } catch { return DEFAULT_BUILDINGS }
  })
  const [expanded, setExpanded] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editVals, setEditVals] = useState({})

  function save(updated) {
    setBuildings(updated)
    try { localStorage.setItem(SK + '-' + project.id, JSON.stringify(updated)) } catch {}
  }

  function startEdit(b) {
    setEditing(b.id)
    setEditVals({ ...b })
  }

  function saveEdit() {
    save(buildings.map(b => b.id === editing ? { ...editVals } : b))
    setEditing(null)
  }

  function toggleChecklist(bldgId, item) {
    save(buildings.map(b => {
      if (b.id !== bldgId) return b
      const cl = { ...b.checklist, [item]: !b.checklist[item] }
      return { ...b, checklist: cl }
    }))
  }

  async function uploadCO(buildingId, file) {
    const b = buildings.find(x => x.id === buildingId)
    if (!b) return
    try {
      const doc = await uploadDocument(
        project.id, file,
        'Certificates of Occupancy',
        `CO — Building ${b.building}`,
        'executed'
      )
      save(buildings.map(x => x.id === buildingId ? { ...x, co_doc: doc } : x))
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
  }

  async function openCO(doc) {
    try {
      const url = await getDocumentUrl(doc.storage_path)
      window.open(url, '_blank')
    } catch (err) {
      alert('Could not open CO: ' + err.message)
    }
  }

  async function deleteCO(buildingId, doc) {
    if (!confirm('Remove this CO?')) return
    try {
      await deleteDocument(doc)
      save(buildings.map(b => b.id === buildingId ? { ...b, co_doc: null } : b))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  // Summary stats
  const pis = buildings.filter(b => b.status === 'Placed in service')
  const co = buildings.filter(b => b.status === 'CO received')
  const construction = buildings.filter(b => b.status === 'Under construction')
  const totalUnits = buildings.reduce((a, b) => a + b.total_units, 0)
  const pisUnits = pis.reduce((a, b) => a + b.total_units, 0)
  const depr2025 = buildings.filter(b => b.bonus_depr_year === 2025)
  const depr2025done = depr2025.filter(b => b.status === 'Placed in service')
  const depr2026 = buildings.filter(b => b.bonus_depr_year === 2026)
  const depr2026done = depr2026.filter(b => b.status === 'Placed in service')

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 14 }}>
        <Kpi label="Total buildings" value={buildings.length} sub={`${totalUnits} units`} />
        <Kpi label="Placed in service" value={pis.length} sub={`${pisUnits} units`} />
        <Kpi label="CO received" value={co.length} sub="awaiting PIS" />
        <Kpi label="Under construction" value={construction.length} sub="not yet CO" />
        <Kpi label="2025 bonus depr" value={`${depr2025done.length}/${depr2025.length}`} sub="bldgs @ 40%" warn={depr2025done.length < depr2025.length} />
        <Kpi label="2026 bonus depr" value={`${depr2026done.length}/${depr2026.length}`} sub="bldgs @ 20%" warn={depr2026done.length < depr2026.length} />
      </div>

      {/* Bonus depreciation alert */}
      {(depr2025done.length < depr2025.length || depr2026done.length < depr2026.length) && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: S.radius, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#791F1F', marginBottom: 4 }}>⚠ Bonus depreciation at risk</div>
          {depr2025done.length < depr2025.length && (
            <div style={{ fontSize: 11, color: '#a32d2d' }}>
              {depr2025.length - depr2025done.length} building(s) needed in service by Dec 31, 2025 for 40% bonus depreciation — check status below
            </div>
          )}
          {depr2026done.length < depr2026.length && (
            <div style={{ fontSize: 11, color: '#a32d2d', marginTop: 3 }}>
              {depr2026.length - depr2026done.length} building(s) needed in service by Dec 31, 2026 for 20% bonus depreciation
            </div>
          )}
        </div>
      )}

      {/* Gantt timeline */}
      <SectionLabel mt={0}>BIN delivery timeline</SectionLabel>
      <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 14 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', background: '#eceae3', borderBottom: S.border }}>
          <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 500, color: '#6b6a63' }}>Building</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', padding: '6px 4px' }}>
            {['Q3 25','Q4 25','Q1 26','Q2 26','Q3 26','Q4 26','Q1 27','Q2 27'].map(q => (
              <div key={q} style={{ fontSize: 10, color: '#8f8e87', textAlign: 'center' }}>{q}</div>
            ))}
          </div>
        </div>
        {buildings.map(b => {
          const sc = STATUS_COLORS[b.status] || STATUS_COLORS['Not started']
          const quarters = ['Q3 25','Q4 25','Q1 26','Q2 26','Q3 26','Q4 26','Q1 27','Q2 27']
          const pisQ = b.pis_date ? null : b.expected_pis?.replace('20','')?.replace(' ','').replace('20','') || null
          // Map expected_pis to quarter index
          const qMap = { 'Q3 2025': 0, 'Q4 2025': 1, 'Q1 2026': 2, 'Q2 2026': 3, 'Q3 2026': 4, 'Q4 2026': 5, 'Q1 2027': 6, 'Q2 2027': 7 }
          const qIdx = qMap[b.expected_pis] ?? -1
          return (
            <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: S.border, background: '#fff' }}>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Bldg {b.building}</div>
                <div style={{ fontSize: 10, color: '#8f8e87' }}>{b.bin}</div>
                <span style={{ ...sc, padding: '1px 6px', borderRadius: 100, fontSize: 9, fontWeight: 500, display: 'inline-block', marginTop: 2 }}>{b.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', padding: '8px 4px', alignItems: 'center', gap: 2 }}>
                {quarters.map((q, i) => {
                  const isPis = i === qIdx
                  const isDone = b.status === 'Placed in service' && i <= qIdx
                  const isCo = b.status === 'CO received' && i === qIdx
                  return (
                    <div key={q} style={{
                      height: 20, borderRadius: 4,
                      background: b.status === 'Placed in service' && i <= qIdx ? '#639922' :
                                  b.status === 'CO received' && i === qIdx ? '#BA7517' :
                                  i === qIdx ? '#378ADD' : 'transparent',
                      border: i === qIdx ? 'none' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i === qIdx && (
                        <span style={{ fontSize: 9, color: '#fff', fontWeight: 500 }}>
                          {b.status === 'Placed in service' ? 'PIS' : b.status === 'CO received' ? 'CO' : 'EXP'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Per-building detail */}
      <SectionLabel>Buildings & BINs</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {buildings.map(b => {
          const sc = STATUS_COLORS[b.status] || STATUS_COLORS['Not started']
          const isOpen = expanded === b.id
          const isEditing = editing === b.id
          const checkDone = PIS_CHECKLIST.filter(item => b.checklist[item]).length
          const occPct = b.total_units ? Math.round((b.occupied / b.total_units) * 100) : 0

          return (
            <div key={b.id} style={{ background: '#fff', border: isOpen ? '0.5px solid #888780' : S.border, borderRadius: S.radius }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : b.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>Building {b.building}</span>
                    <span style={{ fontSize: 11, color: '#8f8e87', fontFamily: 'monospace' }}>{b.bin}</span>
                    <span style={{ ...sc, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>{b.status}</span>
                    {b.bonus_depr_year && (
                      <span style={{ background: '#EEEDFE', color: '#3C3489', padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 500 }}>
                        {b.bonus_depr_year === 2025 ? '40%' : '20%'} bonus depr
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#6b6a63' }}>{b.total_units} units · {b.occupied} occupied ({occPct}%)</span>
                    <span style={{ fontSize: 11, color: '#6b6a63' }}>{b.ami_mix}</span>
                    {b.expected_pis && <span style={{ fontSize: 11, color: '#6b6a63' }}>Expected PIS: {b.expected_pis}</span>}
                    {b.pis_date && <span style={{ fontSize: 11, color: '#27500A', fontWeight: 500 }}>PIS: {b.pis_date}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: checkDone === PIS_CHECKLIST.length ? '#27500A' : '#8f8e87' }}>
                    ✓ {checkDone}/{PIS_CHECKLIST.length}
                  </span>
                  <span style={{ fontSize: 11, color: '#8f8e87', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding: '0 12px 14px', borderTop: S.border }} onClick={e => e.stopPropagation()}>
                  {isEditing ? (
                    <div style={{ paddingTop: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginBottom: 10 }}>
                        {[
                          ['BIN #', 'bin', 'text'],
                          ['Status', 'status', 'select'],
                          ['CO date', 'co_date', 'text'],
                          ['PIS date (actual)', 'pis_date', 'text'],
                          ['Expected PIS', 'expected_pis', 'text'],
                          ['Bonus depr year', 'bonus_depr_year', 'number'],
                          ['AMI mix', 'ami_mix', 'text'],
                          ['Units', 'total_units', 'number'],
                        ].map(([label, key, type]) => (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <label style={{ fontSize: 11, color: '#6b6a63' }}>{label}</label>
                            {type === 'select' ? (
                              <select value={editVals[key] || ''} onChange={e => setEditVals(v => ({ ...v, [key]: e.target.value }))}
                                style={{ fontSize: 12, padding: '5px 8px', border: S.border, borderRadius: 6 }}>
                                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <input type={type} value={editVals[key] || ''} onChange={e => setEditVals(v => ({ ...v, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                                style={{ fontSize: 12, padding: '5px 8px', border: S.border, borderRadius: 6 }} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, color: '#6b6a63', display: 'block', marginBottom: 3 }}>Notes</label>
                        <textarea value={editVals.notes || ''} onChange={e => setEditVals(v => ({ ...v, notes: e.target.value }))}
                          rows={2} style={{ width: '100%', fontSize: 12, padding: '5px 8px', border: S.border, borderRadius: 6, resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn onClick={saveEdit}>Save</Btn>
                        <Btn onClick={() => setEditing(null)}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingTop: 12 }}>
                      {/* Detail grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 12 }}>
                        {[
                          ['BIN', b.bin],
                          ['Units', b.total_units],
                          ['Occupied', `${b.occupied} (${occPct}%)`],
                          ['AMI mix', b.ami_mix],
                          ['Expected PIS', b.expected_pis || '—'],
                          ['CO date', b.co_date || '—'],
                          ['PIS date', b.pis_date || '—'],
                          ['Bonus depr', b.bonus_depr_year ? `${b.bonus_depr_year} (${b.bonus_depr_year === 2025 ? '40%' : '20%'})` : '—'],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {b.notes && (
                        <div style={{ fontSize: 12, color: '#6b6a63', padding: '7px 10px', background: '#eceae3', borderRadius: S.radius, marginBottom: 12 }}>{b.notes}</div>
                      )}

                      {/* Certificate of Occupancy */}
                      <SectionLabel mt={0}>Certificate of Occupancy</SectionLabel>
                      <div style={{ marginBottom: 12 }}>
                        {b.co_doc ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#EAF3DE', borderRadius: S.radius, border: '0.5px solid #C0DD97' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#639922', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A' }}>{b.co_doc.file_name}</div>
                              {b.co_doc.file_size && <div style={{ fontSize: 10, color: '#6b6a63' }}>{fmtBytes(b.co_doc.file_size)}</div>}
                            </div>
                            <button onClick={() => openCO(b.co_doc)} style={{ fontSize: 11, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Open</button>
                            <button onClick={() => deleteCO(b.id, b.co_doc)} style={{ fontSize: 11, color: '#a32d2d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove</button>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: S.borderMed, borderRadius: S.radius, fontSize: 12, color: '#6b6a63', cursor: 'pointer', background: '#fff' }}>
                            + Upload CO
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                              onChange={e => { if (e.target.files[0]) uploadCO(b.id, e.target.files[0]) }} />
                          </label>
                        )}
                      </div>

                      {/* PIS checklist */}
                      <SectionLabel mt={0}>Placed-in-service checklist</SectionLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                        {PIS_CHECKLIST.map(item => (
                          <div key={item} onClick={() => toggleChecklist(b.id, item)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: b.checklist[item] ? '#EAF3DE' : '#f5f4f0', cursor: 'pointer', border: S.border }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${b.checklist[item] ? '#639922' : '#c8c6bc'}`, background: b.checklist[item] ? '#639922' : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {b.checklist[item] && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 12, color: b.checklist[item] ? '#27500A' : '#1a1a18', textDecoration: b.checklist[item] ? 'line-through' : 'none' }}>{item}</span>
                          </div>
                        ))}
                      </div>

                      <Btn small onClick={() => startEdit(b)}>Edit building</Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
