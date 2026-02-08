'use client'

import { useState } from 'react'

export default function AnnouncementComposer({ selectedTeamId, onSent }) {
  const [message, setMessage] = useState('')
  const [scope, setScope] = useState('team') // 'team' or 'all'
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return
    if (scope === 'team' && !selectedTeamId) return

    setSending(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/notifications/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: scope === 'team' ? selectedTeamId : null,
          all_teams: scope === 'all',
          message: message.trim(),
        }),
      })

      if (!res.ok) throw new Error('Failed to send')

      setMessage('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSent?.()
    } catch (err) {
      console.error('Failed to send announcement:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h3 className="font-bold text-gray-900 font-cal">Send Announcement</h3>
        </div>

        {/* Scope toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setScope('team')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              scope === 'team'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            This Team
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              scope === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Teams
          </button>
        </div>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={scope === 'all' ? 'Write a message to all your teams…' : 'Write a message to your team…'}
        rows={3}
        maxLength={1000}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 text-gray-900 placeholder:text-gray-400"
      />

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">{message.length}/1000</span>
        <div className="flex items-center gap-2">
          {success && (
            <span className="text-xs text-green-600 font-medium">Sent to {scope === 'all' ? 'all teams' : 'team'}</span>
          )}
          <button
            onClick={handleSend}
            disabled={!message.trim() || (scope === 'team' && !selectedTeamId) || sending}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF1F7D' }}
          >
            {sending ? 'Sending…' : scope === 'all' ? 'Send to All Teams' : 'Send to Team'}
          </button>
        </div>
      </div>
    </div>
  )
}