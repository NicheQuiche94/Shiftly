'use client'

import { useState, useEffect } from 'react'

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Shiftly! 👋',
    content: "Let's take a quick tour to get you set up. This will only take a minute.",
    position: 'center',
    target: null,
  },
  {
    id: 'workspace',
    title: 'Your Workspace',
    content: "This is where you'll set up your team, shifts, and scheduling rules. It's your command center.",
    position: 'right',
    target: 'nav-workspace',
    tip: "Start here first!"
  },
  {
    id: 'staff',
    title: 'Add Your Team',
    content: "Add staff members with their contracted hours and availability. Include their email to invite them to view their schedules.",
    position: 'right',
    target: 'nav-workspace',
    tip: "💡 Staff with emails can log in to see their shifts and request time off"
  },
  {
    id: 'shifts',
    title: 'Create Shift Patterns',
    content: "Set up your recurring shifts - morning, afternoon, evening, or whatever works for your business.",
    position: 'right',
    target: 'nav-workspace',
    tip: "💡 Shifts are reusable templates, set them once and use forever"
  },
  {
    id: 'rules',
    title: 'Set Fairness Rules',
    content: "Define what 'fair' means for your team. No clopening shifts, even weekend distribution, max consecutive days - you decide.",
    position: 'right',
    target: 'nav-workspace',
    tip: "💡 Rules are enforced automatically every time you generate a rota"
  },
  {
    id: 'generate',
    title: 'Rota Builder',
    content: "This is where the magic happens. Generate fair, balanced rotas in seconds that follow all your rules.",
    position: 'right',
    target: 'nav-generate',
  },
  {
    id: 'requests',
    title: 'Time-Off Requests',
    content: "Staff can request time off through the app. You'll see pending requests here and can approve or reject them.",
    position: 'right',
    target: 'nav-requests',
  },
  {
    id: 'pwa',
    title: 'Install the App',
    content: "Add Shiftly to your home screen for quick access. Your team can do this too!",
    position: 'center',
    target: null,
    isPWA: true,
  },
]

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  // Check if tour should show
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('shiftly_tour_complete')
    if (!hasSeenTour) {
      // Small delay to let the page render first
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [])

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Update target position when step changes
  useEffect(() => {
    const step = TOUR_STEPS[currentStep]
    if (step.target) {
      const element = document.getElementById(step.target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
      }
    } else {
      setTargetRect(null)
    }
  }, [currentStep])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const handleSkip = () => {
    completeTour()
  }

  const completeTour = () => {
    localStorage.setItem('shiftly_tour_complete', 'true')
    setIsVisible(false)
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
    } else {
      // Show manual instructions
      handleNext()
    }
  }

  if (!isVisible) return null

  const step = TOUR_STEPS[currentStep]
  const isCenter = step.position === 'center'
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (isCenter || !targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    // Position to the right of the nav item
    return {
      top: `${targetRect.top + targetRect.height / 2}px`,
      left: `${targetRect.right + 20}px`,
      transform: 'translateY(-50%)',
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100] transition-opacity" />

      {/* Highlight target element */}
      {targetRect && (
        <div
          className="fixed z-[101] rounded-xl ring-4 ring-pink-500 ring-opacity-50 pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip bubble */}
      <div
        className="fixed z-[102] w-[340px] max-w-[90vw]"
        style={getTooltipStyle()}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-4">
            <h3 className="text-white text-lg font-cal">{step.title}</h3>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              {step.content}
            </p>

            {step.tip && (
              <div className="bg-pink-50 border border-pink-100 rounded-lg px-3 py-2 mb-3">
                <p className="text-pink-700 text-xs">{step.tip}</p>
              </div>
            )}

            {/* PWA Install Button */}
            {step.isPWA && (
              <div className="mb-3">
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallPWA}
                    className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install Shiftly App
                  </button>
                ) : (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-700 mb-1">To install:</p>
                    <p><strong>iOS:</strong> Tap Share → Add to Home Screen</p>
                    <p><strong>Android/Desktop:</strong> Look for the install icon in your browser's address bar</p>
                  </div>
                )}
              </div>
            )}

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-pink-500'
                      : index < currentStep
                      ? 'bg-pink-200'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip tour
              </button>
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 transition-colors"
              >
                {isLastStep ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Arrow pointer (only for non-center positions) */}
        {!isCenter && targetRect && (
          <div
            className="absolute w-3 h-3 bg-white transform rotate-45 -left-1.5"
            style={{ top: '50%', marginTop: '-6px' }}
          />
        )}
      </div>
    </>
  )
}

// Helper to reset tour (for testing)
export function resetTour() {
  localStorage.removeItem('shiftly_tour_complete')
}