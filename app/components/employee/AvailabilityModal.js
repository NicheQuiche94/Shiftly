'use client'

import { useState, useEffect } from 'react'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Generate time options in 15-min increments
const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    TIME_OPTIONS.push(`${hh}:${mm}`)
  }
}

function parseAvailability(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const converted = {}
    DAYS_OF_WEEK.forEach(day => {
      const d = parsed?.[day]
      if (!d) {
        converted[day] = { available: true, start: null, end: null }
      } else if ('available' in d) {
        converted[day] = { available: d.available, start: d.start || null, end: d.end || null }
      } else if ('AM' in d || 'PM' in d) {
        // Legacy AM/PM format
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
    const defaults = {}
    DAYS_OF_WEEK.forEach(day => { defaults[day] = { available: true, start: null, end: null } })
    return defaults
  }
}

export default function AvailabilityModal({ availability, onSave, onClose, isPending }) {
  const [form, setForm] = useState(() => parseAvailability(availability))

  useEffect(() => {
    setForm(parseAvailability(availability))
  }, [availability])

  const toggleDayAvailable = (day) => {
    setForm(prev => ({
      ...prev,
      [day]: { available: !prev[day].available, start: null, end: null }
    }))
  }

  const toggleCustomTimes = (day) => {
    setForm(prev => {
      const current = prev[day]
      if (current.start || current.end) {
        return { ...prev, [day]: { available: true, start: null, end: null } }
      } else {
        return { ...prev, [day]: { available: true, start: '09:00', end: '17:00' } }
      }
    })
  }

  const updateTime = (day, field, value) => {
    setForm(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900 font-cal">My Availability</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Toggle each day on or off. For days you're available, you can optionally set specific hours (e.g. school run, evening classes).
        </p>

        <div className="space-y-2 mb-6">
          {DAYS_OF_WEEK.map((day) => {
            const dayAvail = form[day] || { available: true, start: null, end: null }
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
                {/* Main row */}
                <div className="flex items-center justify-between px-4 py-3">
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
                    <span className={`font-medium ${dayAvail.available ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day}
                    </span>
                  </div>

                  {dayAvail.available ? (
                    <div className="flex items-center gap-2">
                      {hasCustomTimes ? (
                        <button
                          type="button"
                          onClick={() => toggleCustomTimes(day)}
                          className="text-xs font-medium text-amber-600 hover:text-amber-700"
                        >
                          {dayAvail.start} - {dayAvail.end}
                          <span className="ml-1 text-gray-400">&times;</span>
                        </button>
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

                {/* Time pickers row (only when custom times active) */}
                {dayAvail.available && hasCustomTimes && (
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <select
                      value={dayAvail.start || '09:00'}
                      onChange={(e) => updateTime(day, 'start', e.target.value)}
                      className="flex-1 text-sm border border-amber-300 rounded-lg px-2 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-sm text-gray-400">to</span>
                    <select
                      value={dayAvail.end || '17:00'}
                      onChange={(e) => updateTime(day, 'end', e.target.value)}
                      className="flex-1 text-sm border border-amber-300 rounded-lg px-2 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(JSON.stringify(form))}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition-all"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}