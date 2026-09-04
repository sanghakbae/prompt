import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listPrompts, toggleFavorite } from '../lib/store'
import { extractVars } from '../lib/template'

const fmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString('ko-KR') : '')

export default function PromptList() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [favOnly, setFavOnly] = useState(false)

  useEffect(() => {
    listPrompts(user.uid)
      .then(setPrompts)
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [user.uid])

  const allTags = useMemo(() => [...new Set(prompts.flatMap((p) => p.tags || []))].sort(), [prompts])

  // Search covers title, description, tags and body so an old prompt is
  // findable by any phrase you remember from it.
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return prompts.filter((p) => {
      if (favOnly && !p.favorite) return false
      if (tag && !(p.tags || []).includes(tag)) return false
      if (!needle) return true
      return [p.title, p.description, p.category, p.body, ...(p.tags || [])]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(needle))
    })
  }, [prompts, q, tag, favOnly])

  const star = async (e, p) => {
    e.preventDefault()
    e.stopPropagation()
    const favorite = !p.favorite
    setPrompts((list) => list.map((x) => (x.id === p.id ? { ...x, favorite } : x)))
    try {
      await toggleFavorite(user.uid, p.id, favorite)
    } catch (err) {
      // Put the star back rather than showing a state the server never accepted.
      setPrompts((list) => list.map((x) => (x.id === p.id ? { ...x, favorite: !favorite } : x)))
      setError(String(err?.message || err))
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>프롬프트</h1>
        <span className="muted small">{shown.length}개</span>
        <div className="spacer" />
        <button className="primary" onClick={() => nav('/new')}>
          + 새 프롬프트
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="row" style={{ marginBottom: 16 }}>
        <input
          style={{ flex: 1, minWidth: 220 }}
          placeholder="제목·내용·태그 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className={`chip ${favOnly ? 'on' : ''}`} onClick={() => setFavOnly((v) => !v)}>
          ★ 즐겨찾기
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="row" style={{ marginBottom: 18 }}>
          <button className={`chip ${tag ? '' : 'on'}`} onClick={() => setTag('')}>
            전체
          </button>
          {allTags.map((t) => (
            <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? '' : t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty">불러오는 중…</div>
      ) : shown.length === 0 ? (
        <div className="empty">
          {prompts.length === 0 ? '아직 저장된 프롬프트가 없습니다.' : '조건에 맞는 프롬프트가 없습니다.'}
        </div>
      ) : (
        <div className="cards">
          {shown.map((p) => {
            const vars = extractVars(p.body)
            return (
              <Link key={p.id} to={`/p/${p.id}`} className="card">
                <h3>
                  <button className="star" onClick={(e) => star(e, p)} title="즐겨찾기">
                    {p.favorite ? '★' : '☆'}
                  </button>
                  {p.title}
                </h3>
                {p.description && <div className="small muted">{p.description}</div>}
                <div className="preview">{p.body}</div>
                {(p.tags || []).length > 0 && (
                  <div className="tags" style={{ marginBottom: 8 }}>
                    {p.tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <footer>
                  <span>v{p.versionCount || 1}</span>
                  {vars.length > 0 && <span>· 변수 {vars.length}개</span>}
                  <span className="spacer">{fmt(p.updatedAt)}</span>
                </footer>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
