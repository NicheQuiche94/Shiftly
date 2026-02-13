'use client'

import { useState, useEffect } from 'react'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const getDefaultAvailability = () => {
  const availability = {}
  daysOfWeek.forEach(day => {
    availability[day] = { available: true, start: null, end: null }
  })
  return availability
}

const parseAvailability = (availabilityString) => {
  try {
    const parsed = JSON.parse(availabilityString)
    const converted = {}
    daysOfWeek.forEach(day => {
      const d = parsed[day]
      if (!d) {
        converted[day] = { available: true, start: null, end: null }
      } else if ('available' in d) {
        // New format
        converted[day] = { available: d.available, start: d.start || null, end: d.end || null }
      } else if ('AM' in d || 'PM' in d) {
        // Legacy AM/PM format - convert
        if (d.AM && d.PM) {
          converted[day] = { available: true, start: null, end: null }
        } else if (d.AM && !d.PM) {
          converted[day] = { available: true, start: '06:00', end: '13:00' }
        } else if (!d.AM && d.PM) {
          converted[day] = { available: true, start: '13:00', end: '23:00' }
        } else {
          converted[day] = { available: false, start: null, end: null }
        }
      } else if (typeof d === 'boolean') {
        converted[day] = { available: d, start: null, end: null }
      } else {
        converted[day] = { available: true, start: null, end: null }
      }
    })
    return converted
  } catch {
    return getDefaultAvailability()
  }
}

