'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user } = useUser()
  const router = useRouter()
  const [rotas, setRotas] = useState([])
  const [loading, setLoading] = useState(true)
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

  const formatWeekBeginning = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const handleRotaClick = (rotaId) => {
    router.push(`/dashboard/generate?rota=${rotaId}`)
  }

  const firstName = user?.firstName || 'there'

  // Get upcoming rotas (approved, future start dates first)
  const upcomingRotas = rotas
    .filter(r => r.approved)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5)

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Welcome Header - Centered */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-500">
          Here's what's happening with your schedules
        </p>
      </div>

      {/* Stats Cards - 3 small squares */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {/* Time Saved */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.timeSaved}h</p>
          <p className="text-sm text-gray-500">Time Saved</p>
        </div>

        {/* Weeks Approved */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.weeksApproved}</p>
          <p className="text-sm text-gray-500">Weeks Approved</p>
        </div>

        {/* Employee Requests */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center hover:shadow-lg hover:shadow-pink-500/10 transition-all">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingRequests}</p>
          <p className="text-sm text-gray-500">Employee Requests</p>
        </div>
      </div>

      {/* Upcoming Rotas - Full Width */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Rotas</h2>
            <button
              onClick={() => router.push('/dashboard/generate')}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all"
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
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium mb-1">No approved rotas yet</p>
            <p className="text-sm text-gray-500 mb-4">Create and approve your first rota to see it here</p>
            <button
              onClick={() => router.push('/dashboard/generate')}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all"
            >
              Build Your First Rota
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingRotas.map((rota) => (
              <button
                key={rota.id}
                onClick={() => handleRotaClick(rota.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {rota.rota_name || rota.name || 'Untitled Rota'}
                    </p>
                    <p className="text-sm text-gray-500">
                      w/c {formatWeekBeginning(rota.start_date)} · {rota.week_count || 1} week{(rota.week_count || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => router.push('/dashboard/workspace')}
          className="text-sm text-gray-500 hover:text-pink-600 transition-colors"
        >
          Manage Staff & Shifts →
        </button>
      </div>
    </main>
  )
}