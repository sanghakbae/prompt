// {{variable}} template handling shared by the editor and the run page.

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.\-가-힣]+)\s*\}\}/g

// Unique variable names in the order they first appear.
export function extractVars(body = '') {
  const seen = []
  let m
  VAR_RE.lastIndex = 0
  while ((m = VAR_RE.exec(body))) {
    if (!seen.includes(m[1])) seen.push(m[1])
  }
  return seen
}

// Substitute values; unknown/blank names are left as-is so the gap is visible.
export function render(body = '', values = {}) {
  VAR_RE.lastIndex = 0
  return body.replace(VAR_RE, (full, name) => {
    const v = values[name]
    return v === undefined || v === '' ? full : v
  })
}

export function missingVars(body = '', values = {}) {
  return extractVars(body).filter((n) => !values[n])
}
