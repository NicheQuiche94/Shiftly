'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { getBlockColor, getShiftBlockColor, formatTime } from './shift-constants'

const PX_PER_HOUR = 56
const SNAP_HOURS = 0.25 // 15-minute snapping

// Assign columns based on overlap. Each block gets a column that avoids
// overlapping with other blocks in the same column.
function assignColumns(shifts) {
  const sorted = [...shifts].map((s, i) => ({ ...s, _origIdx: i })).sort((a, b) => a.start - b.start)
  const cols = []
  sorted.forEach(s => {
    let placed = false
    for (let c = 0; c < cols.length; c++) {
      const last = cols[c][cols[c].length - 1]
      if (s.start >= last.start + last.length - 0.01) {
        cols[c].push(s); s._col = c; placed = true; break
      }
    }
    if (!placed) { s._col = cols.length; cols.push([s]) }
  })
  const colMap = {}
  sorted.forEach(s => { colMap[s.id] = s._col })
  return { numCols: Math.max(1, cols.length), colMap }
}

function DraggableBlock({
  shift, index, staffWindowStart, staffWindowEnd, shiftLengths,
  colWidth, colOffset, onDragEnd,
  onCycle, onHeadcount, onRemove, canRemove, openTime, closeTime, totalHeight,
}) {
  // Use shift-length-based colour instead of index-based
  const c = getShiftBlockColor(shift.length, shiftLengths)
  const top = (shift.start - staffWindowStart) * PX_PER_HOUR
  const h = shift.length * PX_PER_HOUR
  const blockH = Math.min(h, totalHeight - Math.max(0, top)) - 2

  const isOpen = shift.start <= openTime
  const isClose = shift.start + shift.length >= closeTime

  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return
    e.preventDefault()
    const startY = e.clientY
    const startVal = shift.start
    setDragging(true)

    const handleMove = (ev) => {
      const deltaY = ev.clientY - startY
      const deltaHours = deltaY / PX_PER_HOUR
      let newStart = Math.round((startVal + deltaHours) / SNAP_HOURS) * SNAP_HOURS
      newStart = Math.max(staffWindowStart, Math.min(staffWindowEnd - shift.length, newStart))
      setDragOffset((newStart - startVal) * PX_PER_HOUR)
    }

    const handleUp = (ev) => {
      const deltaY = ev.clientY - startY
      const deltaHours = deltaY / PX_PER_HOUR
      let newStart = Math.round((startVal + deltaHours) / SNAP_HOURS) * SNAP_HOURS
      newStart = Math.max(staffWindowStart, Math.min(staffWindowEnd - shift.length, newStart))
      setDragging(false)
      setDragOffset(0)
      onDragEnd(newStart)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        top: Math.max(0, top) + dragOffset,
        left: colOffset,
        width: colWidth - 6,
        height: blockH,
        background: c.bg,
        borderLeft: `4px solid ${c.border}`,
        borderRadius: 10,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dragging ? 0.85 : 1,
        zIndex: dragging ? 50 : 1,
        transition: dragging ? 'none' : 'box-shadow 0.15s, opacity 0.15s',
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs font-bold" style={{ color: c.text }}>{Math.round(shift.length)}h shift</div>
          <div className="text-[10px] mt-0.5" style={{ color: c.text, opacity: 0.7 }}>
            {formatTime(shift.start)} – {formatTime(shift.start + shift.length)}
          </div>
        </div>
        <div className="flex gap-1 items-center flex-shrink-0">
          {(isOpen || isClose) && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#D97706' }}>
              🔑 {isOpen && isClose ? 'O+C' : isOpen ? 'OPEN' : 'CLOSE'}
            </span>
          )}
          {canRemove && (
            <button onClick={() => onRemove()} className="w-5 h-5 rounded bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 flex items-center justify-center text-xs transition-colors">×</button>
          )}
        </div>
      </div>

      {blockH > 70 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => onCycle()}
            className="px-2 py-0.5 rounded text-[10px] font-bold border transition-colors hover:shadow-sm"
            style={{ background: c.bg, borderColor: `${c.border}40`, color: c.text }}
          >
            {Math.round(shift.length)}h ⟳
          </button>
          <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 px-0.5 py-0.5" style={{ background: '#F9FAFB' }}>
            <button onClick={() => onHeadcount(-1)} className="w-6 h-6 rounded text-gray-500 hover:bg-white flex items-center justify-center text-sm font-semibold">−</button>
            <span className="w-5 text-center text-xs font-bold text-gray-900">{shift.headcount}</span>
            <button onClick={() => onHeadcount(1)} className="w-6 h-6 rounded text-gray-500 hover:bg-white flex items-center justify-center text-sm font-semibold">+</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TimelineBuilder({
  shifts, shiftLengths, openTime, closeTime, openBuffer = 0, closeBuffer = 0, onChange, readOnly = false,
}) {
  const staffWindowStart = openTime - openBuffer / 60
  const staffWindowEnd = closeTime + closeBuffer / 60
  const totalHours = staffWindowEnd - staffWindowStart
  const timelineHeight = totalHours * PX_PER_HOUR
  const defaultLen = shiftLengths[0] || 8

  const shiftIds = shifts.map(s => s.id).join(',')
  const { numCols, colMap } = useMemo(() => assignColumns(shifts), [shiftIds])

  const canvasWidth = Math.max(320, numCols * 160 + 12)
  const colWidth = (canvasWidth - 12) / numCols

  const handleBlockDragEnd = useCallback((idx, newStart) => {
    const updated = [...shifts]
    updated[idx] = { ...updated[idx], start: newStart }
    onChange(updated)
  }, [shifts, onChange])

  const cycleLength = (idx) => {
    const shift = shifts[idx]
    const curIdx = shiftLengths.indexOf(
      shiftLengths.reduce((p, c) => Math.abs(c - shift.length) < Math.abs(p - shift.length) ? c : p)
    )
    const nextLen = shiftLengths[(curIdx + 1) % shiftLengths.length]
    const touchesClose = shift.start + shift.length >= closeTime
    let newStart = shift.start
    let newLen = nextLen

    if (touchesClose) {
      newStart = staffWindowEnd - nextLen
      if (newStart < staffWindowStart) newStart = staffWindowStart
      newLen = staffWindowEnd - newStart
    } else {
      if (shift.start + nextLen > staffWindowEnd) {
        newStart = staffWindowEnd - nextLen
        if (newStart < staffWindowStart) newStart = staffWindowStart
      }
    }

    const updated = [...shifts]
    updated[idx] = { ...shift, start: newStart, length: newLen }
    onChange(updated)
  }

  const setHeadcount = (idx, delta) => {
    const updated = [...shifts]
    updated[idx] = { ...updated[idx], headcount: Math.max(1, Math.min(10, updated[idx].headcount + delta)) }
    onChange(updated)
  }

  const removeShift = (idx) => {
    if (shifts.length > 1) onChange(shifts.filter((_, i) => i !== idx))
  }

  const addShift = () => {
    const len = defaultLen
    let best = staffWindowStart
    const sorted = [...shifts].sort((a, b) => a.start - b.start)
    for (const s of sorted) {
      if (best + len <= s.start) break
      best = Math.max(best, s.start + s.length)
    }
    if (best + len > staffWindowEnd) best = staffWindowStart

    onChange([...shifts, {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      start: best,
      length: len,
      headcount: 1,
    }])
  }

  // Stats
  const totalStaffHours = Math.round(shifts.reduce((a, s) => a + s.length * s.headcount, 0))
  const totalHeadcount = shifts.reduce((a, s) => a + s.headcount, 0)
  const keyholderShifts = shifts.filter(s => s.start <= openTime || s.start + s.length >= closeTime).length

  const hasGaps = useMemo(() => {
    const sorted = [...shifts].sort((a, b) => a.start - b.start)
    let covered = staffWindowStart
    for (const s of sorted) {
      if (s.start > covered + 0.1) return true
      covered = Math.max(covered, s.start + s.length)
    }
    return covered < staffWindowEnd - 0.1
  }, [shifts, staffWindowStart, staffWindowEnd])

  return (
    <div>
      <div className="flex gap-7">
        <div className="flex-shrink-0">
          <div className="relative" style={{ marginLeft: 56 }}>
            {Array.from({ length: Math.ceil(totalHours) + 1 }, (_, i) => {
              const hr = staffWindowStart + i
              if (hr > staffWindowEnd) return null
              return <div key={i} className="absolute text-[10px] text-gray-400 font-medium text-right" style={{ top: i * PX_PER_HOUR - 6, left: -56, width: 48 }}>{formatTime(hr)}</div>
            })}

            <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm" style={{ height: timelineHeight, width: canvasWidth, overflow: 'visible' }}>
              {Array.from({ length: Math.ceil(totalHours) + 1 }, (_, i) => (
                <div key={i} className="absolute left-0 right-0 h-px bg-gray-100" style={{ top: i * PX_PER_HOUR }} />
              ))}

              {openBuffer > 0 && (
                <div className="absolute left-0 right-0" style={{ top: 0, height: (openBuffer / 60) * PX_PER_HOUR, background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, #FEF3C7 3px, #FEF3C7 6px)', borderBottom: '1px dashed #F59E0B', borderRadius: '12px 12px 0 0' }} />
              )}
              {closeBuffer > 0 && (
                <div className="absolute left-0 right-0 bottom-0" style={{ height: (closeBuffer / 60) * PX_PER_HOUR, background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, #FEF3C7 3px, #FEF3C7 6px)', borderTop: '1px dashed #F59E0B', borderRadius: '0 0 12px 12px' }} />
              )}

              {shifts.map((shift, idx) => (
                <DraggableBlock
                  key={shift.id}
                  shift={shift}
                  index={idx}
                  staffWindowStart={staffWindowStart}
                  staffWindowEnd={staffWindowEnd}
                  shiftLengths={shiftLengths}
                  colWidth={colWidth}
                  colOffset={6 + (colMap[shift.id] || 0) * colWidth}
                  onDragEnd={(newStart) => handleBlockDragEnd(idx, newStart)}
                  onCycle={() => cycleLength(idx)}
                  onHeadcount={(d) => setHeadcount(idx, d)}
                  onRemove={() => removeShift(idx)}
                  canRemove={shifts.length > 1}
                  openTime={openTime}
                  closeTime={closeTime}
                  totalHeight={timelineHeight}
                />
              ))}
            </div>
          </div>

          {!readOnly && (
            <button onClick={addShift} className="mt-2.5 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-all" style={{ marginLeft: 56, width: canvasWidth }}>
              + Add shift block
            </button>
          )}
        </div>

        <div className="flex-1 min-w-[200px] self-start sticky top-5">
          <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm mb-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Summary</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="text-2xl font-bold text-gray-900">{shifts.length}</div>
                <div className="text-[11px] text-gray-500">shift blocks</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="text-2xl font-bold" style={{ color: '#EC4899' }}>{totalStaffHours}h</div>
                <div className="text-[11px] text-gray-500">staff-hours</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="text-2xl font-bold" style={{ color: '#10B981' }}>{totalHeadcount}</div>
                <div className="text-[11px] text-gray-500">headcount</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="text-2xl font-bold" style={{ color: '#F97316' }}>{keyholderShifts}</div>
                <div className="text-[11px] text-gray-500">keyholder shifts</div>
              </div>
            </div>
          </div>

          {hasGaps && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 mb-3">
              <p className="text-xs text-red-700 font-medium">⚠️ Uncovered time gaps in your staff window. Add more blocks or drag to fill.</p>
            </div>
          )}

          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 mb-2">SHIFT BLOCKS</div>
            {shifts.map((s, i) => {
              // Use shift-length-based colour here too
              const c = getShiftBlockColor(s.length, shiftLengths)
              return (
                <div key={s.id} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded" style={{ background: c.bg, border: `2px solid ${c.border}` }} />
                  <span className="text-xs text-gray-600 font-medium">{Math.round(s.length)}h · {formatTime(s.start)} – {formatTime(s.start + s.length)} · ×{s.headcount}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs">🔑</span>
              <span className="text-xs text-gray-600 font-medium">Keyholder required</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}