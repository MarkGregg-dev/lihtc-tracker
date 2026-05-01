import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment')
}

export const supabase = createClient(url, key)

// ── Projects ─────────────────────────────────────────────────────────
export async function getProjects() {
const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      draw_data(*),
      lpa_data(*),
      leasing_snapshots(*),
      documents(id, folder, name, file_name, doc_type, storage_path, file_size, notes, sort_order)
    `)
    .order('sort_order')
   if (error) throw error
  return data
}

export async function upsertProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .upsert(project, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ── Draw data ─────────────────────────────────────────────────────────
export async function upsertDrawData(projectId, draw) {
  const { data, error } = await supabase
    .from('draw_data')
    .upsert({ ...draw, project_id: projectId }, { onConflict: 'project_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Leasing snapshots ─────────────────────────────────────────────────
export async function upsertLeasing(projectId, leasing) {
  // Mark all previous snapshots as not current
  await supabase
    .from('leasing_snapshots')
    .update({ is_current: false })
    .eq('project_id', projectId)
    .eq('is_current', true)

  const { data, error } = await supabase
    .from('leasing_snapshots')
    .insert({ ...leasing, project_id: projectId, is_current: true })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── LPA data ──────────────────────────────────────────────────────────
export async function upsertLpa(projectId, lpa) {
  const { data, error } = await supabase
    .from('lpa_data')
    .upsert({ ...lpa, project_id: projectId }, { onConflict: 'project_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Documents ─────────────────────────────────────────────────────────
export async function uploadDocument(projectId, file, folder, name, docType, notes = '') {
  const ext = file.name.split('.').pop()
  const path = `${projectId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('project-docs')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError

  // Insert document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      folder,
      name,
      file_name: file.name,
      doc_type: docType,
      storage_path: path,
      file_size: file.size,
      mime_type: file.type,
      notes,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDocumentUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('project-docs')
    .createSignedUrl(storagePath, 3600) // 1-hour signed URL
  if (error) throw error
  return data.signedUrl
}

export async function deleteDocument(doc) {
  // Delete from storage
  if (doc.storage_path) {
    await supabase.storage.from('project-docs').remove([doc.storage_path])
  }
  // Delete record
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
}

export async function updateDocumentMeta(id, updates) {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── File size formatter ───────────────────────────────────────────────
export function fmtBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
