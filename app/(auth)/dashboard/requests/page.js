'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import TeamSelector from '@/app/components/TeamSelector'

export default function RequestsPage() {
  const queryClient = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [activeTab, setActiveTab] = useState('incoming') // 'incoming', 'outgoing'
  const [statusFilter, setStatusFilter] = useState('pending') // 'pending', 'approved', 'rejected', 'all'
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('incoming') // which type of request to create
  const [formData, setFormData] = useState({
    staff_id: '',
    type: 'holiday',
    start_date: '',
    end_date: '',
    reason: ''
  })

  // Fetch requests
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['requests', selectedTeamId],
    queryFn: async () => {
      const url = selectedTeamId 
        ? `/api/requests?team_id=${selectedTeamId}`
        : '/api/requests'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch requests')
      return response.json()
    }
  })

  // Fetch staff for the dropdown
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', selectedTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to fetch staff')
      return response.json()
    },
    enabled: !!selectedTeamId
  })

  // Create request mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to create request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      setShowModal(false)
      resetForm()
    }
  })

  // Update request mutation (approve/reject)
  const updateMutation = useMutation({
    mutationFn: async ({ id, status, manager_notes }) => {
      const response = await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, manager_notes })
      })
      if (!response.ok) throw new Error('Failed to update request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
    }
  })

  const resetForm = () => {
    setFormData({
      staff_id: '',
      type: 'holiday',
      start_date: '',
      end_date: '',
      reason: ''
    })
  }

  // Filter requests by direction and status
  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(r => r.direction === activeTab)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }
    return filtered
  }, [requests, activeTab, statusFilter])

  // Group requests by type
  const groupedRequests = useMemo(() => {
    const groups = {
      holiday: [],
      sick: [],
      swap: [],
      cover: []
    }
    
    filteredRequests.forEach(req => {
      if (groups[req.type]) {
        groups[req.type].push(req)
      }
    })
    
    return groups
  }, [filteredRequests])

  // Count by direction and status
  const counts = useMemo(() => ({
    incoming: {
      pending: requests.filter(r => r.direction === 'incoming' && r.status === 'pending').length,
      total: requests.filter(r => r.direction === 'incoming').length
    },
    outgoing: {
      pending: requests.filter(r => r.direction === 'outgoing' && r.status === 'pending').length,
      total: requests.filter(r => r.direction === 'outgoing').length
    }
  }), [requests])

  const openModal = (direction) => {
    setModalType(direction)
    resetForm()
    if (direction === 'outgoing') {
      setFormData(prev => ({ ...prev, type: 'cover' }))
    }
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      team_id: selectedTeamId,
      staff_id: parseInt(formData.staff_id),
      type: formData.type,
      direction: modalType,
      start_date: formData.start_date,
      end_date: formData.end_date || formData.start_date,
      reason: formData.reason
    })
  }

  const handleApprove = (id) => {
    updateMutation.mutate({ id, status: 'approved' })
  }

  const handleReject = (id) => {
    const notes = prompt('Reason for rejection (optional):')
    updateMutation.mutate({ id, status: 'rejected', manager_notes: notes || undefined })
  }

  const typeConfig = {
    holiday: {
      label: 'Holiday Requests',
      icon: '🌴',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-100 text-blue-700',
      description: 'Time off and vacation requests'
    },
    sick: {
      label: 'Sick Leave',
      icon: '🤒',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor: 'bg-red-100 text-red-700',
      description: 'Illness and medical leave'
    },
    swap: {
      label: 'Shift Swaps',
      icon: '🔄',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      badgeColor: 'bg-purple-100 text-purple-700',
      description: 'Staff wanting to swap shifts'
    },
    cover: {
      label: 'Cover Requests',
      icon: '🙋',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badgeColor: 'bg-orange-100 text-orange-700',
      description: 'Requests for shift coverage'
    }
  }

  const outgoingTypeConfig = {
    cover: {
      label: 'Cover Assignments',
      icon: '📋',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badgeColor: 'bg-orange-100 text-orange-700',
      description: 'Asking staff to cover shifts'
    },
    availability: {
      label: 'Availability Requests',
      icon: '📅',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-100 text-green-700',
      description: 'Requesting availability updates'
    }
  }

  const getStatusBadge = (status) => {
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

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const renderRequestCard = (req) => (
    <div 
      key={req.id}
      className={`border rounded-lg p-4 transition-all ${
        req.status === 'pending' 
          ? 'border-amber-200 bg-amber-50/30' 
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {req.staff?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">
                {req.staff?.name || 'Unknown'}
              </span>
              {getStatusBadge(req.status)}
            </div>
            
            <div className="text-sm text-gray-600 mt-1">
              {req.start_date && (
                <span>
                  {formatDate(req.start_date)}
                  {req.end_date && req.end_date !== req.start_date && (
                    <> → {formatDate(req.end_date)}</>
                  )}
                </span>
              )}
            </div>
            
            {req.reason && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                "{req.reason}"
              </p>
            )}

            {req.manager_notes && req.status === 'rejected' && (
              <p className="text-sm text-red-600 mt-1">
                Manager note: {req.manager_notes}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {req.status === 'pending' && (
          <div className="flex items-center gap-2 ml-13 sm:ml-0">
            <button
              onClick={() => handleApprove(req.id)}
              disabled={updateMutation.isPending}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(req.id)}
              disabled={updateMutation.isPending}
              className="px-3 py-1.5 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderTypeSection = (type, config, requests) => {
    if (requests.length === 0) return null
    
    return (
      <div key={type} className={`rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.icon}</span>
              <h3 className="font-semibold text-gray-900 font-cal">{config.label}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeColor}`}>
                {requests.length}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <div className="p-3 space-y-2">
          {requests.map(renderRequestCard)}
        </div>
      </div>
    )
  }

  const hasAnyRequests = Object.values(groupedRequests).some(arr => arr.length > 0)

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Back to Dashboard */}
      <Link 
        href="/dashboard" 
        className="inline-flex items-center text-pink-600 hover:text-pink-700 transition-colors mb-4 sm:mb-6 font-medium text-sm sm:text-base"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 font-cal">
            Requests
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Manage staff requests and send coverage assignments
          </p>
        </div>
      </div>

      {/* Team Selector */}
      <div className="mb-6">
        <TeamSelector 
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      </div>

      {!selectedTeamId ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-1">Select a team to view requests</p>
          <p className="text-sm text-gray-500">Choose a team from the dropdown above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Tabs: Incoming / Outgoing */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('incoming')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all ${
                    activeTab === 'incoming'
                      ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <span>Incoming</span>
                  {counts.incoming.pending > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {counts.incoming.pending}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('outgoing')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all ${
                    activeTab === 'outgoing'
                      ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Outgoing</span>
                  {counts.outgoing.pending > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {counts.outgoing.pending}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-4 sm:px-6 py-3 bg-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <div className="flex gap-1">
                  {[
                    { id: 'pending', label: 'Pending' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'rejected', label: 'Rejected' },
                    { id: 'all', label: 'All' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setStatusFilter(filter.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === filter.id
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* New Request Button */}
              <button
                onClick={() => openModal(activeTab)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all text-sm"
              >
                + {activeTab === 'incoming' ? 'Log Request' : 'Send Request'}
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {requestsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
                </div>
              ) : !hasAnyRequests ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-1">
                    No {activeTab} requests
                  </p>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'incoming' 
                      ? 'Staff requests will appear here'
                      : 'Send coverage requests to your team'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTab === 'incoming' ? (
                    <>
                      {renderTypeSection('holiday', typeConfig.holiday, groupedRequests.holiday)}
                      {renderTypeSection('sick', typeConfig.sick, groupedRequests.sick)}
                      {renderTypeSection('swap', typeConfig.swap, groupedRequests.swap)}
                      {renderTypeSection('cover', typeConfig.cover, groupedRequests.cover)}
                    </>
                  ) : (
                    <>
                      {renderTypeSection('cover', outgoingTypeConfig.cover, groupedRequests.cover)}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-cal">
                {modalType === 'incoming' ? 'Log Staff Request' : 'Send Request to Staff'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Staff Member */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {modalType === 'incoming' ? 'Staff Member' : 'Send To'}
                  </label>
                  <select
                    required
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="">Select staff member</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Request Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Request Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {modalType === 'incoming' ? (
                      <>
                        {[
                          { id: 'holiday', label: 'Holiday', icon: '🌴' },
                          { id: 'sick', label: 'Sick Leave', icon: '🤒' },
                          { id: 'swap', label: 'Shift Swap', icon: '🔄' },
                          { id: 'cover', label: 'Cover', icon: '🙋' }
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: type.id })}
                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                              formData.type === type.id
                                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span className="mr-1.5">{type.icon}</span>
                            {type.label}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {[
                          { id: 'cover', label: 'Cover Shift', icon: '📋' },
                          { id: 'availability', label: 'Update Availability', icon: '📅' }
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: type.id })}
                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                              formData.type === type.id
                                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span className="mr-1.5">{type.icon}</span>
                            {type.label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      {formData.type === 'availability' ? 'Response By' : 'Start Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                  {formData.type !== 'availability' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        min={formData.start_date}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Reason/Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {modalType === 'incoming' ? 'Reason (optional)' : 'Message'}
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white resize-none"
                    placeholder={modalType === 'incoming' ? 'Add any notes...' : 'Add a message for the staff member...'}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : (modalType === 'incoming' ? 'Log Request' : 'Send Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}