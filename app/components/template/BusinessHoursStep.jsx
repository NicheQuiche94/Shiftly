'use client'

import { formatTime } from './shift-constants'

const BUFFER_OPTIONS = [0, 15, 30, 45, 60]

function TimeSelect({ value, onChange, label }) {
  const options = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const v = h + m / 60
      options.push({ value: v, label: formatTime(v) })
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 text-lg font-semibold focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function BufferPicker({ value, onChange, label, emoji, description }) {
  return (
    <div className="flex-1 p-5 rounded-xl border border-gray-200 bg-white">
      <div className="text-sm font-bold text-gray-900 mb-1">{emoji} {label}</div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="flex gap-1.5">
        {BUFFER_OPTIONS.map(m => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              value === m
                ? 'border-pink-500 bg-pink-50 text-pink-600'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {m === 0 ? 'None' : `${m}m`}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BusinessHoursStep({ openTime, closeTime, openBuffer, closeBuffer, onChange }) {
  const totalOpen = closeTime - openTime
  const totalStaffWindow = totalOpen + (openBuffer + closeBuffer) / 60

  const openPct = (openTime / 24) * 100
  const widthPct = ((closeTime - openTime) / 24) * 100
  const bufOpenLeft = ((openTime - openBuffer / 60) / 24) * 100
  const bufOpenWidth = (openBuffer / 60 / 24) * 100
  const bufCloseLeft = (closeTime / 24) * 100
  const bufCloseWidth = (closeBuffer / 60 / 24) * 100

  return (
    <div>
      <div className="flex gap-8 mb-7">
        <TimeSelect label="Opens at" value={openTime} onChange={(v) => onChange({ openTime: v })} />
        <TimeSelect label="Closes at" value={closeTime} onChange={(v) => onChange({ closeTime: v })} />
      </div>

      <div className="p-5 rounded-xl border border-gray-200 bg-white mb-6">
        <div className="relative h-11 rounded-lg overflow-hidden bg-gray-100">
          {openBuffer > 0 && (
            <div className="absolute h-full" style={{ left: `${bufOpenLeft}%`, width: `${bufOpenWidth}%`, background: 'repeating-linear-gradient(45deg, #FEF3C7, #FEF3C7 4px, transparent 4px, transparent 8px)', borderLeft: '2px solid #F59E0B' }} />
          )}
          <div className="absolute h-full" style={{ left: `${openPct}%`, width: `${widthPct}%`, background: 'linear-gradient(90deg, #fef1f7, rgba(251,61,136,0.08), #fef1f7)', borderLeft: '2px solid #fb3d88', borderRight: '2px solid #fb3d88' }} />
          {closeBuffer > 0 && (
            <div className="absolute h-full" style={{ left: `${bufCloseLeft}%`, width: `${bufCloseWidth}%`, background: 'repeating-linear-gradient(45deg, #FEF3C7, #FEF3C7 4px, transparent 4px, transparent 8px)', borderRight: '2px solid #F59E0B' }} />
          )}
        </div>
        <div className="flex justify-between mt-2">
          {['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map((t, i) => (
            <span key={i} className="text-[10px] text-gray-400 font-medium">{t}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <BufferPicker label="Opening Buffer" emoji="☀️" description="Setup time before opening" value={openBuffer} onChange={(v) => onChange({ openBuffer: v })} />
        <BufferPicker label="Closing Buffer" emoji="🌙" description="Cleanup time after closing" value={closeBuffer} onChange={(v) => onChange({ closeBuffer: v })} />
      </div>

      <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-pink-50 border border-pink-100">
        <span className="text-xl">⏱</span>
        <span className="text-sm font-semibold text-gray-900">{formatTime(openTime)} → {formatTime(closeTime)}</span>
        <span className="text-xs text-gray-500">· {totalOpen}h open + {openBuffer + closeBuffer}m buffers = {totalStaffWindow.toFixed(1)}h staff window</span>
      </div>
    </div>
  )
}