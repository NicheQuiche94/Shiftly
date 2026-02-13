'use client'

import { useState, useEffect, useRef } from 'react'

export default function WorkspaceOnboardingBanner({ 
  teamId, 
  onAddStaff, 
  onAddShifts, 
  onConfigureRules 
}) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [previousProgress, setPreviousProgress] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const canvasRef = useRef(null)

  // Quick confetti burst
  const triggerConfetti = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const particles = []
    const particleCount = 25
    const colors = ['#FF1F7D', '#FF6B9D', '#FFB3D9', '#9D50BB', '#C77DFF']

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        size: Math.random() * 4 + 2,
        speedY: Math.random() * 8 + 5,
        speedX: Math.random() * 6 - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 20 - 10
      })
    }

    let frameCount = 0
    const maxFrames = 15

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frameCount++
      
      particles.forEach(p => {
        p.y += p.speedY
        p.x += p.speedX
        p.speedY += 0.4
        
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
        
        p.rotation += p.rotationSpeed
      })
      
      if (frameCount < maxFrames) {
        requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    
    animate()
  }

  // Reset when teamId changes
  useEffect(() => {
    setDismissed(false)
    setShowSuccess(false)
    setPreviousProgress(null)
    setProgress(null)
    setLoading(true)
    setIsFirstLoad(true)
  }, [teamId])

  useEffect(() => {
    if (!teamId) return
    
    // Check if this team was already dismissed
    const successDismissed = localStorage.getItem(`team_setup_success_${teamId}`)
    if (successDismissed) {
      setDismissed(true)
      setLoading(false)
      return
    }
    
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}/onboarding-progress`)
        if (!response.ok) throw new Error('Failed to fetch progress')
        const data = await response.json()
        
        const allComplete = data.staffAdded && data.shiftsAdded && data.rulesConfigured
        
        // FIRST LOAD: if already complete, just hide the banner entirely
        if (isFirstLoad && allComplete) {
          localStorage.setItem(`team_setup_success_${teamId}`, 'true')
          setDismissed(true)
          setLoading(false)
          setIsFirstLoad(false)
          return
        }
        
        // SUBSEQUENT LOADS: detect step completions for confetti
        if (previousProgress && !isFirstLoad) {
          const staffJustAdded = !previousProgress.staffAdded && data.staffAdded
          const shiftsJustAdded = !previousProgress.shiftsAdded && data.shiftsAdded
          const rulesJustConfigured = !previousProgress.rulesConfigured && data.rulesConfigured
          
          if (staffJustAdded || shiftsJustAdded || rulesJustConfigured) {
            triggerConfetti()
          }
          
          // Just completed everything - show success briefly then auto-dismiss
          const wasNotComplete = !previousProgress.staffAdded || !previousProgress.shiftsAdded || !previousProgress.rulesConfigured
          if (allComplete && wasNotComplete) {
            setShowSuccess(true)
            triggerConfetti()
            setTimeout(() => {
              localStorage.setItem(`team_setup_success_${teamId}`, 'true')
              setDismissed(true)
            }, 4000)
          }
        }
        
        setPreviousProgress(data)
        setProgress(data)
        setIsFirstLoad(false)
      } catch (error) {
        setProgress(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
    
    const interval = setInterval(fetchProgress, 5000)
    return () => clearInterval(interval)
  }, [teamId, previousProgress, isFirstLoad])

  const handleDismiss = () => {
    setDismissed(true)
    if (showSuccess || (progress?.staffAdded && progress?.shiftsAdded && progress?.rulesConfigured)) {
      localStorage.setItem(`team_setup_success_${teamId}`, 'true')
    }
  }

  // Don't show anything while loading
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-white/60 rounded animate-pulse"></div>
              <div className="h-4 w-32 bg-white/40 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="h-2 bg-white/50 rounded-full mb-4 overflow-hidden">
            <div className="h-full w-1/4 bg-white/70 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/60 rounded-xl p-3 h-20 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  // Hide completely if dismissed or no progress data
  if (!progress || dismissed) return null

  const steps = [
    { 
      key: 'team', 
      label: 'Team created', 
      complete: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      key: 'staff', 
      label: 'Add staff', 
      complete: progress.staffAdded,
      count: progress.staffCount,
      onClick: onAddStaff,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    { 
      key: 'shifts', 
      label: progress.shiftsAdded ? 'Shifts configured' : 'Customise shifts',
      complete: progress.shiftsAdded,
      count: progress.shiftCount,
      onClick: onAddShifts,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      key: 'rules', 
      label: 'Configure rules', 
      complete: progress.rulesConfigured,
      onClick: onConfigureRules,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    }
  ]

  const completedCount = steps.filter(s => s.complete).length
  const totalSteps = steps.length
  const progressPercent = (completedCount / totalSteps) * 100

  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-5 mb-6 relative overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%' }}
      />
      
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-full -mr-16 -mt-16 opacity-50" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={showSuccess ? 'flex-1' : ''}>
            {showSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 font-cal mb-2">
                  Team Set Up! 🎉
                </h3>
                <p className="text-base text-gray-600">
                  Add more staff, shifts and edit rules here anytime!
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 font-cal mb-1">
                  Complete Your Team Setup
                </h3>
                <p className="text-sm text-gray-600">
                  {completedCount} of {totalSteps} steps complete
                </p>
              </>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar + Steps - only when NOT showing success */}
        {!showSuccess && (
          <>
            <div className="h-2 bg-white/50 rounded-full mb-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {steps.map((step) => (
                <button
                  key={step.key}
                  onClick={step.onClick}
                  disabled={!step.onClick}
                  className={`p-3 rounded-xl transition-all text-left ${
                    step.complete 
                      ? 'bg-white/80 cursor-default' 
                      : 'bg-white hover:bg-white/90 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {step.complete ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 text-gray-400">
                        {step.icon}
                      </div>
                    )}
                  </div>
                  <p className={`text-sm font-medium ${step.complete ? 'text-gray-600' : 'text-gray-900'}`}>
                    {step.label}
                  </p>
                  {step.count !== undefined && step.count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {step.count} added
                    </p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}