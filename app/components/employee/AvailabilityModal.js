'use client'

import { useState, useEffect } from 'react'
import StaffAvailabilityGrid from '@/app/components/template/StaffAvailabilityGrid'

export default function AvailabilityModal({ teamId, availabilityGrid, preferredShiftLengths, onSave, onClose, isPending }) {
  const [grid, setGrid] = useState(() => availabilityGrid || {})
  const [templateData, setTemplateData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setGrid(availabilityGrid || {})
  }, [availabilityGrid])

  // Fetch team template data to know shift slots
  useEffect(() => {
    if (!teamId) { setLoading(false); return }
    fetch(`/api/teams/${teamId}/template`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setTemplateData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [teamId])

  const weekDays = {}
  const templates = {}
  const shiftLengths = []

  if (templateData) {
    const wt = templateData.week_template || {}
    const dt = templateData.day_templates || {}
    const sl = templateData.shift_lengths || [4, 6, 8, 10, 12]

    Object.keys(wt).forEach(d => { weekDays[d] = wt[d] })
    Object.keys(dt).forEach(name => { templates[name] = dt[name] })
    sl.forEach(l => shiftLengths.push(l))
  }

  const hasTemplates = Object.keys(weekDays).length > 0 && Object.keys(templates).length > 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900 font-cal">My Availability</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Toggle each shift slot to show when you can work. Green means available, grey means unavailable.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : hasTemplates ? (
          <StaffAvailabilityGrid
            weekDays={weekDays}
            templates={templates}
            shiftLengths={shiftLengths}
            preferredLengths={preferredShiftLengths || []}
            availabilityGrid={grid}
            onChange={setGrid}
          />
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">No shift templates have been set up for your team yet.</p>
            <p className="text-xs text-gray-400 mt-1">Ask your manager to configure templates in the Workspace.</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(grid)}
            disabled={isPending || !hasTemplates}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition-all"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
