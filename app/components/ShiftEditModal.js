'use client'

import { useState, useEffect } from 'react'

// Parse time string "HH:MM" to minutes since midnight
const parseTime = (timeStr) => {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export default function ShiftEditModal({ 
  isOpen, 
  onClose, 
  shiftData,
  allStaff,
  onReassign,
  onRemove,
  onSwap,
  rota
}) {
  const [selectedStaff, setSelectedStaff] = useState('')
  const [swapMode, setSwapMode] = useState(false)
  const [swapTarget, setSwapTarget] = useState(null)

  useEffect(() => {
    if (isOpen && shiftData) {
      setSelectedStaff('')
      setSwapMode(false)
      setSwapTarget(null)
    }
  }, [isOpen, shiftData])

  // Check if a staff member is available for a specific shift time on a given day
  const isStaffAvailableForShift = (staff, day, shiftStart, shiftEnd) => {
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
        if (dayAvail.start && dayAvail.end && shiftStart && shiftEnd) {
          const availStart = parseTime(dayAvail.start)
          const availEnd = parseTime(dayAvail.end)
          const sStart = parseTime(shiftStart)
          let sEnd = parseTime(shiftEnd)
          let aEnd = availEnd

          if (sEnd <= sStart) sEnd += 1440
          if (aEnd <= availStart) aEnd += 1440

          if (sStart < availStart || sEnd > aEnd) return false
        }
        return true
      }

      // Legacy AM/PM format
      if ('AM' in dayAvail || 'PM' in dayAvail) {
        if (shiftStart) {
          const startMins = parseTime(shiftStart)
          const isMorning = startMins < 12 * 60
          if (isMorning) return dayAvail.AM !== false
          return dayAvail.PM !== false
        }
        return dayAvail.AM !== false || dayAvail.PM !== false
      }
    }

    return true
  }

  // Get unavailability reason for display
  const getUnavailabilityReason = (staff, day) => {
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

  // Check if a staff member is already working on this day
  const isStaffBusy = (staffName) => {
    if (!rota?.schedule) return false
    return rota.schedule.some(shift => 
      shift.day === shiftData?.day && 
      (shift.week || 1) === shiftData?.week &&
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

  // Get shift start/end times from shiftData.time (format "HH:MM-HH:MM")
  const getShiftTimes = () => {
    if (!shiftData?.time) return { start: null, end: null }
    const parts = shiftData.time.split('-')
    return { start: parts[0]?.trim(), end: parts[1]?.trim() }
  }

  // Get all staff with availability status for reassignment
  const getAllStaffWithStatus = () => {
    if (!shiftData || !allStaff) return []
    const { start, end } = getShiftTimes()

    return allStaff
      .filter(staff => staff.name !== shiftData.staffName) // Exclude current person
      .map(staff => {
        const available = isStaffAvailableForShift(staff, shiftData.day, start, end)
        const reason = !available ? getUnavailabilityReason(staff, shiftData.day) : null
        return { ...staff, isAvailable: available, unavailabilityReason: reason }
      })
  }

  const allStaffWithStatus = getAllStaffWithStatus()
  const availableStaffList = allStaffWithStatus.filter(s => s.isAvailable)
  const unavailableStaffList = allStaffWithStatus.filter(s => !s.isAvailable)

  // Get other shifts that could be swapped with this one
  const getSwappableShifts = () => {
    if (!rota || !rota.schedule || !shiftData) return []
    
    const swappable = []
    const currentWeek = shiftData.week
    
    rota.schedule.forEach(shift => {
      if (shift.week === currentWeek && shift.assigned_staff) {
        shift.assigned_staff.forEach(staffName => {
          if (staffName === shiftData.staffName && 
              shift.day === shiftData.day && 
              shift.shift_name === shiftData.shiftName) {
            return
          }
          
          swappable.push({
            staffName,
            day: shift.day,
            shiftName: shift.shift_name,
            time: shift.time,
            week: shift.week
          })
        })
      }
    })
    
    return swappable
  }

  const handleReassign = () => {
    if (!selectedStaff) {
      alert('Please select a staff member')
      return
    }
    onReassign(shiftData, selectedStaff)
    onClose()
  }

  const handleRemove = () => {
    if (confirm(`Remove ${shiftData.staffName} from this shift?`)) {
      onRemove(shiftData)
      onClose()
    }
  }

  const handleSwap = () => {
    if (!swapTarget) {
      alert('Please select a shift to swap with')
      return
    }
    onSwap(shiftData, swapTarget)
    onClose()
  }

  if (!isOpen || !shiftData) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 font-cal">Edit Shift</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Assignment Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {shiftData.staffName.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{shiftData.staffName}</p>
              <p className="text-sm text-gray-600">
                {shiftData.day} • {shiftData.shiftName}
              </p>
              <p className="text-xs text-gray-500">
                {shiftData.time} • Week {shiftData.week}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSwapMode(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              !swapMode 
                ? 'bg-pink-100 text-pink-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Reassign
          </button>
          <button
            onClick={() => setSwapMode(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              swapMode 
                ? 'bg-pink-100 text-pink-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Swap
          </button>
        </div>

        {/* Reassign Mode */}
        {!swapMode && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reassign to
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
                  No other staff available for this shift
                </p>
              )}

              {/* Unavailable staff */}
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

            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                className="flex-1 px-4 py-3 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-semibold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
              <button
                onClick={handleReassign}
                disabled={!selectedStaff}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedStaff
                    ? 'text-white hover:shadow-lg hover:shadow-pink-500/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                style={selectedStaff ? { background: '#FF1F7D' } : {}}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Reassign
              </button>
            </div>
          </div>
        )}

        {/* Swap Mode */}
        {swapMode && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Swap with
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {getSwappableShifts().length > 0 ? (
                  getSwappableShifts().map((shift, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSwapTarget(shift)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        swapTarget && 
                        swapTarget.staffName === shift.staffName && 
                        swapTarget.day === shift.day &&
                        swapTarget.shiftName === shift.shiftName
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{shift.staffName}</p>
                      <p className="text-sm text-gray-600">
                        {shift.day} • {shift.shiftName} • {shift.time}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    No other shifts available to swap in Week {shiftData.week}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleSwap}
              disabled={!swapTarget}
              className={`w-full px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                swapTarget
                  ? 'text-white hover:shadow-lg hover:shadow-pink-500/25'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              style={swapTarget ? { background: '#FF1F7D' } : {}}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Swap Shifts
            </button>
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}