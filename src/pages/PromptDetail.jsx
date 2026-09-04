import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { deletePrompt, getPrompt, listVersions, restoreVersion } from '../lib/store'
import { extractVars } from '../lib/template'
import Diff from '../components/Diff'
import { copyText } from '../lib/clipboard'

const fmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('ko-KR') : '')

export default function PromptDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [prompt, setPrompt] = useState(null)
  const [versions, setVersions] = useState([])
  const [selected, setSelected] = useState(null) // version compared against current
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    try {
      const [p, vs] = await Promise.all([getPrompt(user.uid, id), listVersions(user.uid, id)])
      setPrompt(p)
      setVersions(vs)
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user.uid])

  const copy = async () => {
    if (!(await copyText(prompt.body))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const remove = async () => {
    if (!confirm(`"${prompt.title}" 프롬프트와 모든 버전 기록을 삭제합니다. 계속할까요?`)) return
    await deletePrompt(user.uid, id)
    nav('/')
  }

  const restore = async (v) => {
    if (!confirm(`v${v.no} 내용으로 되돌립니다. (새 버전으로 기록됩니다)`)) return
    await restoreVersion(user.uid, id, v)
    setSelected(null)
    await load()
  }

  if (loading) return <div className="empty">불러오는 중…</div>
  if (error) return <div className="error">{error}</div>
  if (!prompt) return <div className="empty">프롬프트를 찾을 수 없습니다.</div>

  const vars = extractVars(prompt.body)

  return (
    <>
      <div className="page-head">
        <h1>
          {prompt.favorite ? '★ ' : ''}
          {prompt.title}
        </h1>
        <span className="tag plain">v{prompt.versionCount || 1}</span>
        <div className="spacer" />
        <button onClick={copy}>{copied ? '복사됨 ✓' : '복사'}</button>
        <button onClick={() => nav(`/p/${id}/edit`)}>수정</button>
        <button className="primary" onClick={() => nav(`/p/${id}/run`)}>
          사용하기
        </button>
        <button className="ghost danger" onClick={remove}>
          삭제
        </button>
      </div>

      {prompt.description && <p className="muted" style={{ marginTop: -8 }}>{prompt.description}</p>}
      <div className="row" style={{ marginBottom: 16 }}>
        {prompt.category && <span className="tag plain">{prompt.category}</span>}
        {(prompt.tags || []).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        {vars.length > 0 && <span className="small muted">변수: {vars.join(', ')}</span>}
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>본문</h2>
        <pre className="output">{prompt.body}</pre>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>버전 기록</h2>
          <div className="vlist">
            {versions.map((v) => (
              <div
                key={v.id}
                className={`vitem ${selected?.id === v.id ? 'sel' : ''}`}
                onClick={() => setSelected(selected?.id === v.id ? null : v)}
              >
                <b>v{v.no}</b>
                <span className="small muted" style={{ flex: 1 }}>
                  {v.note || '메모 없음'}
                </span>
                <span className="small muted">{fmt(v.createdAt)}</span>
                <button
                  className="ghost small"
                  onClick={(e) => {
                    e.stopPropagation()
                    restore(v)
                  }}
                >
                  복원
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>{selected ? `v${selected.no} → 현재 비교` : '변경 비교'}</h2>
          {selected ? (
            <Diff oldText={selected.body} newText={prompt.body} />
          ) : (
            <p className="small muted">왼쪽에서 버전을 선택하면 현재 본문과의 차이를 보여줍니다.</p>
          )}
        </div>
      </div>

      <p style={{ marginTop: 24 }}>
        <Link className="muted small" to="/">
          ← 목록으로
        </Link>
      </p>
    </>
  )
}
