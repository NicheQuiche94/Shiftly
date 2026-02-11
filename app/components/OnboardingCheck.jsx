'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function OnboardingCheck({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoaded, user } = useUser()
  const [checking, setChecking] = useState(true)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const checkOnboarding = async () => {
      // Skip check if not loaded or already on onboarding page
      if (!isLoaded || !user) {
        setChecking(false)
        setShouldShow(true) // Show immediately if not loaded yet
        return
      }

      // Don't redirect if already on onboarding page
      if (pathname === '/onboarding') {
        setShouldShow(true)
        setChecking(false)
        return
      }

      try {
        // Check if user has completed onboarding
        const response = await fetch('/api/teams')
        if (response.ok) {
          const teams = await response.json()
          const defaultTeam = teams.find(t => t.is_default) || teams[0]
          
          // If onboarding not completed, redirect
          if (!defaultTeam?.onboarding_completed) {
            router.push('/onboarding')
            return
          }
          
          // Onboarding complete, show content
          setShouldShow(true)
        } else {
          // If API fails, show content (fail open)
          setShouldShow(true)
        }
      } catch (error) {
        console.error('Error checking onboarding:', error)
        // On error, show content anyway (fail open)
        setShouldShow(true)
      } finally {
        setChecking(false)
      }
    }

    checkOnboarding()
  }, [isLoaded, user, pathname, router])

  // Show loading spinner while checking
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show content - don't wrap in extra divs that might break styling
  return shouldShow ? <>{children}</> : null
}