import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const S = { border: '0.5px solid #e5e3db', radius: '8px' }

const DOC_TYPE_COLORS = {
  'pm-report':           { background: '#E6F1FB', color: '#185FA5' },
  'rent-roll':           { background: '#EAF3DE', color: '#27500A' },
  'draw-schedule':       { background: '#FAEEDA', color: '#633806' },
  'invoice':             { background: '#F5F4F0', color: '#6b6a63' },
  'hud-approval':        { background: '#EAF3DE', color: '#27500A' },
  'hud-correspondence':  { background: '#E6F1FB', color: '#185FA5' },
  'bond-statement':      { background: '#FAEEDA', color: '#633806' },
  'interest-statement':  { background: '#FAEEDA', color: '#633806' },
  'equity-correspondence': { background: '#F0EAF8', color: '#5A2D8C' },
  'change-order':        { background: '#FCEBEB', color: '#791F1F' },
  'pay-app':             { background: '#FCEBEB', color: '#791F1F' },
  'compliance':          { background: '#FEF3E2', color: '#633806' },
  'legal':               { background: '#F5F4F0', color: '#1a1a18' },
  'other':               { background: '#F5F4F0', color: '#8f8e87' },
}

const CONFIDENCE_COLORS = {
  high:   { color: '#27500A', bg: '#EAF3DE' },
  medium: { color: '#633806', bg: '#FAEEDA' },
  low:    { color: '#791F1F', bg: '#FCEBEB' },
}

