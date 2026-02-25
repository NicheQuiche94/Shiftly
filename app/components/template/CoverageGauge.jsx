'use client'

export default function CoverageGauge({ shiftHours, contractedHours, maxHours, gaps = [] }) {
  // Coverage is based on what staff CAN work (max hours), not just contracted
  const effectiveHours = maxHours > 0 ? maxHours : contractedHours
  const coverage = shiftHours > 0
    ? Math.min(100, Math.round((effectiveHours / shiftHours) * 100))
    : 0

  const shortfall = Math.max(0, shiftHours - effectiveHours)

  // Use only palette colours: green (#10B981), orange (#F97316), red (#EF4444)
  const color = coverage >= 100 ? '#10B981' : coverage >= 70 ? '#F97316' : '#EF4444'
  const label = coverage >= 100 ? 'Fully covered' : 'Coverage gaps'

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white border border-gray-200 shadow-sm">
      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `conic-gradient(${color} ${coverage * 3.6}deg, #F3F4F6 0deg)` }}>
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{coverage}%</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold" style={{ color }}>{label}</div>
        <div className="text-xs text-gray-500">
          {Math.round(effectiveHours)}h available of {Math.round(shiftHours)}h needed
          {maxHours > contractedHours && (
            <span className="text-gray-400"> · {Math.round(contractedHours)}h contracted + {Math.round(maxHours - contractedHours)}h overtime</span>
          )}
        </div>
      </div>
      {shortfall > 0 && (
        <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#FFF7ED', border: '1px solid #FDBA74', color: '#C2410C' }}>
          Need {Math.round(shortfall)}h more
        </div>
      )}
    </div>
  )
}