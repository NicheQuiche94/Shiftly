'use client'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function RequestsList({ requests = [] }) {
  const pending = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  if (pending.length === 0 && resolved.length === 0) return null

  return (
    <>
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-amber-800 mb-2 font-cal">
            Pending Requests ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 capitalize">{req.type}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-gray-600 text-xs mt-1">
                  {formatDate(req.start_date)}
                  {req.end_date && req.end_date !== req.start_date && ` → ${formatDate(req.end_date)}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2 font-cal">Recent Requests</h2>
          <div className="space-y-2">
            {resolved.slice(0, 5).map(req => (
              <div key={req.id} className={`rounded-lg p-3 text-sm ${
                req.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 capitalize">{req.type}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-gray-600 text-xs mt-1">
                  {formatDate(req.start_date)}
                  {req.end_date && req.end_date !== req.start_date && ` → ${formatDate(req.end_date)}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}