import { useState } from 'react'

// Enter/comma to add, click × or Backspace on an empty field to remove.
export default function TagInput({ value = [], onChange }) {
  const [draft, setDraft] = useState('')

  const add = (raw) => {
    const t = raw.trim().replace(/,$/, '')
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div>
      <div className="tags" style={{ marginBottom: value.length ? 6 : 0 }}>
        {value.map((t) => (
          <span key={t} className="tag">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        placeholder="태그 입력 후 Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
      />
    </div>
  )
}
