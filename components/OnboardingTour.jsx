'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Shiftly!',
    content: "Your workspace is all set up with the shifts and team you just entered. Let's take a quick tour so you know where everything is. This will only take a minute.",
    position: 'center',
    target: null,
    page: null,
  },
  {
    id: 'templates',
    title: 'Your Templates',
    content: "This is where your shift patterns live. Day templates define the shifts for each type of day, and the weekly schedule assigns them to Monday through Sunday.",
    tip: "Shifts come first — they're the constant. Your staff are scheduled around them.",
    position: 'left',
    target: 'tour-templates-section',
    page: '/dashboard/workspace?tab=templates',
  },
  {
    id: 'staff',
    title: 'Your Team',
    content: "Your staff, their contracted hours, and their availability. The coverage gauge shows at a glance if you have enough people to fill all your shifts.",
    position: 'left',
    target: 'tour-staff-section',
    page: '/dashboard/workspace?tab=staff-shifts',
  },
  {
    id: 'rota-builder',
    title: 'Generate a Rota',
    content: "Pick your team and dates, then hit Generate. Your templates are synced automatically and all your rules are applied — a fair, balanced schedule in seconds.",
    position: 'bottom',
    target: 'tour-rota-actions',
    page: '/dashboard/generate',
  },
  {
    id: 'rota-edit',
    title: 'Edit & Approve',
    content: "Click any shift to edit, reassign, or remove. When you're happy, approve it and your team gets notified instantly — no more WhatsApp groups or printed sheets.",
    position: 'center',
    target: null,
    page: '/dashboard/generate',
  },
  {
    id: 'inbox',
    title: 'Your Inbox',
    content: "All your staff requests and alerts in one place. When staff request time off or shift swaps, they'll appear here for your approval.",
    position: 'right',
    target: 'nav-requests',
    page: '/dashboard/requests',
  },
  {
    id: 'reports',
    title: 'Reports',
    content: "Track hours worked, weekly costs, and compliance across your team. See at a glance if contracted hours are being met.",
    position: 'right',
    target: 'nav-reports',
    page: '/dashboard/reports',
  },
  {
    id: 'payroll',
    title: 'Payroll',
    content: "Export payroll-ready data for your team. Pay information is password-protected to keep sensitive salary data secure.",
    tip: "Add pay rates for each staff member to use payroll and cost reports.",
    position: 'right',
    target: 'nav-payroll',
    page: null,
  },
  {
    id: 'help',
    title: 'Help Centre',
    content: "Got questions? Find answers here, and you can retake this tour anytime.",
    position: 'right',
    target: 'nav-help',
    page: '/dashboard/help',
  },
  {
    id: 'pwa',
    title: 'Install the App',
    content: "Add Shiftly to your home screen for instant access — no app store needed. Share this tip with your team so they can check their shifts on the go.",
    position: 'center',
    target: null,
    page: null,
    isPWA: true,
  },
]

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [navigating, setNavigating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Check if tour should show
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('shiftly_tour_complete')
    const shouldStartTour = searchParams.get('tour') === 'start'
    const isNewSubscription = searchParams.get('subscription') === 'success'

    if (!hasSeenTour || isNewSubscription || shouldStartTour) {
      if (isNewSubscription || shouldStartTour) {
        localStorage.removeItem('shiftly_tour_complete')
      }
      setTimeout(() => setIsVisible(true), 800)
    }
  }, [searchParams])

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Update target position when step changes or page changes
  const updateTargetRect = useCallback(() => {
    const step = TOUR_STEPS[currentStep]
    if (step?.target) {
      const element = document.getElementById(step.target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
        setNavigating(false)
        return
      }
    }
    setTargetRect(null)
    setNavigating(false)
  }, [currentStep])

  useEffect(() => {
    if (!isVisible) return
    // Longer delay for page navigations to allow content to render
    const timer = setTimeout(updateTargetRect, 500)
    return () => clearTimeout(timer)
  }, [currentStep, pathname, isVisible, updateTargetRect])

  useEffect(() => {
    if (!isVisible) return
    window.addEventListener('resize', updateTargetRect)
    return () => window.removeEventListener('resize', updateTargetRect)
  }, [isVisible, updateTargetRect])

  const navigateToStep = useCallback(async (stepIndex) => {
    const step = TOUR_STEPS[stepIndex]
    if (step.page) {
      const stepUrl = new URL(step.page, window.location.origin)
      const stepPath = stepUrl.pathname
      if (pathname !== stepPath) {
        setNavigating(true)
        router.push(step.page)
      } else if (stepUrl.search) {
        // Same path but different query params (e.g. ?tab=)
        router.push(step.page)
      }
    }
    setCurrentStep(stepIndex)
  }, [pathname, router])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      navigateToStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    completeTour()
  }

  const completeTour = () => {
    localStorage.setItem('shiftly_tour_complete', 'true')
    setIsVisible(false)
    if (pathname !== '/dashboard') {
      router.push('/dashboard')
    }
    onComplete?.()
  }

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (outcome === 'accepted') {
        handleNext()
      }
    }
  }

  if (!isVisible) return null

  const step = TOUR_STEPS[currentStep]
  const isCenter = step.position === 'center' || !targetRect
  const isLastStep = currentStep === TOUR_STEPS.length - 1
  const isFirstStep = currentStep === 0

  // Calculate tooltip position based on step.position and target location
  const getTooltipStyle = () => {
    if (isCenter || !targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    if (step.position === 'right') {
      // To the right of the target (for sidebar nav items)
      const top = targetRect.top + targetRect.height / 2
      const left = targetRect.right + 24
      return {
        top: `${Math.max(200, Math.min(top, window.innerHeight - 200))}px`,
        left: `${left}px`,
        transform: 'translateY(-50%)',
      }
    }

    if (step.position === 'left') {
      // To the left of the target, overlapping sidebar (for main content sections)
      const top = Math.max(100, targetRect.top)
      return {
        top: `${top}px`,
        left: '60px',
      }
    }

    if (step.position === 'bottom') {
      // Below the target
      const top = targetRect.bottom + 16
      const left = targetRect.left
      return {
        top: `${top}px`,
        left: `${Math.max(16, left)}px`,
      }
    }

    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  // Build clip-path for overlay with cutout around target
  const getOverlayClipPath = () => {
    if (!targetRect) return undefined
    const pad = 8
    const l = Math.max(0, targetRect.left - pad)
    const t = Math.max(0, targetRect.top - pad)
    const r = targetRect.right + pad
    const b = targetRect.bottom + pad
    return `polygon(0% 0%, 0% 100%, ${l}px 100%, ${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px, ${l}px 100%, 100% 100%, 100% 0%)`
  }

  return (
    <>
      {/* Backdrop overlay with cutout for target */}
      <div
        className="fixed inset-0 bg-black/40 z-[100] transition-all duration-300"
        style={targetRect ? { clipPath: getOverlayClipPath() } : {}}
      />

      {/* Highlight ring around target */}
      {targetRect && !navigating && (
        <div
          className="fixed z-[101] rounded-2xl ring-[3px] ring-pink-400 ring-offset-4 ring-offset-transparent pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tooltip */}
      {!navigating && (
        <div
          className="fixed z-[102] w-[420px] max-w-[92vw] transition-all duration-300"
          style={getTooltipStyle()}
        >
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-100">
            {/* Pink accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-pink-400 via-pink-500 to-pink-400" />

            {/* Content */}
            <div className="px-7 py-6">
              {/* Step counter */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
                <button
                  onClick={handleSkip}
                  className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip tour
                </button>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-3 font-cal">{step.title}</h3>

              {/* Body */}
              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                {step.content}
              </p>

              {/* Tip box */}
              {step.tip && (
                <div className="bg-pink-50/60 border border-pink-100 rounded-2xl px-4 py-3 mb-5">
                  <p className="text-pink-700 text-sm leading-relaxed">{step.tip}</p>
                </div>
              )}

              {/* PWA Install */}
              {step.isPWA && (
                <div className="mb-5">
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstallPWA}
                      className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-2xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Install Shiftly
                    </button>
                  ) : (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded-2xl p-4">
                      <p className="font-semibold text-gray-700 mb-2">To install:</p>
                      <p className="mb-1"><strong>iPhone/iPad:</strong> Tap Share then Add to Home Screen</p>
                      <p><strong>Android/Desktop:</strong> Look for the install icon in your browser&apos;s address bar</p>
                    </div>
                  )}
                </div>
              )}

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {TOUR_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'w-6 h-2 bg-pink-500'
                        : index < currentStep
                        ? 'w-2 h-2 bg-pink-300'
                        : 'w-2 h-2 bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-3">
                {!isFirstStep && (
                  <button
                    onClick={handleBack}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-2.5 text-sm font-semibold text-white rounded-2xl transition-all hover:shadow-lg hover:shadow-pink-500/25"
                  style={{ background: '#FF1F7D' }}
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>

          {/* Arrow pointer for right-positioned tooltips */}
          {step.position === 'right' && targetRect && (
            <div
              className="absolute w-4 h-4 bg-white transform rotate-45 -left-2 border-l border-b border-gray-100"
              style={{ top: '50%', marginTop: '-8px' }}
            />
          )}
        </div>
      )}

      {/* Loading state while navigating between pages */}
      {navigating && (
        <div className="fixed z-[102] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      )}
    </>
  )
}

export function resetTour() {
  localStorage.removeItem('shiftly_tour_complete')
}
