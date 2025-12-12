'use client'

import { useState, useMemo } from 'react'
import { useUser, useClerk, SignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

export default function EmployeeDashboard() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [formData, setFormData] = useState({
    type: 'holiday',
    start_date: '',
    end_date: '',
    reason: ''
  })

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Fetch employee's staff profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employee-profile'],
    queryFn: async () => {
      const response = await fetch('/api/employee/profile')
      if (!response.ok) {
        if (response.status === 404) {
          return null // No profile linked
        }
        throw new Error('Failed to fetch profile')
      }
      return response.json()
    },
    enabled: isLoaded && isSignedIn
  })

  // Fetch employee's upcoming shifts from approved rotas
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['employee-shifts', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/employee/shifts')
      if (!response.ok) throw new Error('Failed to fetch shifts')
      return response.json()
    },
    enabled: !!profile?.id
  })

  // Fetch employee's requests
  const { data: requests = [] } = useQuery({
    queryKey: ['employee-requests', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/employee/requests')
      if (!response.ok) throw new Error('Failed to fetch requests')
      return response.json()
    },
    enabled: !!profile?.id
  })

  // Submit request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/employee/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to submit request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      setShowRequestModal(false)
      setFormData({ type: 'holiday', start_date: '', end_date: '', reason: '' })
    }
  })

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (availability) => {
      const response = await fetch('/api/employee/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability })
      })
      if (!response.ok) throw new Error('Failed to update availability')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] })
      setShowAvailabilityModal(false)
    }
  })

  const [availabilityForm, setAvailabilityForm] = useState({})

  // Initialize availability form when profile loads
  useMemo(() => {
    if (profile?.availability) {
      try {
        setAvailabilityForm(JSON.parse(profile.availability))
      } catch {
        setAvailabilityForm({
          Monday: true, Tuesday: true, Wednesday: true, Thursday: true,
          Friday: true, Saturday: true, Sunday: true
        })
      }
    }
  }, [profile?.availability])

  const handleSubmitRequest = (e) => {
    e.preventDefault()
    submitRequestMutation.mutate({
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date || formData.start_date,
      reason: formData.reason
    })
  }

  const handleUpdateAvailability = () => {
    updateAvailabilityMutation.mutate(JSON.stringify(availabilityForm))
  }

  const toggleAvailability = (day) => {
    setAvailabilityForm(prev => ({
      ...prev,
      [day]: !prev[day]
    }))
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const firstName = user?.firstName || profile?.name?.split(' ')[0] || 'there'

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
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

  // Loading state
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </main>
    )
  }

  // Not signed in - show sign-in page
  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-bold text-gray-900">Shiftly</span>
            </Link>
          </div>
        </header>

        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Employee Sign In</h1>
            <p className="text-gray-600">
              Sign in to view your schedule and submit requests
            </p>
          </div>
          
          <div className="flex justify-center">
            <SignIn 
              routing="hash"
              afterSignInUrl="/employee"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-none border border-gray-200",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "border-gray-300",
                  formButtonPrimary: "bg-gradient-to-r from-pink-500 to-pink-600 hover:shadow-lg hover:shadow-pink-500/25",
                }
              }}
            />
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? Ask your manager for an invite link.
          </p>
        </div>
      </main>
    )
  }

  // Loading profile
  if (profileLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </main>
    )
  }

  // No profile linked - show error
  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account Not Linked</h1>
          <p className="text-gray-600 mb-6">
            Your account isn't linked to a staff profile yet. Please ask your manager for an invite link.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => signOut(() => router.push('/'))}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
            <Link 
              href="/"
              className="text-sm text-pink-600 hover:text-pink-700"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Shiftly</span>
          </div>
          <button
            onClick={() => signOut(() => router.push('/'))}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Hi, {firstName}! 👋</h1>
          <p className="text-gray-600">{profile.role} · {profile.contracted_hours}h/week</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-pink-200 transition-all"
          >
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Request Time Off</p>
            <p className="text-xs text-gray-500">Holiday, sick, swap</p>
          </button>

          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-pink-200 transition-all"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">My Availability</p>
            <p className="text-xs text-gray-500">Update your schedule</p>
          </button>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-amber-800 mb-2">
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 capitalize">{req.type}</span>
                    {getStatusBadge(req.status)}
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

        {/* Upcoming Shifts */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Upcoming Shifts</h2>
          </div>
          
          {shiftsLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : shifts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No upcoming shifts</p>
              <p className="text-sm text-gray-500">Your schedule will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {shifts.slice(0, 7).map((shift, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(shift.date)}</p>
                    <p className="text-sm text-gray-500">{shift.shift_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{shift.start_time} - {shift.end_time}</p>
                    <p className="text-sm text-gray-500">{shift.hours}h</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">Request Time Off</h2>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitRequest}>
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
                        onClick={() => setFormData({ ...formData, type: type.id })}
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

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">From</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">To</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Reason (optional)</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                    placeholder="Add any notes..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitRequestMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {submitRequestMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">My Availability</h2>
              <button 
                onClick={() => setShowAvailabilityModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Select the days you're available to work. Your manager will be notified of any changes.
            </p>

            <div className="space-y-2 mb-6">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleAvailability(day)}
                  className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-all flex items-center justify-between ${
                    availabilityForm[day]
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-500 border border-transparent'
                  }`}
                >
                  <span>{day}</span>
                  {availabilityForm[day] ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAvailability}
                disabled={updateAvailabilityMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {updateAvailabilityMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}