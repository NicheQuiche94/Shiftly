'use client'

import { useState, useEffect } from 'react'

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
  const [availableForSwap, setAvailableForSwap] = useState([])

  useEffect(() => {
    if (isOpen && shiftData) {
      setSelectedStaff('')
      setSwapMode(false)
      setSwapTarget(null)
    }
  }, [isOpen, shiftData])

  // Get staff members who could work this shift (available on this day)
  const getAvailableStaff = () => {
    if (!shiftData || !allStaff) return []
    
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(shiftData.day)
    
    return allStaff.filter(staff => {
      // Don't include current person
      if (staff.name === shiftData.staffName) return false
      
      // Check availability
      if (staff.availability && Array.isArray(staff.availability)) {
        return staff.availability[dayIndex] === true
      }
      return true // If no availability data, assume available
    })
  }

  // Get other shifts that could be swapped with this one
  const getSwappableShifts = () => {
    if (!rota || !rota.schedule || !shiftData) return []
    
    const swappable = []
    const currentWeek = shiftData.week
    
    rota.schedule.forEach(shift => {
      if (shift.week === currentWeek && shift.assigned_staff) {
        shift.assigned_staff.forEach(staffName => {
          // Don't include the current assignment
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

  const availableStaff = getAvailableStaff()

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
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
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
              {availableStaff.length > 0 ? (
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Select staff member...</option>
                  {availableStaff.map((staff, idx) => (
                    <option key={idx} value={staff.name}>
                      {staff.name} ({staff.contracted_hours}h contracted)
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                  No other staff available on {shiftData.day}
                </p>
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
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:shadow-lg hover:shadow-pink-500/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
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
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:shadow-lg hover:shadow-pink-500/25'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
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