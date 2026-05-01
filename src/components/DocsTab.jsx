import { useState, useRef } from 'react'
import { uploadDocument, getDocumentUrl, deleteDocument, updateDocumentMeta, fmtBytes } from '../lib/supabase'
import { SectionLabel, Btn } from './ui'
import { TYPE_COLORS, FOLDER_ORDER, FOLDER_LABELS } from '../lib/helpers'

const s = {
  border: '0.5px solid #e5e3db',
  radius: '8px',
}

export function DocsTab({ project }) {
  const docs = project.documents || []
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [noteVal, setNoteVal] = useState('')
  const [localDocs, setLocalDocs] = useState(docs)
  const [addOpen, setAddOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    // Start all folders collapsed
    const init = {}
    const FOLDERS = ['A. Land Acquisition','B. Bond','C. HUD Transcript','D. Equity','E. Land and Lease','F. Construction','G. Opinions','H. Title Misc','Monthly Reports']
    FOLDERS.forEach(f => { init[f] = true })
    return init
  })
  const toggleFolder = (folder) => setCollapsed(c => ({ ...c, [folder]: !c[folder] }))
  const [newMeta, setNewMeta] = useState({ name: '', folder: 'Monthly Reports', doc_type: 'pm-report', notes: '' })
  const fileRef = useRef()
  const addFileRef = useRef()

  const linked = localDocs.filter(d => d.storage_path).length
  const total = localDocs.length

  async function handleFileUpload(e, prefill = null) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)

    for (const file of files) {
      setUploadProgress(`Uploading ${file.name}...`)
      try {
        const folder = prefill?.folder || 'Monthly Reports'
        const name = prefill?.name || file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')
        const docType = guessType(file.name)
        const doc = await uploadDocument(project.id, file, folder, name, docType)
        setLocalDocs(prev => {
          // if a placeholder exists with matching filename, replace it
          const idx = prev.findIndex(d => d.file_name === file.name && !d.storage_path)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = { ...next[idx], ...doc }
            return next
          }
          return [...prev, doc]
        })
      } catch (err) {
        alert(`Upload failed for ${file.name}: ${err.message}`)
      }
    }
    setUploading(false)
    setUploadProgress('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function openDoc(doc) {
    if (!doc.storage_path) return
    try {
      const isExcel = doc.file_name && (doc.file_name.endsWith('.xlsx') || doc.file_name.endsWith('.xls'))
      let href
      if (isExcel) {
        const publicUrl = 'https://iohcoankgpokhhldvzvy.supabase.co/storage/v1/object/public/project-docs/' + doc.storage_path.split('/').map(p => encodeURIComponent(p)).join('/')
        href = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(publicUrl)
      } else {
        href = await getDocumentUrl(doc.storage_path)
      }
      // Use anchor click to bypass popup blockers
      const a = document.createElement('a')
      a.href = href
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      alert('Could not open document: ' + err.message)
    }
  }

  async function handleDelete(doc) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    try {
      await deleteDocument(doc)
      setLocalDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  async function saveNote(doc) {
    try {
      await updateDocumentMeta(doc.id, { notes: noteVal })
      setLocalDocs(prev => prev.map(d => d.id === doc.id ? { ...d, notes: noteVal } : d))
      setEditingNote(null)
    } catch (err) {
      alert('Save failed: ' + err.message)
    }
  }

  function guessType(filename) {
    const f = filename.toLowerCase()
    if (f.includes('rent roll') || f.includes('rentroll')) return 'rent-roll'
    if (f.includes('draw') || f.includes('requisition')) return 'draw-schedule'
    if (f.includes('financial') || f.includes('financials') || f.includes('p&l')) return 'pm-report'
    if (f.includes('opinion')) return 'opinion'
    return 'executed'
  }

  const q = search.toLowerCase()
  const filtered = localDocs.filter(d =>
    (filter === 'all' || d.folder === filter) &&
    (!q || d.name?.toLowerCase().includes(q) || d.file_name?.toLowerCase().includes(q))
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 14 }}>
        <div style={{ background: '#eceae3', borderRadius: 8, padding: '.8rem 1rem' }}>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>Total documents</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a18' }}>{total}</div>
        </div>
        <div style={{ background: '#eceae3', borderRadius: 8, padding: '.8rem 1rem' }}>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>Files uploaded</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: linked < total ? '#BA7517' : '#639922' }}>{linked}</div>
          <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 2 }}>{total - linked} awaiting upload</div>
        </div>
        <div style={{ background: '#eceae3', borderRadius: 8, padding: '.8rem 1rem' }}>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>Storage</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18' }}>Supabase</div>
          <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 2 }}>50 MB per file</div>
        </div>
      </div>

      {/* Bulk upload */}
      <div style={{ background: '#eceae3', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Upload files</div>
          <div style={{ fontSize: 11, color: '#6b6a63' }}>PDF, Excel, Word — up to 50 MB each. Multiple files OK.</div>
        </div>
        <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc" onChange={handleFileUpload} style={{ fontSize: 12 }} disabled={uploading} />
        {uploading && <span style={{ fontSize: 12, color: '#633806' }}>{uploadProgress}</span>}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ fontSize: 12, flex: 1, minWidth: 160, padding: '6px 10px', border: s.border, borderRadius: s.radius, background: '#fff' }}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ fontSize: 12, padding: '6px 10px', border: s.border, borderRadius: s.radius, background: '#fff' }}>
          <option value="all">All folders</option>
          {FOLDER_ORDER.map(f => <option key={f} value={f}>{FOLDER_LABELS[f]}</option>)}
        </select>
      </div>

      {/* Document list by folder */}
      {FOLDER_ORDER.map(folder => {
        const folderDocs = filtered.filter(d => d.folder === folder)
        if (!folderDocs.length) return null
        return (
          <div key={folder} style={{ marginBottom: collapsed[folder] ? 8 : 18 }}>
            <div
              onClick={() => toggleFolder(folder)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500, marginBottom: collapsed[folder] ? 0 : 6, cursor: 'pointer', userSelect: 'none', padding: '4px 2px' }}>
              <span>{FOLDER_LABELS[folder]} <span style={{ color: '#c8c6bc', fontWeight: 400 }}>({folderDocs.length} · {folderDocs.filter(d => d.storage_path).length} uploaded)</span></span>
              <span style={{ fontSize: 10, color: '#8f8e87', transform: collapsed[folder] ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }}>▼</span>
            </div>
            {!collapsed[folder] && <div style={{ border: s.border, borderRadius: 8, overflow: 'hidden' }}>
              {folderDocs.map((doc, i) => {
                const tc = TYPE_COLORS[doc.doc_type] || TYPE_COLORS.reference
                const hasFile = !!doc.storage_path
                const isEditNote = editingNote === doc.id
                return (
                  <div key={doc.id} style={{
                    padding: '9px 12px',
                    borderBottom: i < folderDocs.length - 1 ? s.border : 'none',
                    background: '#fff',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    {/* status dot */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasFile ? '#639922' : '#e5e3db', flexShrink: 0, marginTop: 4 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{doc.name}</span>
                        <span style={{ ...tc, padding: '1px 7px', borderRadius: 100, fontSize: 10, fontWeight: 500 }}>{doc.doc_type}</span>
                        {doc.file_size && <span style={{ fontSize: 10, color: '#8f8e87' }}>{fmtBytes(doc.file_size)}</span>}
                      </div>

                      {doc.file_name && (
                        <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>{doc.file_name}</div>
                      )}

                      {isEditNote ? (
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                          <input
                            autoFocus
                            value={noteVal}
                            onChange={e => setNoteVal(e.target.value)}
                            placeholder="Add a note..."
                            style={{ fontSize: 12, flex: 1, padding: '4px 8px', border: s.border, borderRadius: 6 }}
                          />
                          <Btn small onClick={() => saveNote(doc)}>Save</Btn>
                          <Btn small onClick={() => setEditingNote(null)}>Cancel</Btn>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                          {hasFile ? (
                            <button onClick={() => openDoc(doc)} style={{ fontSize: 11, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              Open file
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#8f8e87' }}>No file yet</span>
                          )}
                          <button
                            onClick={() => { setEditingNote(doc.id); setNoteVal(doc.notes || '') }}
                            style={{ fontSize: 11, color: '#8f8e87', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {doc.notes ? 'Edit note' : '+ Note'}
                          </button>
                          {doc.notes && <span style={{ fontSize: 11, color: '#6b6a63' }}>{doc.notes}</span>}
                        </div>
                      )}
                    </div>

                    {/* upload / delete */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!hasFile && (
                        <label style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Upload
                          <input
                            type="file"
                            accept=".pdf,.xlsx,.xls,.docx,.doc"
                            style={{ display: 'none' }}
                            onChange={e => handleFileUpload(e, { folder: doc.folder, name: doc.name })}
                          />
                        </label>
                      )}
                      {hasFile && (
                        <button onClick={() => handleDelete(doc)} style={{ fontSize: 11, color: '#a32d2d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>}
          </div>
        )
      })}

      {/* Add document */}
      <div style={{ marginTop: 8 }}>
        {!addOpen ? (
          <Btn onClick={() => setAddOpen(true)}>+ Add document</Btn>
        ) : (
          <div style={{ background: '#fff', border: '0.5px solid #888780', borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18', marginBottom: 10 }}>Add document</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[
                ['Name', 'name', 'text', 'PM Financials — May 2026'],
                ['Folder', 'folder', 'select', null],
                ['Type', 'doc_type', 'select2', null],
                ['Notes', 'notes', 'text', 'Optional notes'],
              ].map(([label, key, type, ph]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 11, color: '#6b6a63' }}>{label}</label>
                  {type === 'text' && (
                    <input value={newMeta[key]} onChange={e => setNewMeta(m => ({ ...m, [key]: e.target.value }))}
                      placeholder={ph} style={{ fontSize: 12, padding: '5px 8px', border: s.border, borderRadius: 6 }} />
                  )}
                  {type === 'select' && (
                    <select value={newMeta[key]} onChange={e => setNewMeta(m => ({ ...m, [key]: e.target.value }))}
                      style={{ fontSize: 12, padding: '5px 8px', border: s.border, borderRadius: 6 }}>
                      {FOLDER_ORDER.map(f => <option key={f} value={f}>{FOLDER_LABELS[f]}</option>)}
                    </select>
                  )}
                  {type === 'select2' && (
                    <select value={newMeta[key]} onChange={e => setNewMeta(m => ({ ...m, [key]: e.target.value }))}
                      style={{ fontSize: 12, padding: '5px 8px', border: s.border, borderRadius: 6 }}>
                      {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#6b6a63', display: 'block', marginBottom: 4 }}>File (optional — can upload later)</label>
              <input ref={addFileRef} type="file" accept=".pdf,.xlsx,.xls,.docx,.doc" style={{ fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={async () => {
                if (!newMeta.name) return
                const file = addFileRef.current?.files?.[0]
                try {
                  if (file) {
                    const doc = await uploadDocument(project.id, file, newMeta.folder, newMeta.name, newMeta.doc_type, newMeta.notes)
                    setLocalDocs(prev => [...prev, doc])
                  } else {
                    const { supabase } = await import('../lib/supabase')
                    const { data } = await supabase.from('documents').insert({
                      project_id: project.id, ...newMeta, sort_order: localDocs.length,
                    }).select().single()
                    setLocalDocs(prev => [...prev, data])
                  }
                  setNewMeta({ name: '', folder: 'Monthly Reports', doc_type: 'pm-report', notes: '' })
                  setAddOpen(false)
                } catch (err) { alert('Error: ' + err.message) }
              }}>Save</Btn>
              <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
