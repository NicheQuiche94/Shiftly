'use client'

import { useState } from 'react'

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function RequestModal({ shifts, onSubmit, onClose, isPending }) {
  const [type, setType] = useState('holiday')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [reason, setReason] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentYear, currentMonth, day)
    clickedDate.setHours(0, 0, 0, 0)

    if (clickedDate < today) return // Can't select past dates

    if (type === 'sick') {
      setStartDate(clickedDate)
      setEndDate(clickedDate)
      return
    }

    // Holiday range selection
    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate)
      setEndDate(null)
    } else {
      if (clickedDate < startDate) {
        setStartDate(clickedDate)
        setEndDate(null)
      } else {
        setEndDate(clickedDate)
      }
    }
  }

  const isDateInRange = (day) => {
    if (!startDate) return false
    const date = new Date(currentYear, currentMonth, day)
    date.setHours(0, 0, 0, 0)
    
    if (!endDate) return date.getTime() === startDate.getTime()
    return date >= startDate && date <= endDate
  }

  const isDateStart = (day) => {
    if (!startDate) return false
    const date = new Date(currentYear, currentMonth, day)
    return date.getTime() === startDate.getTime()
  }

  const isDateEnd = (day) => {
    if (!endDate) return false
    const date = new Date(currentYear, currentMonth, day)
    return date.getTime() === endDate.getTime()
  }

  const isPastDate = (day) => {
    const date = new Date(currentYear, currentMonth, day)
    date.setHours(0, 0, 0, 0)
    return date < today
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!startDate) return

    onSubmit({
      type,
      start_date: startDate.toISOString().split('T')[0],
      end_date: (endDate || startDate).toISOString().split('T')[0],
      reason
    })
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const getDayCount = () => {
    if (!startDate || !endDate) return 0
    const diff = endDate - startDate
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 font-cal">Book Time Off</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('holiday')
                  setStartDate(null)
                  setEndDate(null)
                }}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  type === 'holiday'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Holiday
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('sick')
                  setStartDate(null)
                  setEndDate(null)
                }}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  type === 'sick'
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Sick
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'sick' ? 'Select date' : 'Select date range'}
            </label>
            
            <div className="border border-gray-200 rounded-lg p-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="font-semibold text-gray-900">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const inRange = isDateInRange(day)
                  const isStart = isDateStart(day)
                  const isEnd = isDateEnd(day)
                  const isPast = isPastDate(day)

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      disabled={isPast}
                      className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all ${
                        isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : inRange
                          ? isStart || isEnd
                            ? 'text-white font-bold'
                            : 'bg-pink-100 text-pink-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      style={isStart || isEnd ? { background: '#FF1F7D' } : {}}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selection summary */}
            {startDate && (
              <div className="mt-2 px-3 py-2 bg-pink-50 rounded-lg text-sm">
                {type === 'sick' ? (
                  <p className="text-gray-700">
                    <span className="font-medium">Selected:</span> {startDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                ) : endDate ? (
                  <p className="text-gray-700">
                    <span className="font-medium">{getDayCount()} day{getDayCount() > 1 ? 's' : ''}:</span>{' '}
                    {startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                ) : (
                  <p className="text-gray-500">
                    Click an end date
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === 'holiday' ? 'e.g., Family vacation' : 'e.g., Flu symptoms'}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none bg-white text-gray-900"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!startDate || isPending}
              className="flex-1 px-4 py-3 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50"
              style={{ background: '#FF1F7D' }}
            >
              {isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}