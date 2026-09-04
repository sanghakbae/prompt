import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { deleteRun, listRuns } from '../lib/store'

const fmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('ko-KR') : '')

export default function RunHistory() {
  const { user } = useAuth()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    listRuns(user.uid)
      .then(setRuns)
      .finally(() => setLoading(false))
  }, [user.uid])

  const remove = async (id) => {
    await deleteRun(user.uid, id)
    setRuns((r) => r.filter((x) => x.id !== id))
  }

  if (loading) return <div className="empty">불러오는 중…</div>
  if (runs.length === 0) return <div className="empty">아직 실행 기록이 없습니다.</div>

  return (
    <>
      <div className="page-head">
        <h1>실행 기록</h1>
        <span className="muted small">{runs.length}건</span>
      </div>

      <div className="vlist" style={{ maxHeight: 'none' }}>
        {runs.map((r) => (
          <div key={r.id}>
            <div className="vitem" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <b>{r.promptTitle || '(삭제된 프롬프트)'}</b>
              <span className="small muted" style={{ flex: 1 }}>
                {r.model} · {r.elapsed}ms
              </span>
              <span className="small muted">{fmt(r.createdAt)}</span>
              {r.promptId && (
                <Link className="small muted" to={`/p/${r.promptId}/run`} onClick={(e) => e.stopPropagation()}>
                  다시 실행
                </Link>
              )}
              <button
                className="ghost danger small"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(r.id)
                }}
              >
                삭제
              </button>
            </div>
            {open === r.id && (
              <div className="grid-2" style={{ margin: '8px 0 16px' }}>
                <div className="panel">
                  <h2>보낸 프롬프트</h2>
                  <pre className="output">{r.rendered}</pre>
                </div>
                <div className="panel">
                  <h2>결과</h2>
                  <pre className="output">{r.output}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
