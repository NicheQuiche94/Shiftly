'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import TeamSelector from '@/app/components/TeamSelector'
import PageHeader from '@/app/components/PageHeader'
import Button from '@/app/components/Button'
import Badge from '@/app/components/Badge'

export default function ShiftsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
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

  useEffect(() => {
    if (selectedTeamId) {
      loadShifts()
    }
  }, [selectedTeamId])

  const loadShifts = async () => {
    if (!selectedTeamId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load shifts')
      const data = await response.json()
      setShifts(data)
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalHours = () => {
    let totalHours = 0
    
    shifts.forEach(shift => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number)
      const [endHour, endMin] = shift.end_time.split(':').map(Number)
      
      let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
      
      if (minutes < 0) {
        minutes += 24 * 60
      }
      
      const hours = minutes / 60
      totalHours += hours * shift.staff_required
    })
    
    return totalHours.toFixed(1)
  }

  const groupedShifts = () => {
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
  }

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
    const grouped = groupedShifts()
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

  const openEditModal = (shift) => {
    setEditingShift(shift)
    setEditingGroup(null)
    setFormData({
      shift_name: shift.shift_name,
      day_of_week: [shift.day_of_week],
      start_time: shift.start_time,
      end_time: shift.end_time,
      staff_required: shift.staff_required.toString()
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.day_of_week.length === 0) {
      alert('Please select at least one day')
      return
    }
    
    try {
      if (editingShift) {
        const response = await fetch('/api/shifts', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingShift.id,
            shift_name: formData.shift_name,
            day_of_week: formData.day_of_week[0],
            start_time: formData.start_time,
            end_time: formData.end_time,
            staff_required: parseInt(formData.staff_required)
          })
        })

        if (!response.ok) throw new Error('Failed to update shift')
      } else if (editingGroup) {
        const deletePromises = editingGroup.shifts.map(s => 
          fetch(`/api/shifts?id=${s.id}`, { method: 'DELETE' })
        )
        await Promise.all(deletePromises)

        const shiftPromises = formData.day_of_week.map(day => 
          fetch('/api/shifts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              team_id: selectedTeamId,
              shift_name: formData.shift_name,
              day_of_week: day,
              start_time: formData.start_time,
              end_time: formData.end_time,
              staff_required: parseInt(formData.staff_required)
            })
          })
        )

        const responses = await Promise.all(shiftPromises)
        const allSucceeded = responses.every(r => r.ok)
        if (!allSucceeded) throw new Error('Failed to update some shifts')
      } else {
        const shiftPromises = formData.day_of_week.map(day => 
          fetch('/api/shifts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              team_id: selectedTeamId,
              shift_name: formData.shift_name,
              day_of_week: day,
              start_time: formData.start_time,
              end_time: formData.end_time,
              staff_required: parseInt(formData.staff_required)
            })
          })
        )

        const responses = await Promise.all(shiftPromises)
        const allSucceeded = responses.every(r => r.ok)
        if (!allSucceeded) throw new Error('Failed to add some shifts')
      }

      await loadShifts()
      
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
      alert(`Failed to ${editingShift ? 'update' : 'save'} shift. Please try again.`)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this shift?')) return
    
    try {
      const response = await fetch(`/api/shifts?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete shift')

      await loadShifts()
    } catch (error) {
      console.error('Error deleting shift:', error)
      alert('Failed to delete shift. Please try again.')
    }
  }

  const handleDeleteGroup = async (shifts) => {
    const ids = shifts.map(s => s.id)
    if (!confirm(`Are you sure you want to delete this shift pattern (${ids.length} day${ids.length > 1 ? 's' : ''})?`)) return
    
    try {
      const deletePromises = ids.map(id => 
        fetch(`/api/shifts?id=${id}`, { method: 'DELETE' })
      )
      
      const responses = await Promise.all(deletePromises)
      const allSucceeded = responses.every(r => r.ok)
      
      if (!allSucceeded) throw new Error('Failed to delete some shifts')

      await loadShifts()
    } catch (error) {
      console.error('Error deleting shifts:', error)
      alert('Failed to delete shift pattern. Please try again.')
    }
  }

  const handleDeleteSelected = async () => {
    const grouped = groupedShifts()
    const selectedGroups = grouped.filter(g => selectedShifts.has(g.key))
    const allShifts = selectedGroups.flatMap(g => g.shifts)
    
    if (!confirm(`Delete ${selectedGroups.length} shift pattern(s)?`)) return
    
    try {
      const deletePromises = allShifts.map(s => 
        fetch(`/api/shifts?id=${s.id}`, { method: 'DELETE' })
      )
      
      const responses = await Promise.all(deletePromises)
      const allSucceeded = responses.every(r => r.ok)
      
      if (!allSucceeded) throw new Error('Failed to delete some shifts')

      setSelectedShifts(new Set())
      await loadShifts()
    } catch (error) {
      console.error('Error deleting shifts:', error)
      alert('Failed to delete shifts. Please try again.')
    }
  }

  const toggleDay = (day) => {
    if (editingShift) {
      setFormData({
        ...formData,
        day_of_week: [day]
      })
    } else {
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

  const grouped = groupedShifts()
  const totalHours = calculateTotalHours()

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <PageHeader 
          title="Shift Patterns"
          subtitle="Define your recurring shift templates"
          backLink={{ href: '/dashboard', label: 'Back to Dashboard' }}
        />

        {/* Team Selector */}
        <div className="mb-6">
          <TeamSelector 
            selectedTeamId={selectedTeamId}
            onTeamChange={setSelectedTeamId}
          />
        </div>

        {/* Header with Total Hours Badge */}
        <div className="mb-8 flex items-end justify-end">
          {shifts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-sm">
              <div className="body-small text-gray-600 mb-1">Total Hours per Week</div>
              <div className="text-3xl font-bold text-gray-900">{totalHours}h</div>
              <div className="caption mt-1">Must match total staff hours</div>
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {selectedShifts.size > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSelected}
              >
                Delete Selected ({selectedShifts.size})
              </Button>
            )}
          </div>
          
          <Button
            onClick={openAddModal}
            disabled={!selectedTeamId}
            variant="primary"
          >
            + Add Shift Pattern
          </Button>
        </div>

        {/* Shifts Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50/50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 body-small font-semibold text-gray-700">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedShifts.size === grouped.length && grouped.length > 0}
                  onChange={toggleSelectAll}
                  disabled={!selectedTeamId || grouped.length === 0}
                  className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2 disabled:opacity-50"
                />
              </div>
              <div className="col-span-3">SHIFT NAME</div>
              <div className="col-span-3">DAYS</div>
              <div className="col-span-2">TIME</div>
              <div className="col-span-2">STAFF REQUIRED</div>
              <div className="col-span-1 text-right">ACTIONS</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {!selectedTeamId ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="body-text font-medium mb-1">Select a team to manage shifts</p>
                <p className="body-small">Choose a team from the dropdown above</p>
              </div>
            ) : loading ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="body-text font-medium mb-1">No shift patterns yet</p>
                <p className="body-small">Create your first shift pattern to get started</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.key}>
                  {/* Main Row */}
                  <div 
                    className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors ${
                      expandedGroups[group.key] ? 'bg-gray-50/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedShifts.has(group.key)}
                        onChange={() => toggleSelectShift(group.key)}
                        className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                      />
                    </div>

                    {/* Shift Name */}
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
                        <span className="body-text font-medium group-hover:text-pink-600 transition-colors">
                          {group.shift_name}
                        </span>
                      </button>
                    </div>

                    {/* Days Summary */}
                    <div className="col-span-3 flex items-center">
                      <span className="body-small text-gray-600">
                        {formatDays(group.shifts)}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="col-span-2 flex items-center">
                      <span className="body-small">
                        {group.start_time} - {group.end_time}
                      </span>
                    </div>

                    {/* Staff Required */}
                    <div className="col-span-2 flex items-center">
                      <Badge variant="info" size="sm">
                        {group.staff_required} staff
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => openEditGroupModal(group)}
                        className="btn-icon text-gray-600 hover:text-pink-600 transition-colors"
                        title="Edit All"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteGroup(group.shifts)}
                        className="btn-icon text-gray-600 hover:text-red-600 transition-colors"
                        title="Delete All"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Days View */}
                  {expandedGroups[group.key] && (
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200">
                      <div className="ml-5">
                        <p className="caption font-semibold uppercase tracking-wide mb-3">
                          Active Days
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sortDays(group.shifts).map((shift) => (
                            <Badge key={shift.id} variant="default" size="sm">
                              {shift.day_of_week}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="heading-page">
                {editingShift ? 'Edit Shift' : editingGroup ? 'Edit Shift Pattern' : 'Add Shift Pattern'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false)
                  setEditingShift(null)
                  setEditingGroup(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* Shift Name */}
                <div>
                  <label className="block body-text font-semibold mb-2">Shift Name</label>
                  <input
                    type="text"
                    required
                    value={formData.shift_name}
                    onChange={(e) => setFormData({...formData, shift_name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="e.g., Morning Shift"
                  />
                </div>

                {/* Days of Week */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block body-text font-semibold">
                      {editingShift ? 'Day of Week' : 'Days of Week'}
                    </label>
                    {!editingShift && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllDays}
                          className="caption font-medium text-pink-600 hover:text-pink-700 transition-colors"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={deselectAllDays}
                          className="caption font-medium text-gray-600 hover:text-gray-700 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-3 rounded-lg body-small font-medium transition-all ${
                          formData.day_of_week.includes(day)
                            ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="caption mt-2">
                    {editingShift 
                      ? 'Select the day for this shift' 
                      : formData.day_of_week.length === 0
                      ? 'Select the days this shift runs'
                      : `Selected: ${formData.day_of_week.length} day${formData.day_of_week.length > 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block body-text font-semibold mb-2">Start Time</label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block body-text font-semibold mb-2">End Time</label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Staff Required */}
                <div>
                  <label className="block body-text font-semibold mb-2">Staff Required</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.staff_required}
                    onChange={(e) => setFormData({...formData, staff_required: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="2"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    setEditingShift(null)
                    setEditingGroup(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingShift ? 'Update Shift' : editingGroup ? 'Update Pattern' : 'Add Shift Pattern'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}