'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const getDefaultAvailability = () => {
  const availability = {}
  daysOfWeek.forEach(day => {
    availability[day] = { AM: true, PM: true }
  })
  return availability
}

const parseAvailability = (availabilityString) => {
  try {
    const parsed = JSON.parse(availabilityString)
    const converted = {}
    daysOfWeek.forEach(day => {
      if (typeof parsed[day] === 'boolean') {
        converted[day] = { AM: parsed[day], PM: parsed[day] }
      } else if (parsed[day] && typeof parsed[day] === 'object') {
        converted[day] = parsed[day]
      } else {
        converted[day] = { AM: true, PM: true }
      }
    })
    return converted
  } catch {
    return getDefaultAvailability()
  }
}

export default function StaffSection({ selectedTeamId }) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [invitedMember, setInvitedMember] = useState(null)
  const [showCopyLink, setShowCopyLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    contracted_hours: '',
    max_hours: '',
    availability: JSON.stringify(getDefaultAvailability())
  })

  // Fetch staff with React Query
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', selectedTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load staff')
      return response.json()
    },
    enabled: !!selectedTeamId
  })

  // Fetch shifts for hours comparison
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', selectedTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/shifts?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load shifts')
      return response.json()
    },
    enabled: !!selectedTeamId
  })

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: async (staffData) => {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      })
      if (!response.ok) throw new Error('Failed to add staff')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] })
    }
  })

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async (staffData) => {
      const response = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      })
      if (!response.ok) throw new Error('Failed to update staff')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] })
    }
  })

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId) => {
      const response = await fetch(`/api/staff?id=${staffId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete staff')
      return staffId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] })
    }
  })

  // Generate invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (staffId) => {
      const response = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate invite')
      return data
    },
    onSuccess: (data) => {
      setInviteData(data)
      setShowInviteModal(true)
      setShowCopyLink(false)
      setCopied(false)
    },
    onError: (error) => {
      alert(error.message)
    }
  })

  // Calculate hours (memoized) - now includes max_hours for capacity check
  const { staffHours, maxStaffHours, shiftHours, hoursMatch, canFulfill, hoursDiff } = useMemo(() => {
    const totalStaffHours = staff.reduce((sum, member) => sum + (member.contracted_hours || 0), 0)
    const totalMaxHours = staff.reduce((sum, member) => sum + (member.max_hours || member.contracted_hours || 0), 0)

    let totalShiftHours = 0
    shifts.forEach(shift => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number)
      const [endHour, endMin] = shift.end_time.split(':').map(Number)
      let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
      if (minutes < 0) minutes += 24 * 60
      const hours = minutes / 60
      totalShiftHours += hours * (shift.staff_required || 1)
    })

    const match = Math.abs(totalStaffHours - totalShiftHours) < 0.5
    const canFulfillShifts = totalMaxHours >= totalShiftHours
    const diff = totalStaffHours - totalShiftHours

    return {
      staffHours: totalStaffHours,
      maxStaffHours: totalMaxHours,
      shiftHours: totalShiftHours,
      hoursMatch: match,
      canFulfill: canFulfillShifts,
      hoursDiff: diff
    }
  }, [staff, shifts])

  const openAddModal = () => {
    setEditingStaff(null)
    setFormData({
      name: '',
      email: '',
      role: '',
      contracted_hours: '',
      max_hours: '',
      availability: JSON.stringify(getDefaultAvailability())
    })
    setShowModal(true)
  }

  const openEditModal = (member) => {
    setEditingStaff(member)
    const parsedAvailability = parseAvailability(member.availability)
    setFormData({
      name: member.name || '',
      email: member.email || '',
      role: member.role || '',
      contracted_hours: member.contracted_hours ? member.contracted_hours.toString() : '',
      max_hours: member.max_hours ? member.max_hours.toString() : '',
      availability: JSON.stringify(parsedAvailability)
    })
    setShowModal(true)
  }

  const handleInvite = (member) => {
    setInvitedMember(member)
    inviteMutation.mutate(member.id)
  }

  const copyInviteLink = async () => {
    if (inviteData?.invite_url) {
      await navigator.clipboard.writeText(inviteData.invite_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const contractedHours = parseInt(formData.contracted_hours)
    const maxHours = formData.max_hours ? parseInt(formData.max_hours) : contractedHours
    
    // Validate max_hours >= contracted_hours
    if (maxHours < contractedHours) {
      alert('Max hours cannot be less than contracted hours')
      return
    }
    
    try {
      if (editingStaff) {
        await updateStaffMutation.mutateAsync({
          id: editingStaff.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          contracted_hours: contractedHours,
          max_hours: maxHours,
          availability: formData.availability
        })
      } else {
        await addStaffMutation.mutateAsync({
          team_id: selectedTeamId,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          contracted_hours: contractedHours,
          max_hours: maxHours,
          availability: formData.availability
        })
      }

      setFormData({
        name: '',
        email: '',
        role: '',
        contracted_hours: '',
        max_hours: '',
        availability: JSON.stringify(getDefaultAvailability())
      })
      setEditingStaff(null)
      setShowModal(false)
    } catch (error) {
      console.error('Error saving staff:', error)
      alert(`Failed to ${editingStaff ? 'update' : 'add'} staff member. Please try again.`)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    
    try {
      await deleteStaffMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert('Failed to delete staff member. Please try again.')
    }
  }

  const toggleAvailability = (day, period) => {
    const availability = JSON.parse(formData.availability)
    availability[day] = {
      ...availability[day],
      [period]: !availability[day]?.[period]
    }
    setFormData({
      ...formData,
      availability: JSON.stringify(availability)
    })
  }

  const toggleFullDay = (day) => {
    const availability = JSON.parse(formData.availability)
    const currentDay = availability[day] || { AM: true, PM: true }
    const allOn = currentDay.AM && currentDay.PM
    availability[day] = { AM: !allOn, PM: !allOn }
    setFormData({
      ...formData,
      availability: JSON.stringify(availability)
    })
  }

  const selectAllDays = () => {
    setFormData(prev => ({
      ...prev,
      availability: JSON.stringify(getDefaultAvailability())
    }))
  }

  const deselectAllDays = () => {
    const availability = {}
    daysOfWeek.forEach(day => {
      availability[day] = { AM: false, PM: false }
    })
    setFormData(prev => ({
      ...prev,
      availability: JSON.stringify(availability)
    }))
  }

  const getAvailabilityDisplay = (availabilityString) => {
    try {
      const parsed = parseAvailability(availabilityString)
      let fullDays = 0
      let partialDays = 0
      
      daysOfWeek.forEach(day => {
        const dayAvail = parsed[day] || { AM: false, PM: false }
        if (dayAvail.AM && dayAvail.PM) {
          fullDays++
        } else if (dayAvail.AM || dayAvail.PM) {
          partialDays++
        }
      })
      
      if (fullDays === 7) return 'All days'
      if (fullDays === 0 && partialDays === 0) return 'No availability'
      if (partialDays > 0) return `${fullDays} full, ${partialDays} partial`
      return `${fullDays} days`
    } catch {
      return 'Not set'
    }
  }

  const isSaving = addStaffMutation.isPending || updateStaffMutation.isPending

  return (
    <div>
      {/* Header with Hours Comparison */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-cal">Staff Members</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your team and their availability</p>
        </div>
        
        {staff.length > 0 && (
          <div className={`rounded-lg border px-4 sm:px-5 py-2 sm:py-3 ${
            canFulfill 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-0.5">Contracted</div>
                <div className={`text-lg sm:text-xl font-bold ${canFulfill ? 'text-green-700' : 'text-gray-900'}`}>
                  {staffHours}h
                </div>
                {maxStaffHours > staffHours && (
                  <div className="text-xs text-gray-500">
                    (max {maxStaffHours}h)
                  </div>
                )}
              </div>
              
              <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${
                canFulfill ? 'bg-green-200' : 'bg-red-200'
              }`}>
                {canFulfill ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-0.5">Shifts</div>
                <div className={`text-lg sm:text-xl font-bold ${canFulfill ? 'text-green-700' : 'text-gray-900'}`}>
                  {shiftHours.toFixed(0)}h
                </div>
              </div>
            </div>
            
            {!canFulfill && (
              <div className="text-xs text-red-700 mt-1 text-center font-medium">
                Need {Math.abs(shiftHours - maxStaffHours).toFixed(0)}h more capacity
              </div>
            )}
            
            {canFulfill && !hoursMatch && (
              <div className="text-xs text-green-700 mt-1 text-center">
                {hoursDiff > 0 
                  ? `${hoursDiff.toFixed(0)}h under contract (overtime available)`
                  : `${Math.abs(hoursDiff).toFixed(0)}h overtime needed`
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Staff Button */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={openAddModal}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all text-sm sm:text-base"
        >
          + Add Staff
        </button>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
        {/* Desktop Table Header - Hidden on mobile */}
        <div className="hidden md:block bg-gray-50/50 border-b border-gray-200/60">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Availability</div>
            <div className="col-span-2">Hours/Week</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
        </div>

        {/* Content */}
        <div className="divide-y divide-gray-200/60">
          {isLoading ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : staff.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-1">No staff members yet</p>
              <p className="text-sm text-gray-500">Add your first team member to get started</p>
            </div>
          ) : (
            staff.map((member) => (
              <div key={member.id}>
                {/* Mobile Card View */}
                <div className="md:hidden p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 mt-1">
                          {member.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {!member.clerk_user_id && (
                        <button 
                          onClick={() => handleInvite(member)}
                          disabled={inviteMutation.isPending}
                          className="p-2 text-pink-600 hover:text-pink-700 transition-colors disabled:opacity-50"
                          title="Invite"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      <button 
                        onClick={() => openEditModal(member)}
                        className="p-2 text-gray-600 hover:text-pink-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(member.id)}
                        disabled={deleteStaffMutation.isPending}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 ml-13 pl-13 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {getAvailabilityDisplay(member.availability)}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
                      {member.contracted_hours}h
                      {member.max_hours && member.max_hours > member.contracted_hours && (
                        <span className="text-pink-500 ml-1">(max {member.max_hours}h)</span>
                      )}
                    </span>
                    {member.clerk_user_id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Not invited
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop Table Row */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="col-span-3 flex items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{member.name}</span>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {member.role}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-600">
                      {getAvailabilityDisplay(member.availability)}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
                      {member.contracted_hours}h
                      {member.max_hours && member.max_hours > member.contracted_hours && (
                        <span className="text-pink-500 ml-1">(max {member.max_hours})</span>
                      )}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    {member.clerk_user_id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        —
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    {!member.clerk_user_id && (
                      <button 
                        onClick={() => handleInvite(member)}
                        disabled={inviteMutation.isPending}
                        className="px-2.5 py-1 text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-md transition-colors disabled:opacity-50"
                        title="Send invite link"
                      >
                        Invite
                      </button>
                    )}
                    <button 
                      onClick={() => openEditModal(member)}
                      className="text-gray-600 hover:text-pink-600 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(member.id)}
                      disabled={deleteStaffMutation.isPending}
                      className="text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-cal">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false)
                  setEditingStaff(null)
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
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
                    placeholder="John Smith"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
                    placeholder="john@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used to send schedule invites and notifications
                  </p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Role</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
                    placeholder="e.g., Server, Barista, Manager"
                  />
                </div>

                {/* Hours Section */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Contracted Hours */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Contracted Hours</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="168"
                      value={formData.contracted_hours}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData({
                          ...formData, 
                          contracted_hours: val,
                          // Auto-set max_hours if not yet set or if it was equal to old contracted
                          max_hours: (!formData.max_hours || formData.max_hours === formData.contracted_hours) ? val : formData.max_hours
                        })
                      }}
                      className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
                      placeholder="20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Guaranteed minimum
                    </p>
                  </div>

                  {/* Max Hours */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Max Hours</label>
                    <input
                      type="number"
                      min={formData.contracted_hours || 0}
                      max="168"
                      value={formData.max_hours}
                      onChange={(e) => setFormData({...formData, max_hours: e.target.value})}
                      className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Willing to work (incl. overtime)
                    </p>
                  </div>
                </div>

                {/* Info tip about hours */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p><strong>Contracted hours</strong> = minimum guaranteed each week</p>
                      <p className="mt-1"><strong>Max hours</strong> = most they're willing to work (for overtime flexibility)</p>
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-900">Weekly Availability</label>
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
                  <p className="text-xs text-gray-500 mb-3">
                    Tap the day name to toggle all, or choose AM/PM individually
                  </p>
                  <div className="space-y-2">
                    {daysOfWeek.map((day) => {
                      const availability = JSON.parse(formData.availability)
                      const dayAvail = availability[day] || { AM: true, PM: true }
                      const allOn = dayAvail.AM && dayAvail.PM
                      const allOff = !dayAvail.AM && !dayAvail.PM
                      
                      return (
                        <div
                          key={day}
                          className={`rounded-lg border transition-all ${
                            allOn ? 'bg-green-50 border-green-200' : 
                            allOff ? 'bg-gray-100 border-transparent' : 
                            'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleFullDay(day)}
                              className="font-medium text-gray-900 hover:text-pink-600 transition-colors"
                            >
                              {day}
                            </button>
                            
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleAvailability(day, 'AM')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                                  dayAvail.AM
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleAvailability(day, 'PM')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                                  dayAvail.PM
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 sm:mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingStaff(null)
                  }}
                  className="flex-1 px-4 sm:px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : (editingStaff ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Success Modal */}
      {showInviteModal && inviteData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 font-cal">Invite Sent!</h2>
              <p className="text-gray-600">
                We've emailed an invite link to
              </p>
              <p className="font-medium text-gray-900 mt-1">
                {invitedMember?.email}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-gray-600">
                  <p><strong>{inviteData.staff_name}</strong> will receive an email with a link to create their account and access their schedule.</p>
                  <p className="mt-2 text-xs text-gray-500">The link expires in 7 days.</p>
                </div>
              </div>
            </div>

            {!showCopyLink ? (
              <button
                onClick={() => setShowCopyLink(true)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                Need to copy the link manually?
              </button>
            ) : (
              <div className="mb-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-2">
                  <p className="text-xs text-gray-800 break-all font-mono">{inviteData.invite_url}</p>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="w-full px-4 py-2 text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowInviteModal(false)
                setInviteData(null)
                setInvitedMember(null)
                setShowCopyLink(false)
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}