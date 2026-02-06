'use client'

import { useState, useEffect } from 'react'

function formatDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function SwapFlowModal({ shift, onSubmit, onClose, isPending }) {
  const [mode, setMode] = useState('open') // 'open' or 'specific'
  const [swapOptions, setSwapOptions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedColleague, setSelectedColleague] = useState(null)
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Fetch swap options only when switching to specific mode
  useEffect(() => {
    if (mode !== 'specific' || !shift?.date) return
    if (swapOptions) return // Already loaded

    setLoading(true)
    const fetchOptions = async () => {
      try {
        const res = await fetch(`/api/employee/swap-options?date=${shift.date}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setSwapOptions(data)
      } catch (err) {
        console.error('Failed to load swap options:', err)
        setSwapOptions({ working: [], available: [] })
      } finally {
        setLoading(false)
      }
    }
    fetchOptions()
  }, [mode, shift?.date, swapOptions])

  // Lock body scroll
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

  const handleSubmit = () => {
    if (mode === 'specific' && !selectedColleague) return

    const data = {
      type: 'swap',
      start_date: shift.date,
      end_date: shift.date,
      shift_id: shift.rota_id || null,
      swap_with_staff_id: mode === 'specific' ? selectedColleague.staff_id : null,
      reason: mode === 'open'
        ? `Open swap: ${shift.shift_name} (${shift.start_time}–${shift.end_time})${reason ? ` — ${reason}` : ''}`
        : `Swap ${shift.shift_name} (${shift.start_time}–${shift.end_time}) with ${selectedColleague.staff_name}${selectedColleague.shift_name ? ` on ${selectedColleague.shift_name} (${selectedColleague.start_time}–${selectedColleague.end_time})` : ' (not scheduled)'}${reason ? ` — ${reason}` : ''}`
    }

    onSubmit(data)
    setSubmitted(true)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 pointer-events-none">
        <div
          className="pointer-events-auto bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl animate-slide-up sm:animate-none max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-5 pt-3 sm:pt-5 pb-5">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 font-cal">Request Swap</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FFF0F5' }}>
                  <svg className="w-8 h-8" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 font-cal mb-1">
                  {mode === 'open' ? 'Shift Posted' : 'Swap Requested'}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {mode === 'open'
                    ? 'Your team can now see this shift and pick it up'
                    : 'Your manager will review this shortly'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all"
                  style={{ background: '#FF1F7D' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Your shift summary */}
                <div className="bg-pink-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Your shift</p>
                  <p className="font-medium text-gray-900">{shift.shift_name}</p>
                  <p className="text-sm text-gray-600">{formatDay(shift.date)} · {shift.start_time} – {shift.end_time}</p>
                </div>

                {/* Mode toggle */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">How do you want to swap?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setMode('open'); setSelectedColleague(null) }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        mode === 'open'
                          ? 'border-pink-300 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="font-medium text-gray-900 text-sm">Open to team</p>
                      <p className="text-xs text-gray-500">Anyone can pick it up</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('specific')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        mode === 'specific'
                          ? 'border-pink-300 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <p className="font-medium text-gray-900 text-sm">Specific person</p>
                      <p className="text-xs text-gray-500">Choose who to swap with</p>
                    </button>
                  </div>
                </div>

                {/* Specific person selection */}
                {mode === 'specific' && (
                  <>
                    {loading ? (
                      <div className="py-6 text-center">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Finding colleagues...</p>
                      </div>
                    ) : (
                      <>
                        {swapOptions?.working?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Working this day</p>
                            <div className="space-y-2">
                              {swapOptions.working.map((colleague, i) => {
                                const isSelected = selectedColleague?.staff_id === colleague.staff_id
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedColleague(isSelected ? null : colleague)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                      isSelected
                                        ? 'border-pink-300 bg-pink-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                      <span className="text-sm font-medium text-gray-600">
                                        {colleague.staff_name.charAt(0)}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 text-sm">{colleague.staff_name}</p>
                                      <p className="text-xs text-gray-500">
                                        {colleague.shift_name} · {colleague.start_time} – {colleague.end_time} ({colleague.hours}h)
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#FF1F7D' }} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {swapOptions?.available?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Not scheduled this day</p>
                            <div className="space-y-2">
                              {swapOptions.available.map((colleague, i) => {
                                const isSelected = selectedColleague?.staff_id === colleague.staff_id
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedColleague(isSelected ? null : colleague)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                      isSelected
                                        ? 'border-pink-300 bg-pink-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                      <span className="text-sm font-medium text-gray-600">
                                        {colleague.staff_name.charAt(0)}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 text-sm">{colleague.staff_name}</p>
                                      <p className="text-xs text-gray-500">{colleague.role} · Day off</p>
                                    </div>
                                    {isSelected && (
                                      <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#FF1F7D' }} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {swapOptions?.working?.length === 0 && swapOptions?.available?.length === 0 && (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">No colleagues found for this day</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Note (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none bg-white text-gray-900"
                    placeholder={mode === 'open'
                      ? 'e.g., Happy to swap with anyone, or just need cover'
                      : 'e.g., We\'ve already discussed and agreed to swap'}
                  />
                </div>

                {/* Submit */}
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
                    onClick={handleSubmit}
                    disabled={(mode === 'specific' && !selectedColleague) || isPending}
                    className="flex-1 px-4 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition-all"
                    style={{ background: '#FF1F7D' }}
                  >
                    {isPending ? 'Sending...' : mode === 'open' ? 'Post to Team' : 'Request Swap'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}