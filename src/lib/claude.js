// Calls our Cloudflare Worker, which holds the Anthropic API key as a secret.
// The key never reaches the browser.
const BASE = import.meta.env.VITE_WORKER_BASE || ''

export const MODELS = [
  { id: 'claude-opus-5', label: 'Opus 5 — 가장 강력' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5 — 균형' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — 가장 빠름' },
]

export async function runPrompt({ prompt, model, system, maxTokens = 2048, temperature = 1 }) {
  const started = performance.now()
  const res = await fetch(`${BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model, system, maxTokens, temperature }),
  })
  const data = await res.json().catch(() => ({ error: '응답을 해석할 수 없습니다.' }))
  if (!res.ok) throw new Error(data.error || `실행 실패 (HTTP ${res.status})`)
  return { ...data, elapsed: Math.round(performance.now() - started) }
}
