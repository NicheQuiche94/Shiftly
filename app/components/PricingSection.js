'use client'

import { useState } from 'react'

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState('monthly')

  const handleStartTrial = () => {
    // Always redirect to sign-up with the billing cycle preference
    window.location.href = `/sign-up?plan=${billingCycle}`
  }

  return (
    <section id="pricing" className="px-6 lg:px-8 py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4 font-cal">
            Try it free for 14 days
          </h2>
          <p className="text-xl text-gray-600">
            Full access to everything. No restrictions. Cancel anytime.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden max-w-lg mx-auto">
          {/* Free Trial Header - The Hero */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-8 py-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-white text-sm font-medium">No payment until trial ends</span>
            </div>
            <p className="text-5xl font-bold text-white mb-2">14 Days Free</p>
            <p className="text-green-100">
              Then {billingCycle === 'monthly' ? '$49/month' : '$499/year'} · Cancel anytime
            </p>
          </div>

          <div className="p-8">
            {/* Billing Toggle - Secondary */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-full p-1 flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Annual
                  <span className="ml-1.5 text-xs text-green-600 font-semibold">Save $89</span>
                </button>
              </div>
            </div>

            {/* What's Included */}
            <p className="text-sm text-gray-500 text-center mb-6">
              One plan. Everything included. No feature gates.
            </p>

            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Unlimited staff & rotas</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">All fairness rules</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Staff mobile app included</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Time-off requests & approvals</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Payroll export</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Multiple teams/departments</span>
              </li>
            </ul>

            <div className="mt-8">
              <button
                onClick={handleStartTrial}
                className="block w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-center text-lg font-semibold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all"
              >
                Start My Free Trial
              </button>
              
              {/* Trust Signals */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-gray-500 text-xs flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secure checkout via Stripe
                </p>
                <p className="text-gray-500 text-xs">
                  We'll remind you 3 days before your trial ends
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reassurance */}
        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Not sure yet? That's what the trial is for. Build a few rotas, see if it saves you time. If not, cancel with one click - no awkward phone calls required.
          </p>
        </div>
      </div>
    </section>
  )
}