'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function RequestsTab({ selectedTeamId }) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    staff_id: '',
    type: 'holiday',
    start_date: '',
    end_date: '',
    reason: ''
  })

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', selectedTeamId],
    queryFn: async () => {
      const url = selectedTeamId
        ? `/api/requests?team_id=${selectedTeamId}`
        : '/api/requests'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', selectedTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedTeamId,
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, manager_notes }) => {
      const res = await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, manager_notes }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] }),
  })

  const resetForm = () => setFormData({ staff_id: '', type: 'holiday', start_date: '', end_date: '', reason: '' })

  // Only show incoming requests
  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(r => r.direction === 'incoming')
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter)
    return filtered
  }, [requests, statusFilter])

  const groupedRequests = useMemo(() => {
    const groups = { holiday: [], sick: [], swap: [], cover: [] }
    filteredRequests.forEach(req => { if (groups[req.type]) groups[req.type].push(req) })
    return groups
  }, [filteredRequests])

  const counts = useMemo(() => ({
    pending: requests.filter(r => r.direction === 'incoming' && r.status === 'pending').length
  }), [requests])

  const openModal = () => {
    resetForm()
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      team_id: selectedTeamId,
      staff_id: parseInt(formData.staff_id),
      type: formData.type,
      direction: 'incoming',
      start_date: formData.start_date,
      end_date: formData.end_date || formData.start_date,
      reason: formData.reason,
    })
  }

  const handleApprove = (id) => updateMutation.mutate({ id, status: 'approved' })
  const handleReject = (id) => {
    const notes = prompt('Reason for rejection (optional):')
    updateMutation.mutate({ id, status: 'rejected', manager_notes: notes || undefined })
  }

  const typeConfig = {
    holiday: { 
      label: 'Holiday Requests', 
      icon: (
        <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200', 
      badgeColor: 'bg-blue-100 text-blue-700', 
      description: 'Time off and vacation requests' 
    },
    sick: { 
      label: 'Sick Leave', 
      icon: (
        <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200', 
      badgeColor: 'bg-red-100 text-red-700', 
      description: 'Illness and medical leave' 
    },
    swap: { 
      label: 'Shift Swaps', 
      icon: (
        <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      bgColor: 'bg-purple-50', 
      borderColor: 'border-purple-200', 
      badgeColor: 'bg-purple-100 text-purple-700', 
      description: 'Staff wanting to swap shifts' 
    },
    cover: { 
      label: 'Cover Requests', 
      icon: (
        <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      bgColor: 'bg-orange-50', 
      borderColor: 'border-orange-200', 
      badgeColor: 'bg-orange-100 text-orange-700', 
      description: 'Requests for shift coverage' 
    },
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status) => {
    const styles = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  const renderRequestCard = (req) => (
    <div key={req.id} className={`border rounded-lg p-4 transition-all ${req.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {req.staff?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{req.staff?.name || 'Unknown'}</span>
              {getStatusBadge(req.status)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {req.start_date && (
                <span>{formatDate(req.start_date)}{req.end_date && req.end_date !== req.start_date && <> → {formatDate(req.end_date)}</>}</span>
              )}
            </div>
            {req.reason && <p className="text-sm text-gray-500 mt-1 line-clamp-2">"{req.reason}"</p>}
            {req.manager_notes && req.status === 'rejected' && <p className="text-sm text-red-600 mt-1">Manager note: {req.manager_notes}</p>}
          </div>
        </div>
        {req.status === 'pending' && (
          <div className="flex items-center gap-2 ml-13 sm:ml-0">
            <button onClick={() => handleApprove(req.id)} disabled={updateMutation.isPending} className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">Approve</button>
            <button onClick={() => handleReject(req.id)} disabled={updateMutation.isPending} className="px-3 py-1.5 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50">Reject</button>
          </div>
        )}
      </div>
    </div>
  )

  const renderTypeSection = (type, config, reqs) => {
    if (reqs.length === 0) return null
    return (
      <div key={type} className={`rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            {config.icon}
            <h3 className="font-semibold text-gray-900 font-cal">{config.label}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeColor}`}>{reqs.length}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <div className="p-3 space-y-2">{reqs.map(renderRequestCard)}</div>
      </div>
    )
  }

  const hasAnyRequests = Object.values(groupedRequests).some(arr => arr.length > 0)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <div className="flex gap-1">
              {['pending', 'approved', 'rejected', 'all'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === f ? 'bg-pink-100 text-pink-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={openModal} className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all text-sm">
            + Log Request
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" /></div>
          ) : !hasAnyRequests ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-1">No incoming requests</p>
              <p className="text-sm text-gray-500">Staff requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {renderTypeSection('holiday', typeConfig.holiday, groupedRequests.holiday)}
              {renderTypeSection('sick', typeConfig.sick, groupedRequests.sick)}
              {renderTypeSection('swap', typeConfig.swap, groupedRequests.swap)}
              {renderTypeSection('cover', typeConfig.cover, groupedRequests.cover)}
            </div>
          )}
        </div>
      </div>

      {/* Create Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-cal">Log Staff Request</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Staff Member</label>
                  <select required value={formData.staff_id} onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white">
                    <option value="">Select staff member</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Request Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { 
                        id: 'holiday', 
                        label: 'Holiday',
                        icon: (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                          </svg>
                        )
                      },
                      { 
                        id: 'sick', 
                        label: 'Sick Leave',
                        icon: (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      },
                      { 
                        id: 'swap', 
                        label: 'Shift Swap',
                        icon: (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        )
                      },
                      { 
                        id: 'cover', 
                        label: 'Cover',
                        icon: (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        )
                      }
                    ].map((type) => (
                      <button key={type.id} type="button" onClick={() => setFormData({ ...formData, type: type.id })} className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${formData.type === type.id ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {type.icon}
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
                    <input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} min={formData.start_date} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Reason (optional)</label>
                  <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white resize-none" placeholder="Add any notes..." />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all disabled:opacity-50">
                  {createMutation.isPending ? 'Saving...' : 'Log Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}