// Generate time options in 15-min increments
const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    TIME_OPTIONS.push(`${hh}:${mm}`)
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
  const [payType, setPayType] = useState('hourly')
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(48)

  // Fetch team's locale to get max_weekly_hours
  useEffect(() => {
    const fetchLocale = async () => {
      try {
        const teamRes = await fetch('/api/teams')
        const teams = await teamRes.json()
        if (teams.length > 0) {
          const firstTeam = teams[0]
          if (firstTeam.locale_id) {
            const localeRes = await fetch(`/api/locales/${firstTeam.locale_id}`)
            const locale = await localeRes.json()
            if (locale.max_weekly_hours) {
              setMaxWeeklyHours(locale.max_weekly_hours)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching locale:', error)
      }
    }
    fetchLocale()
  }, [])

  // Populate form when editing
  useEffect(() => {
    if (editingStaff) {
      const parsedAvailability = parseAvailability(editingStaff.availability)
      const hasRestrictions = daysOfWeek.some(day => {
        const d = parsedAvailability[day]
        return !d.available || d.start || d.end
      })
      setShowAvailability(hasRestrictions)

      const hasAnnualSalary = editingStaff.annual_salary && parseFloat(editingStaff.annual_salary) > 0
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

    if (maxHours > maxWeeklyHours) {
      alert(`Max hours cannot exceed ${maxWeeklyHours} per week (legal compliance limit)`)
      return
    }

    // Only include pay data when adding new staff (pay is managed in Payroll when editing)
    const payData = editingStaff
      ? {}
      : payType === 'hourly'
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

  const updateAvailability = (day, field, value) => {
    const availability = JSON.parse(formData.availability)
    availability[day] = { ...availability[day], [field]: value }
    setFormData({ ...formData, availability: JSON.stringify(availability) })
  }

  const toggleDayAvailable = (day) => {
    const availability = JSON.parse(formData.availability)
    const current = availability[day]
    availability[day] = { available: !current.available, start: null, end: null }
    setFormData({ ...formData, availability: JSON.stringify(availability) })
  }

  const toggleCustomTimes = (day) => {
    const availability = JSON.parse(formData.availability)
    const current = availability[day]
    if (current.start || current.end) {
      // Remove custom times (back to all day)
      availability[day] = { available: true, start: null, end: null }
    } else {
      // Add default custom times
      availability[day] = { available: true, start: '09:00', end: '17:00' }
    }
    setFormData({ ...formData, availability: JSON.stringify(availability) })
  }

  const selectAllDays = () => {
    setFormData(prev => ({ ...prev, availability: JSON.stringify(getDefaultAvailability()) }))
  }

  const deselectAllDays = () => {
    const availability = {}
    daysOfWeek.forEach(day => { availability[day] = { available: false, start: null, end: null } })
    setFormData(prev => ({ ...prev, availability: JSON.stringify(availability) }))
  }

  const availabilitySummary = (() => {
    try {
      const parsed = JSON.parse(formData.availability)
      let allDay = 0, custom = 0, off = 0
      daysOfWeek.forEach(day => {
        const d = parsed[day]
        if (!d.available) off++
        else if (d.start || d.end) custom++
        else allDay++
      })
      if (allDay === 7) return 'Available all days'
      if (off === 7) return 'No availability set'
      const parts = []
      if (allDay > 0) parts.push(`${allDay} full day${allDay !== 1 ? 's' : ''}`)
      if (custom > 0) parts.push(`${custom} with set hours`)
      if (off > 0) parts.push(`${off} off`)
      return parts.join(', ')
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

              {/* Hours row */}
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
                    max={maxWeeklyHours}
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
                    max={maxWeeklyHours}
                    value={formData.max_hours}
                    onChange={(e) => setFormData({ ...formData, max_hours: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="40"
                  />
                  {maxWeeklyHours < 168 && (
                    <p className="text-xs text-gray-500 mt-1">Max {maxWeeklyHours}h/wk (legal limit)</p>
                  )}
                </div>
              </div>

              {/* Pay Type Toggle & Input - Only shown when adding new staff */}
              {!editingStaff && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Pay</label>
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
                  <p className="text-xs text-gray-400 mt-1.5">Pay can be edited later in Payroll</p>
                </div>
              )}

              {/* Pay info notice when editing */}
              {editingStaff && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm text-gray-500">Pay information is managed in the <span className="font-medium text-gray-700">Payroll</span> section</p>
                </div>
              )}

              {/* Availability */}
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
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs text-gray-500">Toggle day on/off, then optionally set specific hours</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={selectAllDays} className="text-xs font-medium text-pink-600 hover:text-pink-700">
                          All On
                        </button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={deselectAllDays} className="text-xs font-medium text-gray-600 hover:text-gray-700">
                          All Off
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {daysOfWeek.map((day) => {
                        const availability = JSON.parse(formData.availability)
                        const dayAvail = availability[day] || { available: true, start: null, end: null }
                        const hasCustomTimes = dayAvail.start || dayAvail.end

                        return (
                          <div
                            key={day}
                            className={`rounded-xl border transition-all ${
                              !dayAvail.available
                                ? 'bg-gray-50 border-gray-200'
                                : hasCustomTimes
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-green-50 border-green-200'
                            }`}
                          >
                            <div className="flex items-center justify-between px-3 py-2.5">
                              {/* Day name + toggle */}
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleDayAvailable(day)}
                                  className={`relative w-10 h-6 rounded-full transition-colors ${
                                    dayAvail.available ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                >
                                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    dayAvail.available ? 'left-[18px]' : 'left-0.5'
                                  }`} />
                                </button>
                                <span className={`text-sm font-medium ${dayAvail.available ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {day.substring(0, 3)}
                                </span>
                              </div>

                              {/* Right side: status or time pickers */}
                              {dayAvail.available ? (
                                <div className="flex items-center gap-2">
                                  {hasCustomTimes ? (
                                    <>
                                      <select
                                        value={dayAvail.start || '09:00'}
                                        onChange={(e) => updateAvailability(day, 'start', e.target.value)}
                                        className="text-xs border border-amber-300 rounded-lg px-2 py-1.5 bg-white text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                      >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                      <span className="text-xs text-gray-400">to</span>
                                      <select
                                        value={dayAvail.end || '17:00'}
                                        onChange={(e) => updateAvailability(day, 'end', e.target.value)}
                                        className="text-xs border border-amber-300 rounded-lg px-2 py-1.5 bg-white text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                      >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => toggleCustomTimes(day)}
                                        className="text-gray-400 hover:text-gray-600 ml-1"
                                        title="Remove custom times"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleCustomTimes(day)}
                                      className="text-xs font-medium text-pink-600 hover:text-pink-700 transition-colors px-2 py-1 rounded-lg hover:bg-pink-50"
                                    >
                                      Set hours
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Unavailable</span>
                              )}
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