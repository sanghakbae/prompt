// Cloudflare Worker that proxies prompt executions to the Claude API.
//
// Why a Worker: the Anthropic API key stays here as a secret
// (`wrangler secret put ANTHROPIC_API_KEY`) and is never shipped to the browser.
// An Origin allowlist keeps the public workers.dev URL from being used as an
// anonymous relay by anyone else.
const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/prompt\.sanghak\.kr$/,
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

const originAllowed = (o) => !!o && ALLOWED_ORIGINS.some((re) => re.test(o))

const ALLOWED_MODELS = new Set(['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'])

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
    const { pathname } = new URL(request.url)
    if (pathname !== '/run') return json({ error: 'not found' }, 404)
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

    const origin = request.headers.get('Origin')
    if (!originAllowed(origin)) return json({ error: '허용되지 않은 출처입니다 (이 프록시는 Prompt Manager 전용).' }, 403)
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Worker에 ANTHROPIC_API_KEY 시크릿이 설정되지 않았습니다.' }, 500)

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: '잘못된 요청 본문입니다.' }, 400)
    }

    const prompt = String(payload.prompt || '').trim()
    if (!prompt) return json({ error: '프롬프트가 비어 있습니다.' }, 400)
    const model = ALLOWED_MODELS.has(payload.model) ? payload.model : 'claude-sonnet-5'
    const maxTokens = Math.min(Math.max(Number(payload.maxTokens) || 2048, 1), 8192)
    const temperature = Math.min(Math.max(Number(payload.temperature ?? 1), 0), 1)

    const body = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }
    if (payload.system) body.system = String(payload.system)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return json({ error: data?.error?.message || `Claude API 오류 (HTTP ${res.status})` }, res.status)
      const text = (data.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('')
      return json({ output: text, model: data.model, usage: data.usage || null, stopReason: data.stop_reason })
    } catch (e) {
      return json({ error: String(e?.message || e) }, 502)
    }
  },
}
