import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getPrompt, savePrompt } from '../lib/store'
import { extractVars } from '../lib/template'
import TagInput from '../components/TagInput'

const BLANK = { title: '', description: '', category: '', body: '', tags: [], favorite: false }

export default function PromptEditor() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState(BLANK)
  const [originalBody, setOriginalBody] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    getPrompt(user.uid, id)
      .then((p) => {
        if (!p) return setError('프롬프트를 찾을 수 없습니다.')
        setForm({ ...BLANK, ...p })
        setOriginalBody(p.body || '')
      })
      .finally(() => setLoading(false))
  }, [id, user.uid])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const vars = extractVars(form.body)
  const bodyChanged = !!id && form.body !== originalBody

  const submit = async (e) => {
    e.preventDefault()
    if (!form.body.trim()) return setError('프롬프트 내용을 입력해주세요.')
    setSaving(true)
    setError(null)
    try {
      const savedId = await savePrompt(user.uid, { ...form, id }, { note })
      nav(`/p/${savedId}`)
    } catch (err) {
      setError(String(err?.message || err))
      setSaving(false)
    }
  }

  if (loading) return <div className="empty">불러오는 중…</div>

  return (
    <form onSubmit={submit}>
      <div className="page-head">
        <h1>{id ? '프롬프트 수정' : '새 프롬프트'}</h1>
        <div className="spacer" />
        <button type="button" className="ghost" onClick={() => nav(-1)}>
          취소
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-2">
        <div className="panel">
          <label className="field">
            <span>제목</span>
            <input value={form.title} onChange={set('title')} placeholder="예: 코드 리뷰 요약" />
          </label>
          <label className="field">
            <span>설명</span>
            <input value={form.description} onChange={set('description')} placeholder="언제 쓰는 프롬프트인지" />
          </label>
          <label className="field">
            <span>카테고리</span>
            <input value={form.category} onChange={set('category')} placeholder="예: 개발 / 문서 / 마케팅" />
          </label>
          <label className="field">
            <span>태그</span>
            <TagInput value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
          </label>
        </div>

        <div className="panel">
          <h2>변수</h2>
          {vars.length === 0 ? (
            <p className="small muted">
              본문에 <code>{'{{변수명}}'}</code> 을 쓰면 실행할 때 값을 채워 넣을 수 있습니다.
            </p>
          ) : (
            <div className="tags">
              {vars.map((v) => (
                <span key={v} className="tag">
                  {v}
                </span>
              ))}
            </div>
          )}
          {id && (
            <label className="field" style={{ marginTop: 16 }}>
              <span>변경 메모 {bodyChanged ? '(새 버전으로 기록됩니다)' : '(본문이 바뀌어야 기록됩니다)'}</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 출력 형식을 표로 고정"
                disabled={!bodyChanged}
              />
            </label>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>프롬프트 본문</h2>
        <textarea
          className="mono"
          rows={18}
          value={form.body}
          onChange={set('body')}
          placeholder={'예)\n다음 코드를 리뷰해줘.\n\n언어: {{언어}}\n코드:\n{{코드}}'}
        />
      </div>
    </form>
  )
}
