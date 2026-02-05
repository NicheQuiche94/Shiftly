'use client'

import { useState } from 'react'

function formatShiftForSelect(shift) {
  const date = new Date(shift.date).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
  return `${date} - ${shift.shift_name} (${shift.start_time}-${shift.end_time})`
}

export default function RequestModal({ shifts = [], onSubmit, onClose, isPending }) {
  const [formData, setFormData] = useState({
    type: 'holiday',
    start_date: '',
    end_date: '',
    reason: '',
    swap_shift: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    let reason = formData.reason
    let startDate = formData.start_date
    let endDate = formData.end_date

    if (formData.type === 'swap' && formData.swap_shift) {
      const selectedShift = shifts.find(s => formatShiftForSelect(s) === formData.swap_shift)
      if (selectedShift) {
        startDate = selectedShift.date
        endDate = selectedShift.date
      }
      reason = `Shift to swap: ${formData.swap_shift}${reason ? ` - ${reason}` : ''}`
    }

    onSubmit({
      type: formData.type,
      start_date: startDate,
      end_date: endDate || startDate,
      reason
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900 font-cal">Request Time Off</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Request Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'holiday', label: '🌴 Holiday' },
                  { id: 'sick', label: '🤒 Sick' },
                  { id: 'swap', label: '🔄 Swap' }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.id, swap_shift: '' })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.type === type.id
                        ? 'bg-pink-100 text-pink-700 border-2 border-pink-300'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shift Selector — Swap only */}
            {formData.type === 'swap' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Which shift do you want to swap?
                </label>
                {shifts.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">No upcoming shifts to swap</p>
                ) : (
                  <select
                    required
                    value={formData.swap_shift}
                    onChange={(e) => setFormData({ ...formData, swap_shift: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select a shift...</option>
                    {shifts.map((shift, idx) => (
                      <option key={idx} value={formatShiftForSelect(shift)}>
                        {formatShiftForSelect(shift)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Dates — non-swap only */}
            {formData.type !== 'swap' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">First day off</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Last day off</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional for single day</p>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {formData.type === 'swap' ? 'Additional notes (optional)' : 'Reason (optional)'}
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none bg-white text-gray-900"
                placeholder={formData.type === 'swap' ? 'e.g., Willing to swap with anyone on Thursday' : 'Add any notes...'}
              />
            </div>
          </div>

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
              disabled={isPending || (formData.type === 'swap' && !formData.swap_shift)}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition-all"
            >
              {isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}