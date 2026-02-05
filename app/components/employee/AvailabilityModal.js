'use client'

import { useState, useEffect } from 'react'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function parseAvailability(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const converted = {}
    DAYS_OF_WEEK.forEach(day => {
      if (typeof parsed?.[day] === 'boolean') {
        converted[day] = { AM: parsed[day], PM: parsed[day] }
      } else if (parsed?.[day] && typeof parsed[day] === 'object') {
        converted[day] = parsed[day]
      } else {
        converted[day] = { AM: true, PM: true }
      }
    })
    return converted
  } catch {
    const defaults = {}
    DAYS_OF_WEEK.forEach(day => { defaults[day] = { AM: true, PM: true } })
    return defaults
  }
}

export default function AvailabilityModal({ availability, onSave, onClose, isPending }) {
  const [form, setForm] = useState(() => parseAvailability(availability))

  useEffect(() => {
    setForm(parseAvailability(availability))
  }, [availability])

  const toggle = (day, period) => {
    setForm(prev => ({
      ...prev,
      [day]: { ...prev[day], [period]: !prev[day]?.[period] }
    }))
  }

  const toggleFullDay = (day) => {
    const current = form[day] || { AM: true, PM: true }
    const allOn = current.AM && current.PM
    setForm(prev => ({ ...prev, [day]: { AM: !allOn, PM: !allOn } }))
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
          Select when you're available to work. Tap the day to toggle all, or choose AM/PM individually.
        </p>

        <div className="space-y-2 mb-6">
          {DAYS_OF_WEEK.map((day) => {
            const dayAvail = form[day] || { AM: true, PM: true }
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
                    {['AM', 'PM'].map(period => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => toggle(day, period)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          dayAvail[period]
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
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