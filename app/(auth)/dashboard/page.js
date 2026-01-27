'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OnboardingTour from '../../../components/OnboardingTour'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isCheckingUserType, setIsCheckingUserType] = useState(true)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const [subscription, setSubscription] = useState(null)

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

  // Check subscription status
  useEffect(() => {
    if (isCheckingUserType) return

    const checkSubscription = async () => {
      try {
        const response = await fetch('/api/subscription')
        const data = await response.json()
        
        setSubscription(data)
        
        // If no active subscription, redirect to checkout
        if (!data.hasAccess) {
          router.replace('/checkout')
          return
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
        // On error, allow through but log it
      }
      setIsCheckingSubscription(false)
    }

    checkSubscription()
  }, [isCheckingUserType, router])

  // Fetch rotas with React Query - cached for 5 mins, instant on return
  const { data: rotas = [], isLoading } = useQuery({
    queryKey: ['rotas'],
    queryFn: async () => {
      const response = await fetch('/api/rotas')
      if (!response.ok) throw new Error('Failed to fetch rotas')
      return response.json()
    },
    enabled: !isCheckingUserType && !isCheckingSubscription
  })

  // Fetch pending requests count
  const { data: requests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const response = await fetch('/api/requests')
      if (!response.ok) throw new Error('Failed to fetch requests')
      return response.json()
    },
    enabled: !isCheckingUserType && !isCheckingSubscription
  })

  const pendingRequestsCount = useMemo(() => {
    return requests.filter(r => r.status === 'pending').length
  }, [requests])

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (rotaId) => {
      const response = await fetch(`/api/rotas/${rotaId}`, {
        method: 'DELETE'
      })
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

  // Calculate stats from rotas data
  const stats = useMemo(() => {
    const approvedRotas = rotas.filter(r => r.approved)
    const totalWeeks = approvedRotas.reduce((sum, r) => sum + (r.week_count || 1), 0)
    const timeSaved = approvedRotas.length * 2.5
    
    return {
      timeSaved: timeSaved.toFixed(1),
      weeksApproved: totalWeeks
    }
  }, [rotas])

  // Calculate trial days remaining - only for genuine trials with valid end dates
  // Users with BETA100 (100% off forever) have null trial_end and should NOT see trial banner
  const trialDaysRemaining = useMemo(() => {
    // No trial banner for non-trialing users
    if (!subscription?.isTrialing) return null
    
    // No trial banner if trial_end is missing (e.g., BETA100 free access users)
    if (!subscription?.trial_end) return null
    
    const trialEnd = new Date(subscription.trial_end)
    
    // Check if trial_end is a valid date
    if (isNaN(trialEnd.getTime())) return null
    
    const now = new Date()
    const diffTime = trialEnd - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // If trial has already ended (0 or negative days), return null to hide banner
    // Users with expired trials will be handled by the subscription access check
    return diffDays > 0 ? diffDays : null
  }, [subscription])

  // Determine if we should show the trial banner
  // Only show if user is trialing AND has a valid future trial end date
  const showTrialBanner = subscription?.isTrialing && trialDaysRemaining !== null && trialDaysRemaining > 0

  const handleDeleteRota = async (rotaId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this rota? This cannot be undone.')) return
    deleteMutation.mutate(rotaId)
  }

  const formatWeekBeginning = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const formatFullDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleRotaClick = (rotaId) => {
    router.push(`/dashboard/generate?rota=${rotaId}`)
  }

  // Show loading while checking user type or subscription
  if (isCheckingUserType || isCheckingSubscription) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </main>
    )
  }

  const firstName = user?.firstName || 'there'
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const approvedRotas = rotas.filter(r => r.approved)
  
  const upcomingRotas = approvedRotas
    .filter(r => {
      if (!r.end_date) return true
      const endDate = new Date(r.end_date)
      return endDate >= today
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  
  const pastRotas = approvedRotas
    .filter(r => {
      if (!r.end_date) return false
      const endDate = new Date(r.end_date)
      return endDate < today
    })
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

  const draftRotas = rotas.filter(r => !r.approved)

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Trial Banner - only shown for genuine trials with valid end dates */}
      {showTrialBanner && (
        <div className={`mb-6 rounded-xl p-4 flex items-center justify-between ${
          trialDaysRemaining <= 3 
            ? 'bg-amber-50 border border-amber-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              trialDaysRemaining <= 3 ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              <svg className={`w-5 h-5 ${trialDaysRemaining <= 3 ? 'text-amber-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={`font-semibold ${trialDaysRemaining <= 3 ? 'text-amber-900' : 'text-blue-900'}`}>
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your trial
              </p>
              <p className={`text-sm ${trialDaysRemaining <= 3 ? 'text-amber-700' : 'text-blue-700'}`}>
                {trialDaysRemaining <= 3 
                  ? 'Add a payment method to keep your account active'
                  : 'You have full access to all features'
                }
              </p>
            </div>
          </div>
          {trialDaysRemaining <= 3 && (
            <Link
              href="/dashboard/settings"
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              Manage Billing
            </Link>
          )}
        </div>
      )}

      {/* Welcome Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 font-cal">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Here's what's happening with your schedules
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.timeSaved}h</p>
          <p className="text-xs sm:text-sm text-gray-500">Time Saved</p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.weeksApproved}</p>
          <p className="text-xs sm:text-sm text-gray-500">Weeks Approved</p>
        </div>

        <Link 
          href="/dashboard/requests"
          className={`bg-white rounded-xl sm:rounded-2xl border p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all ${
            pendingRequestsCount > 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'
          }`}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 ${
            pendingRequestsCount > 0 ? 'bg-amber-100' : 'bg-pink-100'
          }`}>
            <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${pendingRequestsCount > 0 ? 'text-amber-600' : 'text-pink-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{pendingRequestsCount}</p>
          <p className="text-xs sm:text-sm text-gray-500">
            {pendingRequestsCount === 1 ? 'Request' : 'Requests'}
            {pendingRequestsCount > 0 && <span className="text-amber-600 ml-1">●</span>}
          </p>
        </Link>
      </div>

      {/* Upcoming Rotas */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 font-cal">Upcoming Rotas</h2>
            <button
              onClick={() => router.push('/dashboard/generate')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all whitespace-nowrap"
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
          <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium mb-1 text-sm sm:text-base">No upcoming rotas</p>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Create and approve a rota to see it here</p>
            <button
              onClick={() => router.push('/dashboard/generate')}
              className="px-5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all text-sm"
            >
              Build Your First Rota
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingRotas.slice(0, 5).map((rota) => (
              <div
                key={rota.id}
                className="flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => handleRotaClick(rota.id)}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 text-left"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-pink-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                      {rota.rota_name || rota.name || 'Untitled Rota'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      w/c {formatWeekBeginning(rota.start_date)} · {rota.week_count || 1} week{(rota.week_count || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
                
                <div className="flex items-center gap-2 pr-4 sm:pr-6">
                  <button
                    onClick={(e) => handleDeleteRota(rota.id, e)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete rota"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                  <svg className="w-5 h-5 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Rotas */}
      <PastRotasSection 
        pastRotas={pastRotas}
        onRotaClick={handleRotaClick}
        onDelete={handleDeleteRota}
        deleteMutation={deleteMutation}
        formatFullDate={formatFullDate}
      />

      {/* Draft Rotas */}
      {draftRotas.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 font-cal">Drafts</h2>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {draftRotas.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {draftRotas.map((rota) => (
              <div
                key={rota.id}
                className="flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => handleRotaClick(rota.id)}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 text-left"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 text-sm sm:text-base truncate">
                      {rota.rota_name || rota.name || 'Untitled Draft'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      w/c {formatWeekBeginning(rota.start_date)} · {rota.week_count || 1} week{(rota.week_count || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
                
                <div className="flex items-center gap-2 pr-4 sm:pr-6">
                  <button
                    onClick={(e) => handleDeleteRota(rota.id, e)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete draft"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                  <svg className="w-5 h-5 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 sm:mt-6 flex justify-center">
        <button
          onClick={() => router.push('/dashboard/workspace')}
          className="text-xs sm:text-sm text-gray-500 hover:text-pink-600 transition-colors"
        >
          Manage Staff & Shifts →
        </button>
      </div>

      {/* Onboarding Tour */}
      <OnboardingTour />
    </main>
  )
}

function PastRotasSection({ pastRotas, onRotaClick, onDelete, deleteMutation, formatFullDate }) {
  const [showPastRotas, setShowPastRotas] = useState(false)
  
  if (pastRotas.length === 0) return null
  
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
      <button
        onClick={() => setShowPastRotas(!showPastRotas)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 font-cal">Past Rotas</h2>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {pastRotas.length}
          </span>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${showPastRotas ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showPastRotas && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {pastRotas.map((rota) => (
            <div
              key={rota.id}
              className="flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => onRotaClick(rota.id)}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 text-left"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-700 text-sm sm:text-base truncate">
                    {rota.rota_name || rota.name || 'Untitled Rota'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {formatFullDate(rota.start_date)} - {formatFullDate(rota.end_date)}
                  </p>
                </div>
              </button>
              
              <div className="flex items-center gap-2 pr-4 sm:pr-6">
                <button
                  onClick={(e) => onDelete(rota.id, e)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete rota"
                >
                  {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
                <svg className="w-5 h-5 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}