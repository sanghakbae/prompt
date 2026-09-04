// Firestore data layer. Everything lives under users/{uid} so each account only
// ever sees its own prompts (matches firestore.rules).
//
//   users/{uid}/prompts/{id}                — current prompt (latest body)
//   users/{uid}/prompts/{id}/versions/{vid} — immutable snapshot per save
//   users/{uid}/runs/{id}                   — execution history
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const promptCol = (uid) => collection(db, 'users', uid, 'prompts')
const versionCol = (uid, pid) => collection(db, 'users', uid, 'prompts', pid, 'versions')
const runCol = (uid) => collection(db, 'users', uid, 'runs')

// ---- Prompts ----
export async function listPrompts(uid) {
  const snap = await getDocs(query(promptCol(uid), orderBy('updatedAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPrompt(uid, id) {
  const snap = await getDoc(doc(promptCol(uid), id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Create or update a prompt. When the body changed, a version snapshot is
// appended so the improvement history is never lost.
export async function savePrompt(uid, data, { note = '' } = {}) {
  const fields = {
    title: data.title || '제목 없음',
    body: data.body || '',
    description: data.description || '',
    category: data.category || '',
    tags: data.tags || [],
    favorite: !!data.favorite,
    updatedAt: serverTimestamp(),
  }

  if (!data.id) {
    const ref = await addDoc(promptCol(uid), { ...fields, versionCount: 1, createdAt: serverTimestamp() })
    await addVersion(uid, ref.id, { ...fields, no: 1, note: note || '최초 작성' })
    return ref.id
  }

  const prev = await getPrompt(uid, data.id)
  const bodyChanged = prev && prev.body !== fields.body
  await setDoc(doc(promptCol(uid), data.id), fields, { merge: true })
  if (bodyChanged) {
    const no = (prev.versionCount || 1) + 1
    await addVersion(uid, data.id, { ...fields, no, note })
    await setDoc(doc(promptCol(uid), data.id), { versionCount: increment(1) }, { merge: true })
  }
  return data.id
}

export async function deletePrompt(uid, id) {
  // Subcollections aren't cascade-deleted by Firestore — clear versions first.
  const snap = await getDocs(versionCol(uid, id))
  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db)
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(promptCol(uid), id))
}

export async function toggleFavorite(uid, id, favorite) {
  await setDoc(doc(promptCol(uid), id), { favorite }, { merge: true })
}

// ---- Versions ----
async function addVersion(uid, pid, data) {
  await addDoc(versionCol(uid, pid), {
    no: data.no,
    title: data.title,
    body: data.body,
    note: data.note || '',
    createdAt: serverTimestamp(),
  })
}

export async function listVersions(uid, pid) {
  const snap = await getDocs(query(versionCol(uid, pid), orderBy('no', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Roll back by saving the old body as a NEW version — history stays append-only.
export async function restoreVersion(uid, pid, version) {
  const prompt = await getPrompt(uid, pid)
  if (!prompt) return
  await savePrompt(uid, { ...prompt, body: version.body }, { note: `v${version.no} 복원` })
}

// ---- Run history ----
export async function addRun(uid, entry) {
  await addDoc(runCol(uid), {
    promptId: entry.promptId || '',
    promptTitle: entry.promptTitle || '',
    model: entry.model || '',
    vars: entry.vars || {},
    rendered: entry.rendered || '',
    output: entry.output || '',
    usage: entry.usage || null,
    elapsed: entry.elapsed ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function listRuns(uid, max = 200) {
  const snap = await getDocs(query(runCol(uid), orderBy('createdAt', 'desc'), limit(max)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deleteRun(uid, id) {
  await deleteDoc(doc(runCol(uid), id))
}
