import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { addRun, getPrompt } from '../lib/store'
import { extractVars, missingVars, render } from '../lib/template'
import { MODELS, runPrompt } from '../lib/claude'

export default function Run() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [prompt, setPrompt] = useState(null)
  const [values, setValues] = useState({})
  const [model, setModel] = useState(MODELS[1].id)
  const [system, setSystem] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    getPrompt(user.uid, id).then((p) => {
      setPrompt(p)
      // Remember the last values used for this prompt so reruns are quick.
      try {
        const saved = localStorage.getItem(`vars:${id}`)
        if (saved) setValues(JSON.parse(saved))
      } catch {
        /* ignore unreadable storage */
      }
    })
  }, [id, user.uid])

  const vars = useMemo(() => extractVars(prompt?.body || ''), [prompt])
  const rendered = useMemo(() => render(prompt?.body || '', values), [prompt, values])
  const missing = useMemo(() => missingVars(prompt?.body || '', values), [prompt, values])

  const execute = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await runPrompt({ prompt: rendered, model, system })
      setResult(res)
      try {
        localStorage.setItem(`vars:${id}`, JSON.stringify(values))
      } catch {
        /* ignore unwritable storage */
      }
      await addRun(user.uid, {
        promptId: id,
        promptTitle: prompt.title,
        model: res.model || model,
        vars: values,
        rendered,
        output: res.output,
        usage: res.usage,
        elapsed: res.elapsed,
      })
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  if (!prompt) return <div className="empty">불러오는 중…</div>

  return (
    <>
      <div className="page-head">
        <h1>실행 — {prompt.title}</h1>
        <div className="spacer" />
        <button className="ghost" onClick={() => nav(`/p/${id}`)}>
          돌아가기
        </button>
        <button className="primary" onClick={execute} disabled={busy}>
          {busy ? '실행 중…' : 'Claude로 실행'}
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-2">
        <div className="panel">
          <h2>변수</h2>
          {vars.length === 0 ? (
            <p className="small muted">이 프롬프트에는 변수가 없습니다. 그대로 실행됩니다.</p>
          ) : (
            vars.map((v) => (
              <label className="field" key={v}>
                <span>{`{{${v}}}`}</span>
                <textarea
                  rows={2}
                  value={values[v] || ''}
                  onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))}
                />
              </label>
            ))
          )}

          <label className="field">
            <span>모델</span>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>시스템 프롬프트 (선택)</span>
            <textarea rows={2} value={system} onChange={(e) => setSystem(e.target.value)} />
          </label>
        </div>

        <div className="panel">
          <h2>
            최종 프롬프트{' '}
            {missing.length > 0 && <span className="small muted">— 미입력: {missing.join(', ')}</span>}
          </h2>
          <pre className="output">{rendered}</pre>
        </div>
      </div>

      {result && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h2>
            결과{' '}
            <span className="small muted">
              {result.model} · {result.elapsed}ms
              {result.usage && ` · 입력 ${result.usage.input_tokens} / 출력 ${result.usage.output_tokens} 토큰`}
            </span>
          </h2>
          <pre className="output">{result.output}</pre>
          <div className="row" style={{ marginTop: 12 }}>
            <button onClick={() => navigator.clipboard.writeText(result.output)}>결과 복사</button>
          </div>
        </div>
      )}
    </>
  )
}
