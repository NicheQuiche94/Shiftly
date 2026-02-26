'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/app/components/PageHeader'
import Badge from '@/app/components/Badge'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isCheckingUserType, setIsCheckingUserType] = useState(true)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)

  // Check if user is employee and redirect
  useEffect(() => {
    if (!isLoaded || !user) return

    const checkUserType = async () => {
      const cacheKey = `shiftly_user_type_${user.id}`
      const cachedType = localStorage.getItem(cacheKey)

      if (cachedType === 'manager') {
        setIsCheckingUserType(false)
        return
      }

      if (cachedType === 'employee') {
        router.replace('/employee')
        return
      }

      try {
        const response = await fetch('/api/auth/user-type')
        const data = await response.json()

        if (data.type === 'employee') {
          localStorage.setItem(cacheKey, 'employee')
          router.replace('/employee')
          return
        }

        localStorage.setItem(cacheKey, 'manager')
      } catch (error) {
        console.error('Error checking user type:', error)
      }
      setIsCheckingUserType(false)
    }

    checkUserType()
  }, [isLoaded, user, router])

  // STRIPE DISABLED — skip subscription check during development
  useEffect(() => {
    if (isCheckingUserType) return
    setIsCheckingSubscription(false)
  }, [isCheckingUserType])

  // Fetch rotas
  const { data: rotas = [], isLoading } = useQuery({
    queryKey: ['rotas'],
    queryFn: async () => {
      const response = await fetch('/api/rotas')
      if (!response.ok) throw new Error('Failed to fetch rotas')
      return response.json()
    },
    enabled: !isCheckingUserType && !isCheckingSubscription
  })

  // Fetch pending requests
  const { data: requests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const response = await fetch('/api/requests')
      if (!response.ok) throw new Error('Failed to fetch requests')
      return response.json()
    },
    enabled: !isCheckingUserType && !isCheckingSubscription
  })

  // Fetch teams for coverage calculation
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to fetch teams')
      return response.json()
    },
    enabled: !isCheckingUserType && !isCheckingSubscription
  })

  // Fetch first team's template data for coverage
  const firstTeamId = teams[0]?.id
  const { data: teamData } = useQuery({
    queryKey: ['team-template', firstTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${firstTeamId}/template`)
      if (!response.ok) throw new Error('Failed to fetch template')
      return response.json()
    },
    enabled: !!firstTeamId
  })

  // Fetch staff for coverage
  const { data: staffData = [] } = useQuery({
    queryKey: ['staff', firstTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/staff?team_id=${firstTeamId}`)
      if (!response.ok) throw new Error('Failed to fetch staff')
      return response.json()
    },
    enabled: !!firstTeamId
  })

  const pendingRequestsCount = useMemo(() => {
    return requests.filter(r => r.status === 'pending').length
  }, [requests])

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (rotaId) => {
      const response = await fetch(`/api/rotas/${rotaId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete rota')
      return rotaId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotas'] })
    },
    onError: (error) => {
      console.error('Error deleting rota:', error)
      alert('Failed to delete rota')
    }
  })

  // Calculate coverage from team + staff data
  const coverage = useMemo(() => {
    if (!teamData || !staffData.length) return null
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const wt = teamData.week_template || {}
    const dt = teamData.day_templates || {}
    let weeklyShiftHours = 0
    DAYS.forEach(d => {
      if (!wt[d]?.on) return
      const tmpl = dt[wt[d].tmpl]
      if (!tmpl?.shifts) return
      weeklyShiftHours += tmpl.shifts.reduce((a, s) => a + s.length * s.headcount, 0)
    })
    const totalMaxHours = staffData.reduce((sum, s) => sum + (s.max_hours || s.contracted_hours || 0), 0)
    if (weeklyShiftHours === 0) return { pct: 100, needed: 0, available: totalMaxHours }
    const pct = Math.min(100, Math.round((totalMaxHours / weeklyShiftHours) * 100))
    return { pct, needed: Math.round(weeklyShiftHours), available: Math.round(totalMaxHours) }
  }, [teamData, staffData])

  // This week's rota status
  const thisWeekRota = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Find rota covering this week
    for (const rota of rotas) {
      if (!rota.start_date) continue
      const start = new Date(rota.start_date)
      const end = rota.end_date ? new Date(rota.end_date) : new Date(start.getTime() + 6 * 86400000)
      if (start <= today && end >= today) {
        return { rota, status: rota.approved ? 'published' : 'draft' }
      }
    }
    return { rota: null, status: 'none' }
  }, [rotas])

  const handleDeleteRota = async (rotaId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this rota? This cannot be undone.')) return
    deleteMutation.mutate(rotaId)
  }

  const formatDateRange = (startDate, endDate) => {
    if (!startDate) return ''
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    if (endDate) return `${fmt(startDate)} - ${fmt(endDate)}`
    return `w/c ${fmt(startDate)}`
  }

  const getNextMonday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  // Show loading while checking user type
  if (isCheckingUserType || isCheckingSubscription) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="body-text">Loading your dashboard...</p>
        </div>
      </main>
    )
  }

  const firstName = user?.firstName || 'there'
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingRotas = rotas
    .filter(r => {
      if (!r.end_date) return true
      const endDate = new Date(r.end_date)
      return endDate >= today
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

  const pastRotas = rotas
    .filter(r => {
      if (!r.end_date) return false
      const endDate = new Date(r.end_date)
      return endDate < today && r.approved
    })
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Welcome Header */}
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what's happening with your schedules"
      />

      {/* Stat Cards — 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {/* This Week's Rota */}
        <Link
          href={thisWeekRota.rota ? `/dashboard/generate?rota=${thisWeekRota.rota.id}` : '/dashboard/generate'}
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:shadow-pink-500/10 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            {thisWeekRota.status === 'published' && (
              <Badge variant="success">Published</Badge>
            )}
            {thisWeekRota.status === 'draft' && (
              <Badge variant="warning">Draft</Badge>
            )}
            {thisWeekRota.status === 'none' && (
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Not Created</span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 mb-0.5">This Week's Rota</p>
          {thisWeekRota.rota ? (
            <p className="text-xs text-gray-500">{formatDateRange(thisWeekRota.rota.start_date, thisWeekRota.rota.end_date)}</p>
          ) : (
            <p className="text-xs text-gray-400">Click to create one</p>
          )}
        </Link>

        {/* Coverage Status */}
        <Link
          href="/dashboard/workspace?tab=staff-shifts"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:shadow-pink-500/10 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              coverage && coverage.pct >= 100 ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              <svg className={`w-5 h-5 ${coverage && coverage.pct >= 100 ? 'text-green-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {coverage && (
              <span className={`text-lg font-bold ${coverage.pct >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                {coverage.pct}%
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 mb-0.5">Coverage Status</p>
          {coverage ? (
            <p className={`text-xs ${coverage.pct >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
              {coverage.pct >= 100 ? 'Fully covered' : `${coverage.available}h available / ${coverage.needed}h needed`}
            </p>
          ) : (
            <p className="text-xs text-gray-400">Loading...</p>
          )}
        </Link>

        {/* Pending Requests */}
        <Link
          href="/dashboard/requests"
          className={`bg-white rounded-xl border p-5 hover:shadow-lg hover:shadow-pink-500/10 transition-all group ${
            pendingRequestsCount > 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              pendingRequestsCount > 0 ? 'bg-amber-50' : 'bg-pink-50'
            }`}>
              <svg className={`w-5 h-5 ${pendingRequestsCount > 0 ? 'text-amber-600' : 'text-pink-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            {pendingRequestsCount > 0 && (
              <span className="text-lg font-bold text-amber-600">{pendingRequestsCount}</span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 mb-0.5">Pending Requests</p>
          <p className={`text-xs ${pendingRequestsCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {pendingRequestsCount === 0 ? 'All clear' : `${pendingRequestsCount} pending`}
          </p>
        </Link>
      </div>

      {/* Upcoming Rotas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Upcoming Rotas</h2>
            <button
              onClick={() => router.push('/dashboard/generate')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all hover:shadow-lg hover:shadow-pink-500/25"
              style={{ background: '#FF1F7D' }}
            >
              + New Rota
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
          </div>
        ) : upcomingRotas.length === 0 ? (
          <div className="text-center py-10 px-6">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No rotas yet</p>
            <p className="text-xs text-gray-500 mb-4">Create your first rota to get started</p>
            <button
              onClick={() => router.push('/dashboard/generate')}
              className="text-sm font-semibold text-pink-600 hover:text-pink-700 transition-colors"
            >
              Create your first rota →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingRotas.map((rota) => (
              <div
                key={rota.id}
                className="flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => router.push(`/dashboard/generate?rota=${rota.id}`)}
                  className="flex-1 px-5 py-3.5 flex items-center gap-4 text-left"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    rota.approved ? 'bg-green-50' : 'bg-amber-50'
                  }`}>
                    <svg className={`w-4 h-4 ${rota.approved ? 'text-green-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {rota.rota_name || rota.name || 'Untitled Rota'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateRange(rota.start_date, rota.end_date)} · {rota.week_count || 1} week{(rota.week_count || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {rota.approved ? (
                      <Badge variant="success" size="sm">Published</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">Draft</Badge>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 pr-5">
                  <button
                    onClick={(e) => handleDeleteRota(rota.id, e)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    title="Delete rota"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Rotas */}
      <PastRotasSection
        pastRotas={pastRotas}
        onRotaClick={(id) => router.push(`/dashboard/generate?rota=${id}`)}
        onDelete={handleDeleteRota}
        deleteMutation={deleteMutation}
        formatDateRange={formatDateRange}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <button
          onClick={() => router.push(`/dashboard/generate?start=${getNextMonday()}`)}
          className="flex items-center gap-3 px-5 py-4 bg-white rounded-xl border border-gray-200 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/10 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0 group-hover:bg-pink-100 transition-colors">
            <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Generate Next Week</p>
            <p className="text-xs text-gray-500">Pre-filled with next Monday</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/workspace?tab=templates')}
          className="flex items-center gap-3 px-5 py-4 bg-white rounded-xl border border-gray-200 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/10 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Edit Templates</p>
            <p className="text-xs text-gray-500">Shift patterns & schedule</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/workspace?tab=staff-shifts')}
          className="flex items-center gap-3 px-5 py-4 bg-white rounded-xl border border-gray-200 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/10 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Manage Staff</p>
            <p className="text-xs text-gray-500">Team & availability</p>
          </div>
        </button>
      </div>
    </main>
  )
}

function PastRotasSection({ pastRotas, onRotaClick, onDelete, deleteMutation, formatDateRange }) {
  const [showPastRotas, setShowPastRotas] = useState(false)

  if (pastRotas.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <button
        onClick={() => setShowPastRotas(!showPastRotas)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Past Rotas</h2>
          <Badge variant="default">{pastRotas.length}</Badge>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${showPastRotas ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showPastRotas && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {pastRotas.map((rota) => (
            <div key={rota.id} className="flex items-center justify-between hover:bg-gray-50 transition-colors">
              <button
                onClick={() => onRotaClick(rota.id)}
                className="flex-1 px-5 py-3.5 flex items-center gap-4 text-left"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {rota.rota_name || rota.name || 'Untitled Rota'}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateRange(rota.start_date, rota.end_date)}</p>
                </div>
              </button>
              <div className="flex items-center gap-2 pr-5">
                <button
                  onClick={(e) => onDelete(rota.id, e)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title="Delete rota"
                >
                  {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
