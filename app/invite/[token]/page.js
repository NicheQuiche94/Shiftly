'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()
  
  const [inviteData, setInviteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [success, setSuccess] = useState(false)

  const token = params.token

  // Validate the invite token on load
  useEffect(() => {
    if (token) {
      validateInvite()
    }
  }, [token])

  // Auto-accept when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && inviteData?.valid && !success) {
      acceptInvite()
    }
  }, [isLoaded, isSignedIn, inviteData, success])

  const validateInvite = async () => {
    try {
      const response = await fetch(`/api/staff/invite?token=${token}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Invalid invite')
        return
      }
      
      setInviteData(data)
    } catch (err) {
      setError('Failed to validate invite')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvite = async () => {
    setAccepting(true)
    try {
      const response = await fetch('/api/staff/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to accept invite')
        return
      }
      
      setSuccess(true)
      
      // Redirect to employee dashboard after 2 seconds
      setTimeout(() => {
        router.push('/employee')
      }, 2000)
    } catch (err) {
      setError('Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invite...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Invalid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact your manager for a new invite link.
          </p>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h1>
          <p className="text-gray-600 mb-4">Welcome to Shiftly, {inviteData?.staff_name}!</p>
          <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You're Invited!</h1>
        </div>

        {/* Invite Details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">You've been invited to join as</p>
          <p className="text-xl font-bold text-gray-900">{inviteData?.staff_name}</p>
          <p className="text-sm text-gray-500 mt-1 capitalize">{inviteData?.role}</p>
        </div>

        {/* What you'll be able to do */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-3">With your account you can:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              View your schedule
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Request time off
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Update your availability
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Swap shifts with colleagues
            </li>
          </ul>
        </div>

        {/* Auth Buttons */}
        {!isSignedIn ? (
          <div className="space-y-3">
            <SignUpButton mode="modal">
              <button className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all">
                Create Account
              </button>
            </SignUpButton>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>
            
            <SignInButton mode="modal">
              <button className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all">
                Sign In
              </button>
            </SignInButton>
          </div>
        ) : (
          <div className="text-center">
            {accepting ? (
              <div>
                <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Setting up your account...</p>
              </div>
            ) : (
              <button
                onClick={acceptInvite}
                className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all"
              >
                Accept Invite
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          By joining, you agree to Shiftly's Terms of Service
        </p>
      </div>
    </main>
  )
}