'use client'

import { useState } from 'react'

export default function InviteModal({ inviteData, invitedMember, onClose }) {
  const [showCopyLink, setShowCopyLink] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyInviteLink = async () => {
    if (inviteData?.invite_url) {
      await navigator.clipboard.writeText(inviteData.invite_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-cal">Invite Sent!</h2>
          <p className="text-gray-600">We've emailed an invite link to</p>
          <p className="font-medium text-gray-900 mt-1">{invitedMember?.email}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-600">
              <p><strong>{inviteData.staff_name}</strong> will receive an email with a link to create their account and access their schedule.</p>
              <p className="mt-2 text-xs text-gray-500">The link expires in 7 days.</p>
            </div>
          </div>
        </div>

        {!showCopyLink ? (
          <button
            onClick={() => setShowCopyLink(true)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            Need to copy the link manually?
          </button>
        ) : (
          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-2">
              <p className="text-xs text-gray-800 break-all font-mono">{inviteData.invite_url}</p>
            </div>
            <button
              onClick={copyInviteLink}
              className="w-full px-4 py-2 text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-3 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all"
          style={{ background: '#FF1F7D' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}