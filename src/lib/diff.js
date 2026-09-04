// Minimal line diff (LCS) — enough to show what changed between two versions
// without pulling in a diff library.
const MAX_CELLS = 4_000_000 // ~16MB table; beyond this fall back to a coarse diff

export function diffLines(oldText = '', newText = '') {
  const aFull = oldText.split('\n')
  const bFull = newText.split('\n')

  // Identical head/tail lines don't need the LCS table — strip them first so a
  // small edit inside a long prompt stays cheap.
  let head = 0
  while (head < aFull.length && head < bFull.length && aFull[head] === bFull[head]) head++
  let tail = 0
  while (
    tail < aFull.length - head &&
    tail < bFull.length - head &&
    aFull[aFull.length - 1 - tail] === bFull[bFull.length - 1 - tail]
  ) {
    tail++
  }

  const a = aFull.slice(head, aFull.length - tail)
  const b = bFull.slice(head, bFull.length - tail)
  const n = a.length
  const m = b.length
  const prefix = aFull.slice(0, head).map((text) => ({ type: 'same', text }))
  const suffix = aFull.slice(aFull.length - tail).map((text) => ({ type: 'same', text }))

  // Pathologically large rewrites: show it as a wholesale replacement rather
  // than allocating gigabytes for a table nobody reads line by line.
  if ((n + 1) * (m + 1) > MAX_CELLS) {
    return [
      ...prefix,
      ...a.map((text) => ({ type: 'del', text })),
      ...b.map((text) => ({ type: 'add', text })),
      ...suffix,
    ]
  }

  // LCS length table
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: 'del', text: a[i++] })
    } else {
      out.push({ type: 'add', text: b[j++] })
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] })
  while (j < m) out.push({ type: 'add', text: b[j++] })
  return [...prefix, ...out, ...suffix]
}

export function diffStats(rows) {
  return {
    added: rows.filter((r) => r.type === 'add').length,
    removed: rows.filter((r) => r.type === 'del').length,
  }
}
