'use client'

import { useState } from 'react'

export default function UncoveredShiftsPanel({
  rota,
  shiftPatterns,
  weekCount,
  onAddShiftToRota,
  onPostToPickupBoard
}) {
  const [expanded, setExpanded] = useState(false)

  if (!rota?.schedule || !shiftPatterns || shiftPatterns.length === 0) return null

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Calculate uncovered shifts across all weeks
  const uncoveredShifts = []

  for (let weekNum = 1; weekNum <= weekCount; weekNum++) {
    dayNames.forEach(day => {
      // Get patterns that should run on this day
      const patternsForDay = shiftPatterns.filter(p => p.day_of_week === day)

      // Group patterns by name+time to get total staff required
      const patternGroups = {}
      patternsForDay.forEach(p => {
        const key = `${p.shift_name}-${p.start_time}-${p.end_time}`
        if (!patternGroups[key]) {
          patternGroups[key] = {
            shift_name: p.shift_name,
            start_time: p.start_time,
            end_time: p.end_time,
            staff_required: p.staff_required || 1,
            day
          }
        }
      })

      // Check each pattern against what's in the rota
      Object.values(patternGroups).forEach(pattern => {
        const time = `${pattern.start_time}-${pattern.end_time}`

        // Find matching shift in rota
        const rotaShift = rota.schedule.find(s =>
          s.day === day &&
          (s.week || 1) === weekNum &&
          s.shift_name === pattern.shift_name
        )

        const assignedCount = rotaShift?.assigned_staff?.length || 0
        const gap = pattern.staff_required - assignedCount

        if (gap > 0) {
          uncoveredShifts.push({
            day,
            weekNum,
            shiftName: pattern.shift_name,
            time,
            staffRequired: pattern.staff_required,
            assignedCount,
            gap
          })
        }
      })
    })
  }

  if (uncoveredShifts.length === 0) return null

  const totalGaps = uncoveredShifts.reduce((sum, s) => sum + s.gap, 0)

  return (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden no-print">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-amber-900">
              {totalGaps} uncovered shift{totalGaps !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700">
              {uncoveredShifts.length} pattern{uncoveredShifts.length !== 1 ? 's' : ''} need{uncoveredShifts.length === 1 ? 's' : ''} additional staff
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-amber-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-4 space-y-3">
          {uncoveredShifts.map((shift, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-4 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{shift.shiftName}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">{shift.day}</span>
                  {weekCount > 1 && (
                    <>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">Week {shift.weekNum}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {shift.time} — {shift.assignedCount}/{shift.staffRequired} staff assigned
                  <span className="text-amber-600 font-medium"> (need {shift.gap} more)</span>
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => onAddShiftToRota(shift)}
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-all text-white hover:shadow-md"
                  style={{ background: '#FF1F7D' }}
                >
                  + Assign Staff
                </button>
                {onPostToPickupBoard && (
                  <button
                    onClick={() => onPostToPickupBoard(shift)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    Post to Board
                  </button>
                )}
              </div>
            </div>
          ))}

          <p className="text-xs text-amber-600 pt-2">
            Uncovered shifts are based on your shift patterns in Workspace. You can leave them unfilled to save costs.
          </p>
        </div>
      )}
    </div>
  )
}