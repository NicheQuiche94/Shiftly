'use client'

import { useState } from 'react'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function parseShiftFromReason(reason) {
  if (!reason) return null
  // Extract shift info from reason like "Open swap: Close (15:00–23:00)"
  const match = reason.match(/(?:Open swap|Sick cover|Cover needed): (.+?) \((\d{2}:\d{2})[–-](\d{2}:\d{2})\)/)
  if (match) return { name: match[1], start: match[2], end: match[3] }
  return null
}

export default function OpenShiftsCard({ openShifts = [], onAccept, isAccepting }) {
  const [acceptingId, setAcceptingId] = useState(null)
  const [acceptedIds, setAcceptedIds] = useState(new Set())

  if (openShifts.length === 0) return null

  const handleAccept = async (requestId) => {
    setAcceptingId(requestId)
    try {
      await onAccept(requestId)
      setAcceptedIds(prev => new Set([...prev, requestId]))
    } finally {
      setAcceptingId(null)
    }
  }

  const typeLabels = {
    swap: { label: 'Swap', emoji: '🔄', bg: 'bg-pink-100', text: 'text-pink-700' },
    sick: { label: 'Sick Cover', emoji: '🤒', bg: 'bg-amber-100', text: 'text-amber-700' },
    cover: { label: 'Cover', emoji: '📋', bg: 'bg-blue-100', text: 'text-blue-700' }
  }

  const visibleShifts = openShifts.filter(s => !acceptedIds.has(s.id))

  if (visibleShifts.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900 font-cal text-sm sm:text-base">Available Shifts</h2>
          <span
            className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: '#FF1F7D' }}
          >
            {visibleShifts.length}
          </span>
        </div>
        <p className="text-xs text-gray-500">From your team</p>
      </div>

      <div className="divide-y divide-gray-100">
        {visibleShifts.map((request) => {
          const type = typeLabels[request.type] || typeLabels.cover
          const shiftInfo = parseShiftFromReason(request.reason)
          const isThisAccepting = acceptingId === request.id

          return (
            <div key={request.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type.bg} ${type.text}`}>
                      {type.emoji} {type.label}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(request.start_date)}</span>
                  </div>

                  {shiftInfo ? (
                    <p className="font-medium text-gray-900 text-sm">
                      {shiftInfo.name} · {shiftInfo.start} – {shiftInfo.end}
                    </p>
                  ) : (
                    <p className="font-medium text-gray-900 text-sm">
                      {request.reason?.substring(0, 60) || 'Shift available'}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-0.5">
                    From {request.staff?.name || 'a teammate'}
                    {request.staff?.role ? ` · ${request.staff.role}` : ''}
                  </p>
                </div>

                <button
                  onClick={() => handleAccept(request.id)}
                  disabled={isThisAccepting}
                  className="flex-shrink-0 px-3 py-1.5 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50"
                  style={{ background: '#FF1F7D' }}
                >
                  {isThisAccepting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Pick Up'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}