'use client'

import { useState, useEffect } from 'react'

// Parse time string "HH:MM" to minutes since midnight
const parseTime = (timeStr) => {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export default function AddShiftModal({
  isOpen,
  onClose,
  day,
  weekNum,
  shiftPatterns,
  allStaff,
  rota,
  onAddShift
}) {
  const [mode, setMode] = useState('pattern') // 'pattern' or 'custom'
  const [selectedPattern, setSelectedPattern] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState('')
  const [customShiftName, setCustomShiftName] = useState('')
  const [customStartTime, setCustomStartTime] = useState('')
  const [customEndTime, setCustomEndTime] = useState('')

  useEffect(() => {
    if (isOpen) {
      setMode('pattern')
      setSelectedPattern(null)
      setSelectedStaff('')
      setCustomShiftName('')
      setCustomStartTime('')
      setCustomEndTime('')
    }
  }, [isOpen, day, weekNum])

  if (!isOpen) return null

  // Get shift patterns that run on this day
  const patternsForDay = shiftPatterns.filter(p => p.day_of_week === day)

  // Get unique pattern groups (same name + time = one option)
  const uniquePatterns = []
  const seen = new Set()
  patternsForDay.forEach(p => {
    const key = `${p.shift_name}-${p.start_time}-${p.end_time}`
    if (!seen.has(key)) {
      seen.add(key)
      uniquePatterns.push(p)
    }
  })

  // Get the currently selected shift's time window
  const getSelectedShiftTimes = () => {
    if (mode === 'pattern' && selectedPattern) {
      return { start: selectedPattern.start_time, end: selectedPattern.end_time }
    }
    if (mode === 'custom' && customStartTime && customEndTime) {
      return { start: customStartTime, end: customEndTime }
    }
    return null
  }

  // Check if a staff member is available for a specific shift time on this day
  const isStaffAvailableForShift = (staff, shiftStart, shiftEnd) => {
    if (!staff.availability) return true

    let avail = staff.availability
    if (typeof avail === 'string') {
      try { avail = JSON.parse(avail) } catch { return true }
    }

    // Handle array format (legacy)
    if (Array.isArray(avail)) {
      const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day)
      return avail[dayIndex] !== false
    }

    if (typeof avail !== 'object') return true

    const dayAvail = avail[day]
    if (dayAvail === undefined || dayAvail === null) return true

    // Boolean format
    if (typeof dayAvail === 'boolean') return dayAvail

    if (typeof dayAvail === 'object') {
      // New time-window format: { available, start, end }
      if ('available' in dayAvail) {
        if (!dayAvail.available) return false
        // If they have specific hours set, check the shift fits within them
        if (dayAvail.start && dayAvail.end && shiftStart && shiftEnd) {
          const availStart = parseTime(dayAvail.start)
          const availEnd = parseTime(dayAvail.end)
          const sStart = parseTime(shiftStart)
          let sEnd = parseTime(shiftEnd)
          let aEnd = availEnd

          // Handle overnight shifts/availability
          if (sEnd <= sStart) sEnd += 1440
          if (aEnd <= availStart) aEnd += 1440

          // Shift must fit entirely within availability window
          if (sStart < availStart || sEnd > aEnd) return false
        }
        return true
      }

      // Legacy AM/PM format: { AM: bool, PM: bool }
      if ('AM' in dayAvail || 'PM' in dayAvail) {
        if (shiftStart) {
          const startMins = parseTime(shiftStart)
          const isMorning = startMins < 12 * 60
          if (isMorning) return dayAvail.AM !== false
          return dayAvail.PM !== false
        }
        // No shift time known yet, check if available at all
        return dayAvail.AM !== false || dayAvail.PM !== false
      }
    }

    return true
  }

  // Get staff who could work this shift
  const getAvailableStaff = () => {
    if (!allStaff) return []
    const shiftTimes = getSelectedShiftTimes()

    return allStaff.filter(staff => {
      return isStaffAvailableForShift(
        staff,
        shiftTimes?.start || null,
        shiftTimes?.end || null
      )
    })
  }

  const availableStaff = getAvailableStaff()

  // Check if a staff member is already working on this day
  const isStaffBusy = (staffName) => {
    if (!rota?.schedule) return false
    return rota.schedule.some(shift => 
      shift.day === day && 
      (shift.week || 1) === weekNum &&
      shift.assigned_staff?.includes(staffName)
    )
  }

  // Calculate total scheduled hours for a staff member across the rota
  const getScheduledHours = (staffName) => {
    if (!rota?.schedule) return 0
    let totalMinutes = 0
    rota.schedule.forEach(shift => {
      if (!shift.assigned_staff?.includes(staffName)) return
      if (!shift.time) return
      const [start, end] = shift.time.split('-')
      if (!start || !end) return
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      let mins = (eh * 60 + em) - (sh * 60 + sm)
      if (mins < 0) mins += 24 * 60
      totalMinutes += mins
    })
    return Math.round((totalMinutes / 60) * 10) / 10
  }

  // Get hours status for a staff member
  const getHoursStatus = (staff) => {
    const scheduled = getScheduledHours(staff.name)
    const maxHours = staff.max_hours || staff.contracted_hours || 48
    const remaining = maxHours - scheduled

    if (remaining <= 0) {
      return { label: 'At Max Hours', color: 'bg-red-100 text-red-700', canWork: false }
    }
    return { label: `${remaining}h available`, color: 'bg-green-100 text-green-700', canWork: true }
  }

  // Get unavailability reason for display
  const getUnavailabilityReason = (staff) => {
    if (!staff.availability) return null

    let avail = staff.availability
    if (typeof avail === 'string') {
      try { avail = JSON.parse(avail) } catch { return null }
    }

    if (typeof avail !== 'object' || Array.isArray(avail)) return null

    const dayAvail = avail[day]
    if (!dayAvail || typeof dayAvail !== 'object') return null

    if ('available' in dayAvail) {
      if (!dayAvail.available) return 'Unavailable this day'
      if (dayAvail.start && dayAvail.end) {
        return `Only available ${dayAvail.start} - ${dayAvail.end}`
      }
    }

    if ('AM' in dayAvail || 'PM' in dayAvail) {
      if (!dayAvail.AM && dayAvail.PM) return 'Only available PM'
      if (dayAvail.AM && !dayAvail.PM) return 'Only available AM'
      if (!dayAvail.AM && !dayAvail.PM) return 'Unavailable this day'
    }

    return null
  }

  const handleAdd = () => {
    let shiftName, time

    if (mode === 'pattern' && selectedPattern) {
      shiftName = selectedPattern.shift_name
      time = `${selectedPattern.start_time}-${selectedPattern.end_time}`
    } else if (mode === 'custom') {
      if (!customShiftName.trim() || !customStartTime || !customEndTime) {
        alert('Please fill in all custom shift fields')
        return
      }
      shiftName = customShiftName.trim()
      time = `${customStartTime}-${customEndTime}`
    } else {
      alert('Please select a shift pattern')
      return
    }

    if (!selectedStaff) {
      alert('Please select a staff member')
      return
    }

    onAddShift({
      day,
      week: weekNum,
      shiftName,
      time,
      staffName: selectedStaff
    })

    onClose()
  }

  // Get all staff for display (available + unavailable)
  const getAllStaffWithStatus = () => {
    if (!allStaff) return []
    const shiftTimes = getSelectedShiftTimes()

    return allStaff.map(staff => {
      const available = isStaffAvailableForShift(
        staff,
        shiftTimes?.start || null,
        shiftTimes?.end || null
      )
      const reason = !available ? getUnavailabilityReason(staff) : null
      return { ...staff, isAvailable: available, unavailabilityReason: reason }
    })
  }

  const allStaffWithStatus = getAllStaffWithStatus()
  const availableStaffList = allStaffWithStatus.filter(s => s.isAvailable)
  const unavailableStaffList = allStaffWithStatus.filter(s => !s.isAvailable)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 font-cal">Add Shift</h3>
            <p className="text-sm text-gray-500 mt-1">{day} • Week {weekNum}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('pattern')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              mode === 'pattern'
                ? 'bg-pink-100 text-pink-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            From Shift Patterns
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              mode === 'custom'
                ? 'bg-pink-100 text-pink-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Custom Shift
          </button>
        </div>

        {/* Pattern Selection */}
        {mode === 'pattern' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select shift pattern
            </label>
            {uniquePatterns.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniquePatterns.map((pattern, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedPattern(pattern)
                      // Clear staff selection when shift changes (availability may differ)
                      setSelectedStaff('')
                    }}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      selectedPattern?.shift_name === pattern.shift_name &&
                      selectedPattern?.start_time === pattern.start_time
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{pattern.shift_name}</p>
                    <p className="text-sm text-gray-600">
                      {pattern.start_time} - {pattern.end_time}
                      {pattern.staff_required > 1 && (
                        <span className="text-gray-400"> • {pattern.staff_required} staff needed</span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">
                <p className="font-medium text-gray-700 mb-1">No shift patterns for {day}</p>
                <p>Switch to "Custom Shift" to add one manually</p>
              </div>
            )}
          </div>
        )}

        {/* Custom Shift */}
        {mode === 'custom' && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Shift name
              </label>
              <input
                type="text"
                value={customShiftName}
                onChange={(e) => setCustomShiftName(e.target.value)}
                placeholder="e.g., Event Cover"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start time
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={customStartTime.split(':')[0] || ''}
                    onChange={(e) => {
                      const mins = customStartTime.split(':')[1] || '00'
                      setCustomStartTime(`${e.target.value}:${mins}`)
                      setSelectedStaff('') // Reset staff when time changes
                    }}
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white text-center font-medium appearance-none"
                  >
                    <option value="" disabled>HH</option>
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-gray-400 font-bold text-lg">:</span>
                  <select
                    value={customStartTime.split(':')[1] || ''}
                    onChange={(e) => {
                      const hrs = customStartTime.split(':')[0] || '00'
                      setCustomStartTime(`${hrs}:${e.target.value}`)
                      setSelectedStaff('')
                    }}
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white text-center font-medium appearance-none"
                  >
                    <option value="" disabled>MM</option>
                    {['00', '15', '30', '45'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End time
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={customEndTime.split(':')[0] || ''}
                    onChange={(e) => {
                      const mins = customEndTime.split(':')[1] || '00'
                      setCustomEndTime(`${e.target.value}:${mins}`)
                      setSelectedStaff('')
                    }}
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white text-center font-medium appearance-none"
                  >
                    <option value="" disabled>HH</option>
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-gray-400 font-bold text-lg">:</span>
                  <select
                    value={customEndTime.split(':')[1] || ''}
                    onChange={(e) => {
                      const hrs = customEndTime.split(':')[0] || '00'
                      setCustomEndTime(`${hrs}:${e.target.value}`)
                      setSelectedStaff('')
                    }}
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white text-center font-medium appearance-none"
                  >
                    <option value="" disabled>MM</option>
                    {['00', '15', '30', '45'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Assign to
          </label>

          {/* Available staff */}
          {availableStaffList.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableStaffList.map((staff, idx) => {
                const busy = isStaffBusy(staff.name)
                const hoursStatus = getHoursStatus(staff)
                return (
                  <button
                    key={idx}
                    onClick={() => !hoursStatus.canWork ? null : setSelectedStaff(staff.name)}
                    disabled={!hoursStatus.canWork}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      !hoursStatus.canWork
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : selectedStaff === staff.name
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{staff.name}</p>
                        <p className="text-xs text-gray-500">
                          {staff.contracted_hours}h contracted
                          {staff.max_hours && staff.max_hours !== staff.contracted_hours && 
                            ` • ${staff.max_hours}h max`
                          }
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${hoursStatus.color}`}>
                          {hoursStatus.label}
                        </span>
                        {busy && hoursStatus.canWork && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                            Already on shift
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 text-center">
              No staff available for this shift
            </p>
          )}

          {/* Unavailable staff (shown greyed out with reason) */}
          {unavailableStaffList.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Unavailable
              </p>
              <div className="space-y-1.5">
                {unavailableStaffList.map((staff, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-400">{staff.name}</p>
                      <span className="text-xs text-gray-400">
                        {staff.unavailabilityReason || 'Not available'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={
              (!selectedPattern && mode === 'pattern') ||
              (mode === 'custom' && (!customShiftName || !customStartTime || !customEndTime)) ||
              !selectedStaff
            }
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              selectedStaff && (selectedPattern || (mode === 'custom' && customShiftName && customStartTime && customEndTime))
                ? 'text-white hover:shadow-lg hover:shadow-pink-500/25'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            style={
              selectedStaff && (selectedPattern || (mode === 'custom' && customShiftName && customStartTime && customEndTime))
                ? { background: '#FF1F7D' }
                : {}
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Shift
          </button>
        </div>
      </div>
    </div>
  )
}