'use client'

import { useState } from 'react'
import { DAYS, getBlockColor, formatTime } from './shift-constants'

export default function StaffAvailabilityGrid({ weekDays, templates, shiftLengths, preferredLengths = [], availabilityGrid = {}, onChange }) {
  const [expanded, setExpanded] = useState(false)

  const daySlots = {}
  DAYS.forEach(d => {
    if (!weekDays[d]?.on) { daySlots[d] = []; return }
    const tmpl = templates[weekDays[d].tmpl]
    daySlots[d] = (tmpl?.shifts || []).map((s, si) => ({ ...s, slotIndex: si, color: getBlockColor(si) }))
  })

  const maxSlots = Math.max(1, ...Object.values(daySlots).map(s => s.length))

  // Filter: which slot indices are relevant for this staff member's preferred lengths?
  const activePrefs = preferredLengths.length > 0 ? preferredLengths : shiftLengths
  const slotMatchesPref = (slot) => {
    if (!slot) return false
    // Check if the slot's length (rounded) matches any preferred length
    const rounded = Math.round(slot.length)
    return activePrefs.some(p => Math.abs(p - rounded) < 0.5)
  }

  const isAvailable = (dayIdx, slotIdx) => {
    const key = `${dayIdx}-${slotIdx}`
    return availabilityGrid[key] !== undefined ? availabilityGrid[key] : true
  }

  const toggleSlot = (dayIdx, slotIdx) => {
    const key = `${dayIdx}-${slotIdx}`
    onChange({ ...availabilityGrid, [key]: !isAvailable(dayIdx, slotIdx) })
  }

  const selectAll = () => {
    const grid = { ...availabilityGrid }
    DAYS.forEach((d, di) => {
      daySlots[d].forEach((slot, si) => {
        if (slotMatchesPref(slot)) grid[`${di}-${si}`] = true
      })
    })
    onChange(grid)
  }

  const clearAll = () => {
    const grid = { ...availabilityGrid }
    DAYS.forEach((d, di) => {
      daySlots[d].forEach((slot, si) => {
        if (slotMatchesPref(slot)) grid[`${di}-${si}`] = false
      })
    })
    onChange(grid)
  }

  // Count only slots matching preferred lengths
  const totalSlots = DAYS.reduce((s, d) => s + daySlots[d].filter(slot => slotMatchesPref(slot)).length, 0)
  const availableSlots = DAYS.reduce((s, d, di) => s + daySlots[d].filter((slot, si) => slotMatchesPref(slot) && isAvailable(di, si)).length, 0)

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between py-2 text-left">
        <span className="text-xs text-gray-500 font-medium">Availability: {availableSlots}/{totalSlots} slots</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="pt-2 pb-1 border-t border-gray-100">
          <div className="flex gap-1 mb-1.5" style={{ paddingLeft: 72 }}>
            {DAYS.map(d => (
              <div key={d} className={`flex-1 text-center text-[11px] font-bold ${weekDays[d]?.on ? 'text-gray-700' : 'text-gray-400'}`}>{d}</div>
            ))}
          </div>

          {Array.from({ length: maxSlots }, (_, si) => {
            const refDay = DAYS.find(d => daySlots[d][si])
            const refSlot = refDay ? daySlots[refDay][si] : null
            const matches = slotMatchesPref(refSlot)

            return (
              <div key={si} className={`flex gap-1 mb-1 items-center ${!matches ? 'opacity-30' : ''}`}>
                <div className="w-[68px] flex-shrink-0 text-[9px] font-semibold px-1.5 py-1.5 rounded leading-tight" style={refSlot ? { color: refSlot.color.text, background: refSlot.color.bg, borderLeft: `2px solid ${refSlot.color.border}` } : { color: '#9CA3AF', background: '#F9FAFB' }}>
                  {refSlot ? (<>{formatTime(refSlot.start).replace(' ', '')}<br />{formatTime(refSlot.start + refSlot.length).replace(' ', '')}</>) : '—'}
                </div>
                {DAYS.map((d, di) => {
                  const slot = daySlots[d][si]
                  if (!weekDays[d]?.on || !slot) return <div key={di} className="flex-1 h-9 rounded-lg bg-gray-100 opacity-30" />
                  if (!matches) return <div key={di} className="flex-1 h-9 rounded-lg bg-gray-100 opacity-50" />
                  const av = isAvailable(di, si)
                  return (
                    <button key={di} onClick={() => toggleSlot(di, si)} className={`flex-1 h-9 rounded-lg border flex items-center justify-center transition-all ${av ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      {av ? <span className="text-sm font-bold" style={{ color: '#10B981' }}>✓</span> : <span className="text-gray-400 text-xs">—</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}

          <div className="flex gap-2 mt-2">
            <button onClick={selectAll} className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#047857' }}>Select all</button>
            <button onClick={clearAll} className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-500 text-[11px] font-semibold hover:bg-gray-50">Clear all</button>
          </div>
        </div>
      )}
    </div>
  )
}