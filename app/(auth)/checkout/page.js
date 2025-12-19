'use client'

import { useEffect, useState, Suspense } from 'react'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

function CheckoutContent() {
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [showPromoInput, setShowPromoInput] = useState(false)

  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan === 'annual') {
      setBillingCycle('annual')
    }
    // Check for promo code in URL
    const code = searchParams.get('code')
    if (code) {
      setPromoCode(code)
      setShowPromoInput(true)
    }
  }, [searchParams])

  const handleCheckout = async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)

    try {
      const priceId = billingCycle === 'monthly' 
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          email: user.primaryEmailAddress?.emailAddress,
          promoCode: promoCode.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to start checkout')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.svg" alt="Shiftly" width={40} height={40} />
            <span className="text-2xl font-cal text-gray-900">Shiftly</span>
          </div>
        </div>

        {/* Big Trust Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 mb-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 font-cal">Try Shiftly Free for 14 Days</h1>
          <p className="text-green-700 font-medium mb-1">No charge until your trial ends</p>
          <p className="text-sm text-gray-600">Cancel anytime with one click. No questions asked.</p>
        </div>

        {/* What happens next */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">Here's how it works:</p>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Start your free trial today</p>
                <p className="text-xs text-gray-500">Full access to all features, no restrictions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">We'll remind you before it ends</p>
                <p className="text-xs text-gray-500">Email reminder 3 days before your trial expires</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 text-sm font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Only pay if you love it</p>
                <p className="text-xs text-gray-500">Cancel before day 14 and pay nothing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Choose your plan after trial:</label>
          
          <div className="space-y-3">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                billingCycle === 'monthly'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">Monthly</p>
                  <p className="text-sm text-gray-500">Flexible, cancel anytime</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">$49</p>
                  <p className="text-sm text-gray-500">/month</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setBillingCycle('annual')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                billingCycle === 'annual'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                Save $89/year
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">Annual</p>
                  <p className="text-sm text-gray-500">Best value for growing teams</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">$499</p>
                  <p className="text-sm text-gray-500">/year</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Promo Code */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          {!showPromoInput ? (
            <button
              onClick={() => setShowPromoInput(true)}
              className="text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              Have a promo code?
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Promo code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-sm uppercase text-gray-900"
                />
                {promoCode && (
                  <button
                    onClick={() => {
                      setPromoCode('')
                      setShowPromoInput(false)
                    }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {promoCode && (
                <p className="text-xs text-green-600 mt-2">✓ Code will be applied at checkout</p>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Checkout button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing...</span>
            </span>
          ) : (
            'Start My Free Trial'
          )}
        </button>

        {/* Trust signals */}
        <div className="mt-4 space-y-2">
          <p className="text-center text-gray-500 text-xs flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            No charge for 14 days
          </p>
          <p className="text-center text-gray-500 text-xs flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Cancel anytime in settings
          </p>
          <p className="text-center text-gray-500 text-xs flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Secure payment via Stripe
          </p>
        </div>

        {/* Powered by Stripe badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xs">Secured by</span>
          <svg className="h-5" viewBox="0 0 60 25" fill="currentColor">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-3.67-3.19c0-1.33-.6-3.04-2.1-3.04-1.52 0-2.25 1.67-2.31 3.04h4.41zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-5.13L32.37 0v3.77l-4.13.88V.44zM20.28 2.23l4.04-.86v4.01l4.12-1.02v3.36l-4.12 1.02v6.43c0 1.44.7 1.98 2.27 1.98.37 0 .82-.03 1.14-.08l.66 3.1c-.67.28-1.64.54-3.02.54-3.5 0-5.12-2.03-5.12-5.51V8.73L17.3 9.3V5.9l2.98-.73V2.23zM13.16 12.32c0-3.7-1.1-5.28-3.05-5.28-1.99 0-3.19 1.58-3.19 5.28 0 3.79 1.2 5.48 3.19 5.48 1.95 0 3.05-1.7 3.05-5.48zm-10.39 0c0-4.97 2.88-7.63 7.34-7.63 4.42 0 7.2 2.66 7.2 7.63 0 4.9-2.78 7.68-7.2 7.68-4.46 0-7.34-2.78-7.34-7.68zM.26 20.01V.44L4.4 0v20.01H.26z"/>
          </svg>
        </div>

        {/* Sign out option */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Signed in as {user?.primaryEmailAddress?.emailAddress}
          </p>
          <SignOutButton>
            <button className="text-sm text-gray-500 hover:text-pink-600 transition-colors">
              Sign out or use a different account
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}