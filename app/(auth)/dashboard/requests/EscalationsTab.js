'use client'

import { useQuery } from '@tanstack/react-query'

export default function EscalationsTab() {
  const { data: escalationData = { escalations: [] }, isLoading } = useQuery({
    queryKey: ['escalations'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/escalations')
      if (!res.ok) return { escalations: [] }
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <h3 className="font-bold text-gray-900 font-cal">Unclaimed Shifts</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">Swap and cover requests open for 24+ hours with no pickup</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : escalationData.escalations?.length === 0 ? (
        <div className="text-center py-10 px-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">All clear</p>
          <p className="text-gray-400 text-xs mt-1">No stale requests need attention right now</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {escalationData.escalations.map((esc) => {
            const hoursOpen = Math.round((Date.now() - new Date(esc.created_at).getTime()) / (1000 * 60 * 60))
            return (
              <div key={esc.id} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${hoursOpen > 48 ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <span className="text-lg">{esc.type === 'swap' ? '🔄' : esc.type === 'sick' ? '🤒' : '🙋'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{esc.staff_name || 'Unknown'} — {esc.type}</p>
                  <p className="text-xs text-gray-500">{esc.start_date ? formatDate(esc.start_date) : 'No date'} · Open for {hoursOpen}h</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${hoursOpen > 48 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {hoursOpen > 48 ? 'Critical' : 'Attention'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}