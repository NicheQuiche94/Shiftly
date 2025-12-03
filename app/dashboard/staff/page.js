'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'

export default function StaffPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState(new Set())
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    contractedHours: '',
    availability: []
  })

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      if (!response.ok) throw new Error('Failed to load staff')
      const data = await response.json()
      setStaff(data)
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate total contracted hours
  const calculateTotalHours = () => {
    return staff.reduce((total, member) => {
      return total + (member.contracted_hours || 0)
    }, 0)
  }

  const openAddModal = () => {
    setEditingStaff(null)
    setFormData({
      name: '',
      email: '',
      role: '',
      contractedHours: '',
      availability: []
    })
    setShowModal(true)
  }

  const openEditModal = (staffMember) => {
    setEditingStaff(staffMember)
    setFormData({
      name: staffMember.name,
      email: staffMember.email || '',
      role: staffMember.role || '',
      contractedHours: staffMember.contracted_hours || '',
      availability: Array.isArray(staffMember.availability) ? staffMember.availability : []
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      name: formData.name,
      email: formData.email,
      role: formData.role || null,
      contracted_hours: parseInt(formData.contractedHours) || 0,
      availability: formData.availability
    }

    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff'
      const method = editingStaff ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to save staff member')

      await loadStaff()
      setShowModal(false)
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return

    try {
      const response = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete staff member')
      await loadStaff()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedStaff.size} staff member(s)?`)) return
    
    try {
      const deletePromises = Array.from(selectedStaff).map(id => 
        fetch(`/api/staff/${id}`, { method: 'DELETE' })
      )
      
      const responses = await Promise.all(deletePromises)
      const allSucceeded = responses.every(r => r.ok)
      
      if (!allSucceeded) throw new Error('Failed to delete some staff members')

      setSelectedStaff(new Set())
      await loadStaff()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const toggleSelectStaff = (id) => {
    const newSelected = new Set(selectedStaff)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedStaff(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedStaff.size === staff.length) {
      setSelectedStaff(new Set())
    } else {
      setSelectedStaff(new Set(staff.map(s => s.id)))
    }
  }

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter(d => d !== day)
        : [...prev.availability, day]
    }))
  }

  const toggleAllDays = () => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.length === 7 ? [] : [...daysOfWeek]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  const totalHours = calculateTotalHours()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Back to Dashboard */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-pink-600 hover:text-pink-700 transition-colors mb-6 font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Staff
            </h1>
            <p className="text-gray-600">
              Manage your team members and their availability
            </p>
          </div>
          
          {/* Total Hours Badge */}
          {staff.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200/60 px-6 py-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Contracted Hours</div>
              <div className="text-3xl font-bold text-gray-900">{totalHours}h</div>
              <div className="text-xs text-gray-500 mt-1">Must match total shift hours</div>
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {selectedStaff.size > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Selected ({selectedStaff.size})
              </button>
            )}
          </div>
          
          <button 
            onClick={openAddModal}
            className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-200"
          >
            + Add Staff Member
          </button>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50/50 border-b border-gray-200/60">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-700">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStaff.size === staff.length && staff.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                />
              </div>
              <div className="col-span-3">NAME</div>
              <div className="col-span-2">ROLE</div>
              <div className="col-span-2">CONTRACTED HOURS</div>
              <div className="col-span-3">AVAILABILITY</div>
              <div className="col-span-1 text-right">ACTIONS</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200/60">
            {staff.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium mb-1">No staff members yet</p>
                <p className="text-sm text-gray-500">Add your first team member to get started</p>
              </div>
            ) : (
              staff.map((member) => (
                <div 
                  key={member.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Checkbox */}
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStaff.has(member.id)}
                      onChange={() => toggleSelectStaff(member.id)}
                      className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                    />
                  </div>

                  {/* Name */}
                  <div className="col-span-3 flex items-center">
                    <span className="font-medium text-gray-900">{member.name}</span>
                  </div>

                  {/* Role */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-600">
                      {member.role || '-'}
                    </span>
                  </div>

                  {/* Contracted Hours */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-900">
                      {member.contracted_hours ? `${member.contracted_hours}h/week` : 'Flexible'}
                    </span>
                  </div>

                  {/* Availability */}
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-gray-600">
                      {Array.isArray(member.availability) && member.availability.length > 0
                        ? member.availability.length === 7 
                          ? 'All days'
                          : member.availability.map(d => d.substring(0, 3)).join(', ')
                        : 'All days'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end space-x-2">
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
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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
              <h2 className="text-2xl font-bold text-gray-900">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                  placeholder="John Smith"
                />
              </div>

              {/* Email (kept in modal for future mobile app) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                  placeholder="john@example.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  For future mobile app notifications
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                  placeholder="e.g., Manager, Supervisor, Team Member"
                />
              </div>

              {/* Contracted Hours */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Contracted Hours (per week)
                </label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={formData.contractedHours}
                  onChange={(e) => setFormData({...formData, contractedHours: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                  placeholder="40"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank (or 0) for flexible staff with no minimum
                </p>
              </div>

              {/* Availability */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Available Days
                  </label>
                  <button
                    type="button"
                    onClick={toggleAllDays}
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                  >
                    {formData.availability.length === 7 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                        formData.availability.includes(day)
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  If no days selected, staff will be available all days
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all"
                >
                  {editingStaff ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}