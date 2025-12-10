'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user } = useUser()
  const router = useRouter()
  const [rotas, setRotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPastRotas, setShowPastRotas] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [stats, setStats] = useState({
    timeSaved: 0,
    weeksApproved: 0,
    pendingRequests: 0
  })

  useEffect(() => {
    loadRotas()
  }, [])

  const loadRotas = async () => {
    try {
      const response = await fetch('/api/rotas')
      if (response.ok) {
        const data = await response.json()
        setRotas(data)
        
        // Calculate stats
        const approvedRotas = data.filter(r => r.approved)
        const totalWeeks = approvedRotas.reduce((sum, r) => sum + (r.week_count || 1), 0)
        const timeSaved = approvedRotas.length * 2.5 // ~2.5 hours saved per rota
        
        setStats({
          timeSaved: timeSaved.toFixed(1),
          weeksApproved: totalWeeks,
          pendingRequests: 0 // Placeholder
        })
      }
    } catch (error) {
      console.error('Error loading rotas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRota = async (rotaId, e) => {
    e.stopPropagation() // Prevent navigation when clicking delete
    
    if (!confirm('Are you sure you want to delete this rota? This cannot be undone.')) return
    
    setDeletingId(rotaId)
    try {
      const response = await fetch(`/api/rotas/${rotaId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadRotas() // Refresh the list
      } else {
        alert('Failed to delete rota')
      }
    } catch (error) {
      console.error('Error deleting rota:', error)
      alert('Failed to delete rota')
    } finally {
      setDeletingId(null)
    }
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

  const firstName = user?.firstName || 'there'
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Split rotas into upcoming and past
  const approvedRotas = rotas.filter(r => r.approved)
  
  const upcomingRotas = approvedRotas
    .filter(r => {
      if (!r.end_date) return true // No end date, assume upcoming
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
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date)) // Most recent first

  // Draft rotas (not approved)
  const draftRotas = rotas.filter(r => !r.approved)

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Welcome Header - Centered */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Here's what's happening with your schedules
        </p>
      </div>

      {/* Stats Cards - Stack on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-10">
        {/* Time Saved */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.timeSaved}h</p>
          <p className="text-xs sm:text-sm text-gray-500">Time Saved</p>
        </div>

        {/* Weeks Approved */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.weeksApproved}</p>
          <p className="text-xs sm:text-sm text-gray-500">Weeks Approved</p>
        </div>

        {/* Employee Requests */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.pendingRequests}</p>
          <p className="text-xs sm:text-sm text-gray-500">Requests</p>
        </div>
      </div>

      {/* Upcoming Rotas */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Upcoming Rotas</h2>
            <button
              onClick={() => router.push('/dashboard/generate')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all whitespace-nowrap"
            >
              + New Rota
            </button>
          </div>
        </div>

        {loading ? (
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
                    disabled={deletingId === rota.id}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete rota"
                  >
                    {deletingId === rota.id ? (
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
      {pastRotas.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <button
            onClick={() => setShowPastRotas(!showPastRotas)}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Past Rotas</h2>
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
                    onClick={() => handleRotaClick(rota.id)}
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
                      onClick={(e) => handleDeleteRota(rota.id, e)}
                      disabled={deletingId === rota.id}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete rota"
                    >
                      {deletingId === rota.id ? (
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
      )}

      {/* Draft Rotas */}
      {draftRotas.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Drafts</h2>
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
                    disabled={deletingId === rota.id}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete draft"
                  >
                    {deletingId === rota.id ? (
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
    </main>
  )
}