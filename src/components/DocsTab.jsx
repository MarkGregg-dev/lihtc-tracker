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
          const idx = prev.findIndex(d => d.file_name === file.name && !d.storage_path)
          if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...doc }; return next }
          return [...prev, doc]
        })
      } catch (err) { alert(`Upload failed for ${file.name}: ${err.message}`) }
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
      const a = document.createElement('a')
      a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (err) { alert('Could not open document: ' + err.message) }
  }

  async function handleDelete(doc) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    try {
      await deleteDocument(doc)
      setLocalDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) { alert('Delete failed: ' + err.message) }
  }

  async function saveNote(doc) {
    try {
      await updateDocumentMeta(doc.id, { notes: noteVal })
      setLocalDocs(prev => prev.map(d => d.id === doc.id ? { ...d, notes: noteVal } : d))
      setEditingNote(null)
    } catch (err) { alert('Save failed: ' + err.message) }
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

      <div style={{ background: '#eceae3', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Upload files</div>
          <div style={{ fontSize: 11, color: '#6b6a63' }}>PDF, Excel, Word up to 50 MB each. Multiple files OK.</div>
        </div>
        <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc" onChange={handleFileUpload} style={{ fontSize: 12 }} disabled={uploading} />
        {uploading && <span style={{ fontSize: 12, color: '#633806' }}>{uploadProgress}</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ fontSize: 12, flex: 1, minWidth: 160, padding: '6px 10px', border: s.border, borderRadius: s.radius, background: '#fff' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ fontSize: 12, padding: '6px 10px', border: s.border, borderRadius: s.radius, background: '#fff' }}>
          <option value="all">All folders</option>
          {FOLDER_ORDER.map(f => <option key={f} value={f}>{FOLDER_LABELS[f]}</option>)}
        </select>
      </div>

      {FOLDER_ORDER.map(folder => {
        const folderDocs = filtered.filter(d => d.folder === folder)
        if (!folderDocs.length) return null
        const isCollapsed = collapsed[folder]
        return (
          <div key={folder} style={{ marginBottom: isCollapsed ? 4 : 18 }}>
            <div onClick={() => toggleFolder(folder)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: isColla
