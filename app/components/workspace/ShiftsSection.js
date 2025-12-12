'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function ShiftsSection({ selectedTeamId }) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [selectedShifts, setSelectedShifts] = useState(new Set())
  const [formData, setFormData] = useState({
    shift_name: '',
    day_of_week: [],
    start_time: '',
    end_time: '',
    staff_required: ''
  })

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Common shift time presets
  const timePresets = [
    { label: 'Morning', start: '06:00', end: '14:00' },
    { label: 'Day', start: '09:00', end: '17:00' },
    { label: 'Afternoon', start: '14:00', end: '22:00' },
    { label: 'Evening', start: '17:00', end: '23:00' },
    { label: 'Night', start: '22:00', end: '06:00' },
  ]

  // Fetch shifts with React Query
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', selectedTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/shifts?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load shifts')
      return response.json()
    },
    enabled: !!selectedTeamId
  })

  // Fetch staff for hours comparison
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', selectedTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load staff')
      return response.json()
    },
    enabled: !!selectedTeamId
  })

  // Add shift mutation
  const addShiftMutation = useMutation({
    mutationFn: async (shiftData) => {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData)
      })
      if (!response.ok) throw new Error('Failed to add shift')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedTeamId] })
    }
  })

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId) => {
      const response = await fetch(`/api/shifts?id=${shiftId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete shift')
      return shiftId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedTeamId] })
    }
  })

  // Calculate hours (memoized)
  const { shiftHours, staffHours, hoursMatch, hoursDiff } = useMemo(() => {
    let totalShiftHours = 0
    shifts.forEach(shift => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number)
      const [endHour, endMin] = shift.end_time.split(':').map(Number)
      let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
      if (minutes < 0) minutes += 24 * 60
      const hours = minutes / 60
      totalShiftHours += hours * (shift.staff_required || 1)
    })

    const totalStaffHours = staff.reduce((sum, member) => sum + (member.contracted_hours || 0), 0)
    const match = Math.abs(totalStaffHours - totalShiftHours) < 0.5
    const diff = totalShiftHours - totalStaffHours

    return {
      shiftHours: totalShiftHours,
      staffHours: totalStaffHours,
      hoursMatch: match,
      hoursDiff: diff
    }
  }, [shifts, staff])

  // Group shifts (memoized)
  const grouped = useMemo(() => {
    const groups = {}
    
    shifts.forEach(shift => {
      const key = `${shift.shift_name}-${shift.start_time}-${shift.end_time}-${shift.staff_required}`
      
      if (!groups[key]) {
        groups[key] = {
          key,
          shift_name: shift.shift_name,
          start_time: shift.start_time,
          end_time: shift.end_time,
          staff_required: shift.staff_required,
          shifts: []
        }
      }
      
      groups[key].shifts.push(shift)
    })
    
    return Object.values(groups)
  }, [shifts])

  const formatDays = (shifts) => {
    const days = shifts.map(s => s.day_of_week)
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
    
    if (sortedDays.length === 7) return 'Every day'
    
    return `${sortedDays.length} days`
  }

  const sortDays = (shifts) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return [...shifts].sort((a, b) => 
      dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
    )
  }

  const toggleExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  const toggleSelectShift = (groupKey) => {
    const newSelected = new Set(selectedShifts)
    if (newSelected.has(groupKey)) {
      newSelected.delete(groupKey)
    } else {
      newSelected.add(groupKey)
    }
    setSelectedShifts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedShifts.size === grouped.length) {
      setSelectedShifts(new Set())
    } else {
      setSelectedShifts(new Set(grouped.map(g => g.key)))
    }
  }

  const openAddModal = () => {
    setEditingShift(null)
    setEditingGroup(null)
    setFormData({
      shift_name: '',
      day_of_week: [],
      start_time: '',
      end_time: '',
      staff_required: ''
    })
    setShowModal(true)
  }

  const openEditGroupModal = (group) => {
    setEditingShift(null)
    setEditingGroup(group)
    setFormData({
      shift_name: group.shift_name,
      day_of_week: group.shifts.map(s => s.day_of_week),
      start_time: group.start_time,
      end_time: group.end_time,
      staff_required: group.staff_required.toString()
    })
    setShowModal(true)
  }

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      start_time: preset.start,
      end_time: preset.end
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.day_of_week.length === 0) {
      alert('Please select at least one day')
      return
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(formData.start_time) || !timeRegex.test(formData.end_time)) {
      alert('Please enter valid times in HH:MM format')
      return
    }
    
    try {
      if (editingGroup) {
        // Delete old shifts first
        await Promise.all(
          editingGroup.shifts.map(s => deleteShiftMutation.mutateAsync(s.id))
        )
      }

      // Add new shifts for each selected day
      await Promise.all(
        formData.day_of_week.map(day => 
          addShiftMutation.mutateAsync({
            team_id: selectedTeamId,
            shift_name: formData.shift_name,
            day_of_week: day,
            start_time: formData.start_time,
            end_time: formData.end_time,
            staff_required: parseInt(formData.staff_required)
          })
        )
      )

      setFormData({
        shift_name: '',
        day_of_week: [],
        start_time: '',
        end_time: '',
        staff_required: ''
      })
      setEditingShift(null)
      setEditingGroup(null)
      setShowModal(false)
    } catch (error) {
      console.error('Error saving shift:', error)
      alert('Failed to save shift. Please try again.')
    }
  }

  const handleDeleteGroup = async (shifts) => {
    if (!confirm(`Delete this shift pattern (${shifts.length} days)?`)) return
    
    try {
      await Promise.all(shifts.map(s => deleteShiftMutation.mutateAsync(s.id)))
    } catch (error) {
      console.error('Error deleting shifts:', error)
      alert('Failed to delete shift pattern. Please try again.')
    }
  }

  const handleDeleteSelected = async () => {
    const selectedGroups = grouped.filter(g => selectedShifts.has(g.key))
    const allShifts = selectedGroups.flatMap(g => g.shifts)
    
    if (!confirm(`Delete ${selectedGroups.length} shift pattern(s)?`)) return
    
    try {
      await Promise.all(allShifts.map(s => deleteShiftMutation.mutateAsync(s.id)))
      setSelectedShifts(new Set())
    } catch (error) {
      console.error('Error deleting shifts:', error)
      alert('Failed to delete shifts. Please try again.')
    }
  }

  const toggleDay = (day) => {
    if (formData.day_of_week.includes(day)) {
      setFormData({
        ...formData,
        day_of_week: formData.day_of_week.filter(d => d !== day)
      })
    } else {
      setFormData({
        ...formData,
        day_of_week: [...formData.day_of_week, day]
      })
    }
  }

  const selectAllDays = () => {
    setFormData(prev => ({
      ...prev,
      day_of_week: daysOfWeek
    }))
  }

  const deselectAllDays = () => {
    setFormData(prev => ({
      ...prev,
      day_of_week: []
    }))
  }

  // Format time input as user types
  const handleTimeInput = (field, value) => {
    let cleaned = value.replace(/[^\d]/g, '')
    
    if (cleaned.length >= 2) {
      cleaned = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4)
    }
    
    cleaned = cleaned.slice(0, 5)
    
    setFormData(prev => ({
      ...prev,
      [field]: cleaned
    }))
  }

  const loading = shiftsLoading

  return (
    <div>
      {/* Header with Hours Comparison */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shift Patterns</h2>
          <p className="text-sm text-gray-600 mt-1">Define your recurring shift templates</p>
        </div>
        
        {shifts.length > 0 && (
          <div className={`rounded-lg border px-4 sm:px-5 py-2 sm:py-3 ${
            hoursMatch 
              ? 'bg-green-50 border-green-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-0.5">Shifts</div>
                <div className={`text-lg sm:text-xl font-bold ${hoursMatch ? 'text-green-700' : 'text-gray-900'}`}>
                  {shiftHours.toFixed(0)}h
                </div>
              </div>
              
              <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${
                hoursMatch ? 'bg-green-200' : 'bg-amber-200'
              }`}>
                {hoursMatch ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-0.5">Staff</div>
                <div className={`text-lg sm:text-xl font-bold ${hoursMatch ? 'text-green-700' : 'text-gray-900'}`}>
                  {staffHours}h
                </div>
              </div>
            </div>
            
            {!hoursMatch && (
              <div className="text-xs text-amber-700 mt-1 text-center">
                {hoursDiff > 0 
                  ? `${hoursDiff.toFixed(0)}h more shifts than staff`
                  : `${Math.abs(hoursDiff).toFixed(0)}h more staff than shifts`
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center">
          {selectedShifts.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete ({selectedShifts.size})
            </button>
          )}
        </div>
        
        <button 
          onClick={openAddModal}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all text-sm"
        >
          + Add Shift
        </button>
      </div>

      {/* Shifts List */}
      <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
        {/* Desktop Table Header - Hidden on mobile */}
        <div className="hidden md:block bg-gray-50/50 border-b border-gray-200/60">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedShifts.size === grouped.length && grouped.length > 0}
                onChange={toggleSelectAll}
                disabled={grouped.length === 0}
                className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2 disabled:opacity-50"
              />
            </div>
            <div className="col-span-3">Shift Name</div>
            <div className="col-span-3">Days</div>
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Staff Required</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>

        {/* Content */}
        <div className="divide-y divide-gray-200/60">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : grouped.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-1">No shift patterns yet</p>
              <p className="text-sm text-gray-500">Create your first shift pattern to get started</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.key}>
                {/* Mobile Card View */}
                <div className="md:hidden p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedShifts.has(group.key)}
                        onChange={() => toggleSelectShift(group.key)}
                        className="w-4 h-4 mt-1 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                      />
                      <div>
                        <button
                          onClick={() => toggleExpand(group.key)}
                          className="flex items-center space-x-1.5 group"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              expandedGroups[group.key] ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-medium text-gray-900 group-hover:text-pink-600">
                            {group.shift_name}
                          </span>
                        </button>
                        <div className="flex flex-wrap items-center gap-2 mt-2 ml-5">
                          <span className="text-sm text-gray-600">
                            {group.start_time} - {group.end_time}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-600">{formatDays(group.shifts)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
                            {group.staff_required} staff
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => openEditGroupModal(group)}
                        className="p-2 text-gray-600 hover:text-pink-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteGroup(group.shifts)}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Days - Mobile */}
                  {expandedGroups[group.key] && (
                    <div className="mt-3 ml-7 pl-5 border-l-2 border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Active Days
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sortDays(group.shifts).map((shift) => (
                          <span
                            key={shift.id}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {shift.day_of_week.slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Table Row */}
                <div className="hidden md:block">
                  <div 
                    className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors ${
                      expandedGroups[group.key] ? 'bg-gray-50/30' : ''
                    }`}
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedShifts.has(group.key)}
                        onChange={() => toggleSelectShift(group.key)}
                        className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                      />
                    </div>
                    <div className="col-span-3 flex items-center">
                      <button
                        onClick={() => toggleExpand(group.key)}
                        className="flex items-center space-x-2 group"
                      >
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedGroups[group.key] ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-gray-900 group-hover:text-pink-600 transition-colors">
                          {group.shift_name}
                        </span>
                      </button>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="text-sm text-gray-600">
                        {formatDays(group.shifts)}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-900">
                        {group.start_time} - {group.end_time}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
                        {group.staff_required} staff
                      </span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => openEditGroupModal(group)}
                        className="text-gray-600 hover:text-pink-600 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteGroup(group.shifts)}
                        className="text-gray-600 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Days View - Desktop */}
                  {expandedGroups[group.key] && (
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/60">
                      <div className="ml-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Active Days
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sortDays(group.shifts).map((shift) => (
                            <span
                              key={shift.id}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700"
                            >
                              {shift.day_of_week}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {editingGroup ? 'Edit Shift Pattern' : 'Add Shift Pattern'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false)
                  setEditingShift(null)
                  setEditingGroup(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 sm:space-y-5">
                {/* Shift Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Shift Name</label>
                  <input
                    type="text"
                    required
                    value={formData.shift_name}
                    onChange={(e) => setFormData({...formData, shift_name: e.target.value})}
                    className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
                    placeholder="e.g., Morning Shift"
                  />
                </div>

                {/* Days of Week */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-900">Days of Week</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllDays}
                        className="text-xs font-medium text-pink-600 hover:text-pink-700 transition-colors"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={deselectAllDays}
                        className="text-xs font-medium text-gray-600 hover:text-gray-700 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all ${
                          formData.day_of_week.includes(day)
                            ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                        <span className="hidden sm:inline">{day.slice(3)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.day_of_week.length === 0
                      ? 'Select the days this shift runs'
                      : `Selected: ${formData.day_of_week.length} day${formData.day_of_week.length > 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Time Presets */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Quick Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {timePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          formData.start_time === preset.start && formData.end_time === preset.end
                            ? 'bg-pink-100 text-pink-700 border border-pink-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="sm:hidden">{preset.label}</span>
                        <span className="hidden sm:inline">{preset.label} ({preset.start}-{preset.end})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Start Time</label>
                    <input
                      type="text"
                      required
                      value={formData.start_time}
                      onChange={(e) => handleTimeInput('start_time', e.target.value)}
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-center font-mono text-base sm:text-lg"
                      placeholder="09:00"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">End Time</label>
                    <input
                      type="text"
                      required
                      value={formData.end_time}
                      onChange={(e) => handleTimeInput('end_time', e.target.value)}
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-center font-mono text-base sm:text-lg"
                      placeholder="17:00"
                      maxLength={5}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 -mt-2">24-hour format (HH:MM)</p>

                {/* Staff Required */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Staff Required</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.staff_required}
                    onChange={(e) => setFormData({...formData, staff_required: e.target.value})}
                    className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
                    placeholder="2"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 sm:mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingShift(null)
                    setEditingGroup(null)
                  }}
                  className="flex-1 px-4 sm:px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addShiftMutation.isPending}
                  className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all disabled:opacity-50"
                >
                  {addShiftMutation.isPending ? 'Saving...' : (editingGroup ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}