'use client'

import { useState, useEffect } from 'react'

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

export default function StaffModal({ editingStaff, onSubmit, onClose, isSaving }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    contracted_hours: '',
    max_hours: '',
    hourly_rate: '',
    annual_salary: '',
    availability: JSON.stringify(getDefaultAvailability())
  })
  const [showAvailability, setShowAvailability] = useState(false)
  const [payType, setPayType] = useState('hourly') // 'hourly' or 'annual'

  // Populate form when editing
  useEffect(() => {
    if (editingStaff) {
      const parsedAvailability = parseAvailability(editingStaff.availability)
      // Check if availability has any restrictions
      const hasRestrictions = daysOfWeek.some(day => {
        const d = parsedAvailability[day]
        return !d.AM || !d.PM
      })
      setShowAvailability(hasRestrictions)
      
      // Determine pay type based on what's populated
      const hasAnnualSalary = editingStaff.annual_salary && parseFloat(editingStaff.annual_salary) > 0
      const hasHourlyRate = editingStaff.hourly_rate && parseFloat(editingStaff.hourly_rate) > 0
      
      setPayType(hasAnnualSalary ? 'annual' : 'hourly')
      
      setFormData({
        name: editingStaff.name || '',
        email: editingStaff.email || '',
        role: editingStaff.role || '',
        contracted_hours: editingStaff.contracted_hours ? editingStaff.contracted_hours.toString() : '',
        max_hours: editingStaff.max_hours ? editingStaff.max_hours.toString() : '',
        hourly_rate: editingStaff.hourly_rate ? parseFloat(editingStaff.hourly_rate).toString() : '',
        annual_salary: editingStaff.annual_salary ? parseFloat(editingStaff.annual_salary).toString() : '',
        availability: JSON.stringify(parsedAvailability)
      })
    }
  }, [editingStaff])

  const handleSubmit = (e) => {
    e.preventDefault()

    const contractedHours = parseInt(formData.contracted_hours)
    const maxHours = formData.max_hours ? parseInt(formData.max_hours) : contractedHours

    if (maxHours < contractedHours) {
      alert('Max hours cannot be less than contracted hours')
      return
    }

    // Only include the active pay type
    const payData = payType === 'hourly' 
      ? { hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0, annual_salary: null }
      : { annual_salary: formData.annual_salary ? parseFloat(formData.annual_salary) : 0, hourly_rate: null }

    onSubmit({
      ...(editingStaff && { id: editingStaff.id }),
      name: formData.name,
      email: formData.email,
      role: formData.role,
      contracted_hours: contractedHours,
      max_hours: maxHours,
      ...payData,
      availability: formData.availability
    })
  }

  const toggleAvailability = (day, period) => {
    const availability = JSON.parse(formData.availability)
    availability[day] = { ...availability[day], [period]: !availability[day]?.[period] }
    setFormData({ ...formData, availability: JSON.stringify(availability) })
  }

  const toggleFullDay = (day) => {
    const availability = JSON.parse(formData.availability)
    const currentDay = availability[day] || { AM: true, PM: true }
    const allOn = currentDay.AM && currentDay.PM
    availability[day] = { AM: !allOn, PM: !allOn }
    setFormData({ ...formData, availability: JSON.stringify(availability) })
  }

  const selectAllDays = () => {
    setFormData(prev => ({ ...prev, availability: JSON.stringify(getDefaultAvailability()) }))
  }

  const deselectAllDays = () => {
    const availability = {}
    daysOfWeek.forEach(day => { availability[day] = { AM: false, PM: false } })
    setFormData(prev => ({ ...prev, availability: JSON.stringify(availability) }))
  }

  // Summarise current availability state
  const availabilitySummary = (() => {
    try {
      const parsed = JSON.parse(formData.availability)
      let full = 0, partial = 0
      daysOfWeek.forEach(day => {
        const d = parsed[day] || { AM: false, PM: false }
        if (d.AM && d.PM) full++
        else if (d.AM || d.PM) partial++
      })
      if (full === 7) return 'Available all days'
      if (full === 0 && partial === 0) return 'No availability set'
      return `${full} full day${full !== 1 ? 's' : ''}${partial > 0 ? `, ${partial} partial` : ''}`
    } catch { return 'Not set' }
  })()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pt-3 sm:pt-5 pb-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-gray-900 font-cal">
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Name & Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Role</label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="e.g., Server, Barista, Manager"
                />
              </div>

              {/* Hours row — 2 columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Contract
                    <span className="font-normal text-gray-400 ml-1">h/wk</span>
                  </label>
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
                        max_hours: (!formData.max_hours || formData.max_hours === formData.contracted_hours) ? val : formData.max_hours
                      })
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Max
                    <span className="font-normal text-gray-400 ml-1">h/wk</span>
                  </label>
                  <input
                    type="number"
                    min={formData.contracted_hours || 0}
                    max="168"
                    value={formData.max_hours}
                    onChange={(e) => setFormData({ ...formData, max_hours: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="40"
                  />
                </div>
              </div>

              {/* Pay Type Toggle & Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Pay</label>
                
                {/* Toggle Pills */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setPayType('hourly')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      payType === 'hourly'
                        ? 'bg-[#FF1F7D] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Hourly Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayType('annual')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      payType === 'annual'
                        ? 'bg-[#FF1F7D] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Annual Salary
                  </button>
                </div>

                {/* Pay Input */}
                {payType === 'hourly' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Hourly Rate (£/h)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="11.44"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Annual Salary (£)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.annual_salary}
                      onChange={(e) => setFormData({ ...formData, annual_salary: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="25000"
                    />
                  </div>
                )}
              </div>

              {/* Availability — collapsible */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAvailability(!showAvailability)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">Availability</p>
                      <p className="text-xs text-gray-500">{availabilitySummary}</p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${showAvailability ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAvailability && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <div className="flex justify-end gap-2 mb-2">
                      <button type="button" onClick={selectAllDays} className="text-xs font-medium text-pink-600 hover:text-pink-700">
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={deselectAllDays} className="text-xs font-medium text-gray-600 hover:text-gray-700">
                        Clear
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {daysOfWeek.map((day) => {
                        const availability = JSON.parse(formData.availability)
                        const dayAvail = availability[day] || { AM: true, PM: true }
                        const allOn = dayAvail.AM && dayAvail.PM
                        const allOff = !dayAvail.AM && !dayAvail.PM

                        return (
                          <div
                            key={day}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                              allOn ? 'bg-green-50' : allOff ? 'bg-gray-50' : 'bg-amber-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleFullDay(day)}
                              className="text-sm font-medium text-gray-900 hover:text-pink-600 transition-colors"
                            >
                              {day.substring(0, 3)}
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleAvailability(day, 'AM')}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                  dayAvail.AM ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleAvailability(day, 'PM')}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                  dayAvail.PM ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition-all"
                style={{ background: '#FF1F7D' }}
              >
                {isSaving ? 'Saving...' : (editingStaff ? 'Update' : 'Add Staff')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}