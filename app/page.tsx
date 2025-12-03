'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [typedText, setTypedText] = useState('')
  const fullText = "Tired of being the rota referee?"
  
  useEffect(() => {
    let currentIndex = 0
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypedText(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typingInterval)
      }
    }, 80) // Speed of typing in milliseconds

    return () => clearInterval(typingInterval)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
              Shiftly<span className="text-pink-500">●</span>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/sign-in"
                className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up"
                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Gradient */}
      <section className="relative px-6 lg:px-8 py-20 lg:py-32 overflow-hidden bg-gradient-to-br from-pink-100 via-pink-50 to-white">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Typing Animation */}
          <div className="mb-6 h-10 flex items-center justify-center">
            <p className="text-xl lg:text-2xl text-gray-600 font-medium">
              {typedText}
              <span className="inline-block w-0.5 h-6 bg-pink-600 ml-1 animate-pulse"></span>
            </p>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Build <span className="text-pink-600">fair, shareable</span> rotas in an <span className="text-pink-600">instant</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            What took hours, now takes minutes and without the headache
          </p>
          <Link 
            href="/sign-up"
            className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-lg font-semibold rounded-lg hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-105"
          >
            Get Started Free
          </Link>
          <p className="text-sm text-gray-500 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              The real cost of manual rotas
            </h2>
            <p className="text-xl text-gray-600">
              It's not just the time spent building schedules
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pain Point 1 */}
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Endless complaints</h3>
              <p className="text-gray-600">
                "Why do I have three closing shifts in a row?" "How come Sarah gets every Sunday off?" Staff unhappy with perceived unfairness.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Constant changes</h3>
              <p className="text-gray-600">
                Staff request swaps, availability changes, someone calls in sick. You're redoing the rota constantly, wasting even more time.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Burnout risk</h3>
              <p className="text-gray-600">
                Accidentally schedule someone to close then open the next day? Double shifts on the same day? Small mistakes cause big problems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rules Feature Showcase */}
      <section className="px-6 lg:px-8 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Set the rules once.<br />Fairness built in forever.
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Define what "fair" means for your team, and Shiftly will follow those rules every single time. No more mental gymnastics remembering who worked last weekend or who closed three nights in a row.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">No back-to-back closing and opening shifts</p>
                    <p className="text-sm text-gray-600">Staff get proper rest between shifts</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Everyone gets one weekend day off per week</p>
                    <p className="text-sm text-gray-600">Weekends distributed fairly across the team</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Maximum 5 consecutive working days</p>
                    <p className="text-sm text-gray-600">Prevent burnout with mandatory breaks</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rules UI Mockup */}
            <div className="relative">
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="ml-3 text-sm font-semibold text-gray-700">Your Active Rules</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-pink-50 to-white border border-pink-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Staff should not work a closing shift followed by an opening shift the next day</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-pink-50 to-white border border-pink-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Distribute weekend shifts evenly among all available staff members</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-pink-50 to-white border border-pink-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">No staff member should work more than 5 consecutive days without a day off</p>
                    </div>
                  </div>
                </div>

                <button className="mt-4 w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  + Add Custom Rule
                </button>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                Zero complaints
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              From hours to minutes
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to fair, balanced rotas
            </p>
          </div>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-pink-600">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Set up once</h3>
                <p className="text-lg text-gray-600">
                  Add your team, define shift patterns, and set your fairness rules. Takes 5 minutes, works forever.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-pink-600">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Generate in seconds</h3>
                <p className="text-lg text-gray-600">
                  Click generate and watch as a perfectly balanced, fair rota appears. Every rule followed, every staff member treated equally.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-pink-600">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Share with confidence</h3>
                <p className="text-lg text-gray-600">
                  Review the schedule, verify everything's fair, and share with your team. No complaints, no drama, no stress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 lg:px-8 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Built for retail and hospitality managers
            </h2>
            <p className="text-xl text-gray-600">Who are tired of being the rota referee</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminates bias</h3>
                <p className="text-gray-600">Rules apply to everyone equally. No favorites, no politics, just fairness.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Reduces complaints</h3>
                <p className="text-gray-600">When schedules are provably fair, complaints drop dramatically.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Saves hours every week</h3>
                <p className="text-gray-600">What took 3-5 hours now takes minutes. Get your time back.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Respects availability</h3>
                <p className="text-gray-600">Staff are only scheduled when they're available to work. Simple as that.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 lg:px-8 py-20 overflow-hidden bg-gradient-to-br from-pink-100 via-pink-50 to-white">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Ready to build fairness into your rotas?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join managers who've stopped being the rota referee
          </p>
          <Link 
            href="/sign-up"
            className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-lg font-semibold rounded-lg hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-105"
          >
            Get Started Free
          </Link>
          <p className="text-sm text-gray-600 mt-4">No credit card required • Set up in 5 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-4">
            Shiftly<span className="text-pink-500">●</span>
          </div>
          <p className="text-sm">© 2025 Shiftly. Built for retail and hospitality managers.</p>
        </div>
      </footer>
    </div>
  )
}