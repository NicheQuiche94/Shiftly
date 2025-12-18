'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, isLoaded } = useUser()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/subscription')
        const data = await response.json()
        setSubscription(data)
      } catch (error) {
        console.error('Error fetching subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isLoaded) {
      fetchSubscription()
    }
  }, [isLoaded])

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to open billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
        </div>
      </main>
    )
  }

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User'
  const userEmail = user?.primaryEmailAddress?.emailAddress || ''
  const userInitial = user?.firstName?.[0] || userEmail?.[0]?.toUpperCase() || '?'

  const hasAccess = subscription?.hasAccess || false
  const isTrialing = subscription?.isTrialing || false
  const status = subscription?.status || 'inactive'

  let trialDays = null
  if (isTrialing && subscription?.trial_end) {
    const trialEnd = new Date(subscription.trial_end)
    const now = new Date()
    const diffTime = trialEnd - now
    trialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (trialDays < 0) trialDays = 0
  }

  const statusStyles = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    inactive: 'bg-gray-100 text-gray-800',
  }

  const statusLabels = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    cancelled: 'Cancelled',
    inactive: 'Inactive',
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-cal">Settings</h1>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 font-cal">Account</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <span className="text-pink-600 font-semibold text-lg">{userInitial}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{userName}</p>
              <p className="text-sm text-gray-500">{userEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 font-cal">Subscription</h2>
        </div>
        <div className="p-6">
          {hasAccess ? (
            <div className="space-y-4">
              {/* Plan info row */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Shiftly Pro</p>
                  <p className="text-sm text-gray-500">
                    {isTrialing 
                      ? `Trial ends ${formatDate(subscription.trial_end)}`
                      : `Renews ${formatDate(subscription.current_period_end)}`
                    }
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.inactive}`}>
                  {statusLabels[status] || 'Unknown'}
                </span>
              </div>

              {/* Trial warning */}
              {isTrialing && trialDays !== null && trialDays <= 7 && (
                <div className={`p-4 rounded-xl ${trialDays <= 3 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`font-medium ${trialDays <= 3 ? 'text-amber-900' : 'text-blue-900'}`}>
                    {trialDays} day{trialDays !== 1 ? 's' : ''} left in your trial
                  </p>
                  <p className={`text-sm ${trialDays <= 3 ? 'text-amber-700' : 'text-blue-700'}`}>
                    Your card will be charged when the trial ends.
                  </p>
                </div>
              )}

              {/* Cancel notice */}
              {subscription.cancel_at_period_end && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="font-medium text-gray-900">Subscription ending</p>
                  <p className="text-sm text-gray-600">
                    Your subscription will end on {formatDate(subscription.current_period_end)}.
                  </p>
                </div>
              )}

              {/* Manage button */}
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalLoading ? 'Opening...' : 'Manage Billing'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Update payment method, view invoices, or cancel subscription
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="font-medium text-gray-900 mb-1">No active subscription</p>
              <p className="text-sm text-gray-500 mb-4">Subscribe to access all features</p>
              <Link
                href="/checkout"
                className="inline-block px-6 py-2.5 bg-pink-500 text-white font-medium rounded-xl hover:bg-pink-600 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Support Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 font-cal">Support</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">Need help? We are here for you.</p>
          <a
            href="mailto:support@shiftly.so"
            className="text-pink-600 hover:text-pink-700 font-medium text-sm"
          >
            support@shiftly.so
          </a>
        </div>
      </div>
    </main>
  )
}