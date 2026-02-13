'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, isLoaded } = useUser()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  
  // Locale state
  const [locales, setLocales] = useState([])
  const [currentLocale, setCurrentLocale] = useState(null)
  const [localeLoading, setLocaleLoading] = useState(false)
  const [localeSaving, setLocaleSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch subscription
        const subResponse = await fetch('/api/subscription')
        const subData = await subResponse.json()
        setSubscription(subData)

        // Fetch available locales
        const localesResponse = await fetch('/api/locales')
        if (localesResponse.ok) {
          const localesData = await localesResponse.json()
          setLocales(localesData)
        }

        // Fetch current team's locale
        const teamResponse = await fetch('/api/teams')
        if (teamResponse.ok) {
          const teamData = await teamResponse.json()
          const defaultTeam = teamData.find(t => t.is_default) || teamData[0]
          if (defaultTeam?.locale_id) {
            const localeDetailResponse = await fetch(`/api/locales/${defaultTeam.locale_id}`)
            if (localeDetailResponse.ok) {
              const localeDetail = await localeDetailResponse.json()
              setCurrentLocale(localeDetail)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isLoaded) {
      fetchData()
    }
  }, [isLoaded])

  const handleLocaleChange = async (localeId) => {
    setLocaleSaving(true)
    try {
      const response = await fetch('/api/teams/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale_id: localeId })
      })

      if (response.ok) {
        // Refresh current locale
        const localeDetailResponse = await fetch(`/api/locales/${localeId}`)
        if (localeDetailResponse.ok) {
          const localeDetail = await localeDetailResponse.json()
          setCurrentLocale(localeDetail)
        }
      } else {
        alert('Failed to update locale')
      }
    } catch (error) {
      console.error('Error updating locale:', error)
      alert('Failed to update locale')
    } finally {
      setLocaleSaving(false)
    }
  }

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

  const getCountryFlag = (countryCode) => {
    // Flags removed - don't render properly in all environments
    return ''
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

      {/* Region & Locale Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 font-cal">Region & Locale</h2>
          <p className="text-sm text-gray-500 mt-1">Set your location to apply local compliance rules and formatting</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Country Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <select
              value={currentLocale?.id || ''}
              onChange={(e) => handleLocaleChange(parseInt(e.target.value))}
              disabled={localeSaving}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locales.map((locale) => (
                <option key={locale.id} value={locale.id}>
                  {locale.country_name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Locale Details */}
          {currentLocale && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Formatting Preferences</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Currency</p>
                  <p className="text-sm font-medium text-gray-900">{currentLocale.currency_symbol} {currentLocale.currency_code}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Date Format</p>
                  <p className="text-sm font-medium text-gray-900">{currentLocale.date_format}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Time Format</p>
                  <p className="text-sm font-medium text-gray-900">{currentLocale.time_format}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Week Starts</p>
                  <p className="text-sm font-medium text-gray-900">
                    {currentLocale.first_day_of_week === 0 ? 'Sunday' : 'Monday'}
                  </p>
                </div>
              </div>

              {/* Compliance Badges */}
              {(currentLocale.show_wtd_badge || currentLocale.show_flsa_badge) && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Compliance</p>
                  <div className="flex gap-2">
                    {currentLocale.show_wtd_badge && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        WTD Compliant
                      </span>
                    )}
                    {currentLocale.show_flsa_badge && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        FLSA Compliant
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Working Rules */}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Working Time Rules</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {currentLocale.max_weekly_hours && (
                    <div>
                      <span className="text-gray-500">Max Weekly Hours:</span>
                      <span className="ml-1 font-medium text-gray-900">{currentLocale.max_weekly_hours}h</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Overtime After:</span>
                    <span className="ml-1 font-medium text-gray-900">{currentLocale.overtime_threshold}h</span>
                  </div>
                  {currentLocale.min_rest_hours && (
                    <div>
                      <span className="text-gray-500">Min Rest:</span>
                      <span className="ml-1 font-medium text-gray-900">{currentLocale.min_rest_hours}h</span>
                    </div>
                  )}
                  {currentLocale.min_days_off_per_week && (
                    <div>
                      <span className="text-gray-500">Min Days Off:</span>
                      <span className="ml-1 font-medium text-gray-900">{currentLocale.min_days_off_per_week}/week</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Annual Leave:</span>
                    <span className="ml-1 font-medium text-gray-900">{currentLocale.annual_leave_days} days</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {localeSaving && (
            <div className="flex items-center justify-center py-2">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-gray-600">Updating locale...</span>
            </div>
          )}
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