const STATUS_COLORS = {
  'pending':         { color: '#633806', bg: '#FAEEDA', label: 'Pending review' },
  'action-required': { color: '#791F1F', bg: '#FCEBEB', label: 'Action required' },
  'approved':        { color: '#27500A', bg: '#EAF3DE', label: 'Approved' },
  'rejected':        { color: '#8f8e87', bg: '#F5F4F0', label: 'Rejected' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

export function EmailQueue({ projects }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [collapsed, setCollapsed] = useState(true)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    loadQueue()
    const sub = supabase
      .channel('email_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_queue' }, () => loadQueue())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function loadQueue() {
    const { data } = await supabase
      .from('email_queue')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50)
    setItems(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status, notes) {
    setUpdating(id)
    await supabase
      .from('email_queue')
      .update({ status, reviewed_at: new Date().toISOString(), notes })
      .eq('id', id)
    await loadQueue()
    setUpdating(null)
  }

  async function bulkAction(action) {
    if (selected.size === 0) return
    const ids = [...selected]
    if (action === 'delete') {
      if (!confirm('Delete ' + ids.length + ' email(s)? This cannot be undone.')) return
      await supabase.from('email_queue').delete().in('id', ids)
    } else {
      await supabase.from('email_queue').update({ status: action, reviewed_at: new Date().toISOString() }).in('id', ids)
    }
    setSelected(new Set())
    await loadQueue()
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id)))
    }
  }

  function getProjectName(projectId) {
    if (!projectId) return null
    const p = projects?.find(p => p.id === projectId)
    return p?.name || null
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)
  const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'action-required').length

  return (
    <div>
      {/* Header — always visible */}
      <div onClick={() => setCollapsed(c => !c)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : 12, cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>Email Queue</span>
          {pendingCount > 0 && (
            <span style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
              {pendingCount} pending
            </span>
          )}
          <span style={{ fontSize: 11, color: '#8f8e87' }}>{items.length} total</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={e => { e.stopPropagation(); loadQueue() }} style={{ fontSize: 11, color: '#185FA5', background: 'none', border: '0.5px solid #e5e3db', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            Refresh
          </button>
          <span style={{ fontSize: 11, color: '#8f8e87', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .2s' }}>▼</span>
        </div>
      </div>

      <div style={{ display: collapsed ? 'none' : 'block' }}>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'action-required', label: 'Action required' },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 100, cursor: 'pointer',
            background: filter === f.key ? '#1a1a18' : '#eceae3',
            color: filter === f.key ? '#fff' : '#6b6a63',
            border: 'none', fontWeight: filter === f.key ? 600 : 400,
          }}>
            {f.label} {f.key !== 'all' && items.filter(i => i.status === f.key).length > 0 && `(${items.filter(i => i.status === f.key).length})`}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: '#eceae3', borderRadius: 8 }}>
          <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} style={{ cursor: 'pointer' }} />
          <span style={{ fontSize: 11, color: '#6b6a63' }}>{selected.size > 0 ? selected.size + ' selected' : 'Select all'}</span>
          {selected.size > 0 && (
            <>
              <button onClick={() => bulkAction('approved')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#27500A', color: '#fff', cursor: 'pointer' }}>Approve</button>
              <button onClick={() => bulkAction('rejected')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid #e5e3db', background: '#fff', color: '#6b6a63', cursor: 'pointer' }}>Reject</button>
              <button onClick={() => bulkAction('delete')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#a32d2d', color: '#fff', cursor: 'pointer' }}>Delete</button>
            </>
          )}
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: '#8f8e87', padding: '20px 0' }}>Loading queue...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ fontSize: 12, color: '#8f8e87', padding: '40px 0', textAlign: 'center' }}>
          No emails in queue. Forward emails to draws@streamlineap.com to get started.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(item => {
          const isExpanded = expanded === item.id
          const docColor = DOC_TYPE_COLORS[item.detected_doc_type] || DOC_TYPE_COLORS.other
          const confColor = CONFIDENCE_COLORS[item.confidence] || CONFIDENCE_COLORS.low
          const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending
          const analysis = item.extracted_data || {}
          const projectName = getProjectName(item.detected_project_id)

          return (
            <div key={item.id} style={{ border: S.border, borderRadius: S.radius, background: '#fff', overflow: 'hidden' }}>
              {/* Main row */}
              <div onClick={() => setExpanded(isExpanded ? null : item.id)}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                {/* Status dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor.bg === '#FCEBEB' ? '#E24B4A' : statusColor.bg === '#FAEEDA' ? '#BA7517' : statusColor.bg === '#EAF3DE' ? '#639922' : '#8f8e87', flexShrink: 0, marginTop: 4 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{item.subject || '(no subject)'}</span>
                    <span style={{ ...docColor, fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 100 }}>{item.detected_doc_type || 'unknown'}</span>
                    <span style={{ background: confColor.bg, color: confColor.color, fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 100 }}>{item.confidence || '?'} confidence</span>
                    {item.status === 'action-required' && <span style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 100 }}>⚠ Action required</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b6a63', flexWrap: 'wrap' }}>
                    <span>{item.from_email}</span>
                    <span>·</span>
                    <span>{timeAgo(item.received_at)}</span>
                    {projectName && <><span>·</span><span style={{ color: '#185FA5', fontWeight: 500 }}>{projectName}</span></>}
                    {item.attachments?.length > 0 && <><span>·</span><span>{item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}</span></>}
                  </div>
                  {analysis.summary && (
                    <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 4 }}>{analysis.summary}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  <span style={{ background: statusColor.bg, color: statusColor.color, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100 }}>{statusColor.label}</span>
                  <span style={{ fontSize: 10, color: '#8f8e87' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                </div>
                <button onClick={async e => { e.stopPropagation(); if(confirm('Delete this email?')) { await supabase.from('email_queue').delete().eq('id', item.id); loadQueue() } }} style={{ fontSize: 10, color: '#a32d2d', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0 4px' }}>✕</button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ borderTop: S.border, padding: '12px 14px', background: '#f9f8f6' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b6a63', marginBottom: 6 }}>Email details</div>
                      {[
                        ['From', item.from_email],
                        ['Subject', item.subject],
                        ['Received', new Date(item.received_at).toLocaleString()],
                        ['Sender type', item.sender_type],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 3 }}>
                          <span style={{ color: '#8f8e87', minWidth: 80 }}>{label}</span>
                          <span style={{ color: '#1a1a18' }}>{val || '—'}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b6a63', marginBottom: 6 }}>Claude analysis</div>
                      {[
                        ['Document type', analysis.document_type],
                        ['Project', projectName || analysis.project_name || '—'],
                        ['Period', analysis.period || '—'],
                        ['Action needed', analysis.action_note || '—'],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 3 }}>
                          <span style={{ color: '#8f8e87', minWidth: 80 }}>{label}</span>
                          <span style={{ color: '#1a1a18' }}>{val || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {item.attachments?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b6a63', marginBottom: 6 }}>Attachments</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {item.attachments.map((att, i) => (
                          <span key={i} style={{ fontSize: 11, background: '#eceae3', padding: '3px 10px', borderRadius: 6, color: '#1a1a18' }}>
                            {att.name || 'attachment'} {att.size ? `(${Math.round(att.size/1024)}KB)` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.body && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b6a63', marginBottom: 4 }}>Email body</div>
                      <div style={{ fontSize: 11, color: '#6b6a63', background: '#fff', border: S.border, borderRadius: 6, padding: '8px 10px', maxHeight: 100, overflow: 'auto', lineHeight: 1.5 }}>
                        {item.body.substring(0, 500)}{item.body.length > 500 ? '...' : ''}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {(item.status === 'pending' || item.status === 'action-required') && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => updateStatus(item.id, 'approved', 'Approved')}
                        disabled={updating === item.id}
                        style={{ fontSize: 12, fontWeight: 500, padding: '6px 16px', borderRadius: 6, border: 'none', background: '#27500A', color: '#fff', cursor: 'pointer' }}>
                        {updating === item.id ? 'Saving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, 'rejected', 'Rejected')}
                        disabled={updating === item.id}
                        style={{ fontSize: 12, fontWeight: 500, padding: '6px 16px', borderRadius: 6, border: '0.5px solid #e5e3db', background: '#fff', color: '#6b6a63', cursor: 'pointer' }}>
                        Reject
                      </button>
                      <span style={{ fontSize: 11, color: '#8f8e87' }}>Approving marks this as reviewed — it does not yet update project data automatically.</span>
                    </div>
                  )}

                  {item.status === 'approved' && (
                    <div style={{ fontSize: 11, color: '#27500A' }}>
                      Approved {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : ''}
                    </div>
                  )}
                  {item.status === 'rejected' && (
                    <div style={{ fontSize: 11, color: '#8f8e87' }}>
                      Rejected {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
