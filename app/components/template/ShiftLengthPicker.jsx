'use client'

import { SHIFT_LENGTHS, PALETTE } from './shift-constants'

export default function ShiftLengthPicker({ selected = [8], onChange }) {
  const toggle = (len) => {
    const s = new Set(selected)
    if (s.has(len)) {
      if (s.size > 1) s.delete(len)
    } else {
      s.add(len)
    }
    onChange([...s].sort((a, b) => a - b))
  }

  return (
    <div className="flex gap-3">
      {SHIFT_LENGTHS.map((len, i) => {
        const active = selected.includes(len)
        const c = PALETTE[i % PALETTE.length]
        return (
          <button
            key={len}
            onClick={() => toggle(len)}
            className="flex-1 py-6 px-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: active ? c.border : '#E5E7EB',
              background: active ? c.bg : '#FFFFFF',
            }}
          >
            <span className="text-3xl font-bold" style={{ color: active ? c.text : '#9CA3AF' }}>
              {len}
            </span>
            <span className="text-xs font-semibold" style={{ color: active ? c.text : '#9CA3AF' }}>
              hours
            </span>
            {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.border }} />}
          </button>
        )
      })}
    </div>
  )
}