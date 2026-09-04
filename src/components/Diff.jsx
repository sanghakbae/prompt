import { useMemo } from 'react'
import { diffLines, diffStats } from '../lib/diff'

export default function Diff({ oldText, newText }) {
  const rows = useMemo(() => diffLines(oldText, newText), [oldText, newText])
  const { added, removed } = diffStats(rows)

  return (
    <div>
      <p className="small muted" style={{ margin: '0 0 8px' }}>
        <span style={{ color: 'var(--ok)' }}>+{added}</span> / <span style={{ color: 'var(--del)' }}>−{removed}</span> 줄
      </p>
      <div className="diff">
        {rows.map((r, i) => (
          <div key={i} className={r.type}>
            {r.type === 'add' ? '+ ' : r.type === 'del' ? '− ' : '  '}
            {r.text || ' '}
          </div>
        ))}
      </div>
    </div>
  )
}
