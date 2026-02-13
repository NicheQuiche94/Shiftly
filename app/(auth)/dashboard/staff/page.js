'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import TeamSelector from '@/app/components/TeamSelector'
import PageHeader from '@/app/components/PageHeader'
import Button from '@/app/components/Button'
import Badge from '@/app/components/Badge'

export default function StaffPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    contracted_hours: '',
    availability: JSON.stringify({
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: true,
      Sunday: true
    })
  })

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  useEffect(() => {
    if (selectedTeamId) {
      loadStaff()
    }
  }, [selectedTeamId])

  const loadStaff = async () => {
    if (!selectedTeamId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load staff')
      const data = await response.json()
      setStaff(data)
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalHours = () => {
    return staff.reduce((sum, member) => sum + (member.contracted_hours || 0), 0)
  }

  const openAddModal = () => {
    setEditingStaff(null)
    setFormData({
      name: '',
      email: '',
      role: '',
      contracted_hours: '',
      availability: JSON.stringify({
        Monday: true,
        Tuesday: true,
        Wednesday: true,
        Thursday: true,
        Friday: true,
        Saturday: true,
        Sunday: true
      })
    })
    setShowModal(true)
  }

  const openEditModal = (member) => {
    setEditingStaff(member)
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      contracted_hours: member.contracted_hours.toString(),
      availability: member.availability
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingStaff) {
        const response = await fetch('/api/staff', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingStaff.id,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            contracted_hours: parseInt(formData.contracted_hours),
            availability: formData.availability
          })
        })

        if (!response.ok) throw new Error('Failed to update staff')
      } else {
        const response = await fetch('/api/staff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            team_id: selectedTeamId,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            contracted_hours: parseInt(formData.contracted_hours),
            availability: formData.availability
          })
        })

        if (!response.ok) throw new Error('Failed to add staff')
      }

      await loadStaff()
      
      setFormData({
        name: '',
        email: '',
        role: '',
        contracted_hours: '',
        availability: JSON.stringify({
          Monday: true,
          Tuesday: true,
          Wednesday: true,
          Thursday: true,
          Friday: true,
          Saturday: true,
          Sunday: true
        })
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
      const response = await fetch(`/api/staff?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete staff')

      await loadStaff()
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert('Failed to delete staff member. Please try again.')
    }
  }

  const toggleAvailability = (day) => {
    const availability = JSON.parse(formData.availability)
    availability[day] = !availability[day]
    setFormData({
      ...formData,
      availability: JSON.stringify(availability)
    })
  }

  const selectAllDays = () => {
    const availability = {}
    daysOfWeek.forEach(day => {
      availability[day] = true
    })
    setFormData(prev => ({
      ...prev,
      availability: JSON.stringify(availability)
    }))
  }

  const deselectAllDays = () => {
    const availability = {}
    daysOfWeek.forEach(day => {
      availability[day] = false
    })
    setFormData(prev => ({
      ...prev,
      availability: JSON.stringify(availability)
    }))
  }

  const getAvailabilityDisplay = (availabilityString) => {
    try {
      const availability = JSON.parse(availabilityString)
      const availableDays = Object.entries(availability)
        .filter(([_, isAvailable]) => isAvailable)
        .map(([day, _]) => day)
      
      if (availableDays.length === 7) return 'All days'
      if (availableDays.length === 0) return 'No availability'
      return `${availableDays.length} days`
    } catch {
      return 'Not set'
    }
  }

  const totalHours = calculateTotalHours()

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <PageHeader 
          title="Staff Members"
          subtitle="Manage your team and their availability"
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
          {staff.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-sm">
              <div className="body-small text-gray-600 mb-1">Total Contracted Hours</div>
              <div className="text-3xl font-bold text-gray-900">{totalHours}h</div>
              <div className="caption mt-1">Must match total shift hours</div>
            </div>
          )}
        </div>

        {/* Add Staff Button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={openAddModal}
            disabled={!selectedTeamId}
            variant="primary"
          >
            + Add Staff Member
          </Button>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-xl border border-pink-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200/60">
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700 sticky left-0 bg-gray-50">NAME</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">EMAIL</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">ROLE</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">AVAILABILITY</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">HOURS/WEEK</th>
                <th className="px-6 py-4 text-right body-small font-semibold text-gray-700">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60">
              {!selectedTeamId ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="body-text font-medium mb-1">Select a team to manage staff</p>
                    <p className="body-small">Choose a team from the dropdown above</p>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="body-text font-medium mb-1">No staff members yet</p>
                    <p className="body-small">Add your first team member to get started</p>
                  </td>
                </tr>
              ) : (
                staff.map((member, idx) => (
                  <tr key={member.id} className={`hover:bg-gray-50/50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                    {/* Name - white background */}
                    <td className="px-6 py-4 sticky left-0 bg-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="body-text font-medium text-gray-900">{member.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      <span className="body-small text-gray-600">{member.email}</span>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <Badge variant="default" size="sm">
                        {member.role}
                      </Badge>
                    </td>

                    {/* Availability */}
                    <td className="px-6 py-4">
                      <span className="body-small text-gray-600">
                        {getAvailabilityDisplay(member.availability)}
                      </span>
                    </td>

                    {/* Hours */}
                    <td className="px-6 py-4">
                      <Badge variant="info" size="sm">
                        {member.contracted_hours}h/week
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openEditModal(member)}
                          className="btn-icon text-gray-600 hover:text-pink-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(member.id)}
                          className="btn-icon text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="heading-page">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false)
                  setEditingStaff(null)
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
                {/* Name */}
                <div>
                  <label className="block body-text font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="John Smith"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block body-text font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block body-text font-semibold mb-2">Role</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="e.g., Server, Barista, Manager"
                  />
                </div>

                {/* Contracted Hours */}
                <div>
                  <label className="block body-text font-semibold mb-2">Contracted Hours per Week</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="168"
                    value={formData.contracted_hours}
                    onChange={(e) => setFormData({...formData, contracted_hours: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="40"
                  />
                </div>

                {/* Availability */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block body-text font-semibold">Weekly Availability</label>
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
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map((day) => {
                      const availability = JSON.parse(formData.availability)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleAvailability(day)}
                          className={`px-4 py-3 rounded-lg body-small font-medium transition-all ${
                            availability[day]
                              ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  <p className="caption mt-2">
                    Select the days this person is available to work
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    setEditingStaff(null)
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
                  {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}