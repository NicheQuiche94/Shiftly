'use client'

import { getShiftBlockColor } from './shift-constants'

export default function ShiftMiniPreview({ shifts, openTime, closeTime, openBuffer, closeBuffer, shiftLengths }) {
  const staffStart = openTime - (openBuffer || 0) / 60
  const staffEnd = closeTime + (closeBuffer || 0) / 60
  const totalWindow = staffEnd - staffStart
  if (totalWindow <= 0 || !shifts?.length) {
    return <div className="h-5 rounded bg-gray-100" />
  }
  return (
    <div className="relative h-5 rounded bg-gray-100 overflow-hidden">
      {shifts.map((shift) => {
        const left = ((shift.start - staffStart) / totalWindow) * 100
        const width = (shift.length / totalWindow) * 100
        const c = getShiftBlockColor(shift.length, shiftLengths)
        return (
          <div
            key={shift.id}
            className="absolute top-0.5 bottom-0.5 rounded-sm"
            style={{
              left: `${Math.max(0, left)}%`,
              width: `${Math.min(width, 100 - Math.max(0, left))}%`,
              background: c.fill,
              opacity: 0.7,
            }}
          />
        )
      })}
    </div>
  )
}
