import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getPrompt, savePrompt } from '../lib/store'
import { extractVars } from '../lib/template'
import TagInput from '../components/TagInput'
import { EXAMPLES } from '../lib/examples'

const BLANK = { title: '', description: '', category: '', body: '', tags: [], favorite: false }

const PLACEHOLDER = `당신은 (역할)입니다.

## 입력
{{입력}}

## 판단 기준
1.
2.

## 출력 형식
(표·목록·문장 등 원하는 형태를 구체적으로)

## 지켜야 할 것
- 모르는 것은 추측하지 말고 "확인 필요"로 표시
-`

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
        setForm({ ...BLANK, ...p, tags: p.tags || [] })
        setOriginalBody(p.body || '')
      })
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [id, user.uid])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const applyExample = (ex) => {
    const typed = form.title || form.body || form.description || (form.tags || []).length
    if (typed && !confirm('작성 중인 내용을 예시로 덮어씁니다. 계속할까요?')) return
    // Clone tags — the form must not hand edits back to the shared constant.
    setForm({ ...BLANK, ...ex, tags: [...(ex.tags || [])] })
  }
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
  if (id && !form.body && error) return <div className="error">{error}</div>

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
          {!id && (
            <>
              <h2>예시에서 시작</h2>
              <p className="small muted" style={{ marginTop: -6 }}>
                고르면 아래 내용이 채워집니다. 그대로 고쳐 쓰세요.
              </p>
              <div className="row" style={{ marginBottom: 18 }}>
                {EXAMPLES.map((ex) => (
                  <button
                    type="button"
                    key={ex.title}
                    className="chip"
                    onClick={() => applyExample(ex)}
                  >
                    {ex.title}
                  </button>
                ))}
              </div>
            </>
          )}

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
          placeholder={PLACEHOLDER}
        />
      </div>
    </form>
  )
}
