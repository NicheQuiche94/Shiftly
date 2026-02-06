'use client'

import { useEffect } from 'react'

const SHIFT_COLOURS = [
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', accent: 'bg-pink-500' },
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', accent: 'bg-blue-500' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', accent: 'bg-green-500' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', accent: 'bg-purple-500' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', accent: 'bg-amber-500' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800', accent: 'bg-teal-500' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', accent: 'bg-orange-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', accent: 'bg-indigo-500' },
]

function formatDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ShiftDetailModal({ shift, colourMap = {}, onClose, onRequestSwap, onRequestCover, onRequestTimeOff }) {
  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  // Close on escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!shift) return null

  const colour = colourMap[shift.shift_name] || SHIFT_COLOURS[0]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom sheet (mobile) / Centered modal (desktop) */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 pointer-events-none">
        <div
          className="pointer-events-auto bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl animate-slide-up sm:animate-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Shift colour bar */}
          <div className={`mx-4 mt-3 sm:mt-4 rounded-xl ${colour.bg} ${colour.border} border p-4`}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={`text-lg font-bold ${colour.text} font-cal`}>{shift.shift_name}</h2>
              <span className={`text-sm font-semibold ${colour.text}`}>{shift.hours}h</span>
            </div>
            <p className={`text-sm ${colour.text} opacity-80`}>
              {shift.start_time} – {shift.end_time}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {formatDay(shift.date)}
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-2">
            <button
              onClick={() => onRequestSwap?.(shift)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-pink-200 transition-all text-left"
            >
              <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Request Swap</p>
                <p className="text-xs text-gray-500">Swap this shift with a colleague</p>
              </div>
            </button>

            <button
              onClick={() => onRequestCover?.(shift)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-pink-200 transition-all text-left"
            >
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Request Cover</p>
                <p className="text-xs text-gray-500">Ask someone to cover this shift</p>
              </div>
            </button>

            <button
              onClick={() => onRequestTimeOff?.(shift)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-pink-200 transition-all text-left"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Book Time Off</p>
                <p className="text-xs text-gray-500">Request time off around this shift</p>
              </div>
            </button>
          </div>

          {/* Close button */}
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}