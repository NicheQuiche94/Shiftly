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
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4 font-cal">
            Simple pricing. Everything included.
          </h2>
          <p className="text-xl text-gray-600">
            No tiers. No feature gates. No "contact sales for enterprise."
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-200 rounded-full p-1 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-pink-500 font-semibold">Save $89</span>
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-xl overflow-hidden max-w-lg mx-auto">
          <div className="bg-pink-500 px-8 py-6 text-center">
            <p className="text-pink-100 text-sm font-medium uppercase tracking-wide mb-1">
              One plan. Everything.
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold text-white">
                ${billingCycle === 'monthly' ? '49' : '499'}
              </span>
              <span className="text-pink-100 text-lg">
                /{billingCycle === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            {billingCycle === 'annual' && (
              <p className="text-pink-100 text-sm mt-2">
                That's $41.58/month - save $89/year
              </p>
            )}
          </div>

          <div className="p-8">
            <p className="text-gray-600 text-center mb-8">
              Most scheduling tools gate features behind "Enterprise" tiers. We think that's nonsense. Here's everything you get:
            </p>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Unlimited staff</strong> - add your whole team</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Unlimited rotas</strong> - generate as many as you need</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>All fairness rules</strong> - every rule, no restrictions</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Staff mobile app</strong> - they see schedules, request time off</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Time-off management</strong> - approve/reject requests</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Payroll integration</strong> - yes, included (not "Enterprise only")</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Multiple teams</strong> - manage different departments</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Priority support</strong> - we actually respond</span>
              </li>
            </ul>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={handleStartTrial}
                className="block w-full py-4 bg-pink-500 text-white text-center text-lg font-semibold rounded-xl hover:bg-pink-600 transition-all"
              >
                Start 14-Day Free Trial
              </button>
              <p className="text-center text-gray-500 text-sm mt-3">
                Card required. Cancel anytime. No charge for 14 days.
              </p>
            </div>
          </div>
        </div>

        {/* Tongue-in-cheek note */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Looking for an "Enterprise" tier with a 6-month sales cycle and mandatory demos? Sorry, we don't do that. Everyone gets everything.
          </p>
        </div>
      </div>
    </section>
  )
}