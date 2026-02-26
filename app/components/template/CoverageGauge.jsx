'use client'

export default function CoverageGauge({ shiftHours, contractedHours, maxHours, warnings = [] }) {
  // Coverage is based on what staff CAN work (max hours), not just contracted
  const effectiveHours = maxHours > 0 ? maxHours : contractedHours
  const coverage = shiftHours > 0
    ? Math.min(100, Math.round((effectiveHours / shiftHours) * 100))
    : 0

  const shortfall = Math.max(0, shiftHours - effectiveHours)

  // Use only palette colours: green (#10B981), orange (#F97316), red (#EF4444)
  const hasWarnings = warnings.length > 0
  const color = coverage >= 100 && !hasWarnings ? '#10B981' : coverage >= 70 ? '#F97316' : '#EF4444'
  const label = coverage >= 100 && !hasWarnings ? 'Fully covered' : 'Coverage gaps'

  return (
    <div>
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `conic-gradient(${color} ${coverage * 3.6}deg, #F3F4F6 0deg)` }}>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color }}>{coverage}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color }}>{label}</div>
          <div className="text-xs text-gray-500">
            {Math.round(effectiveHours)}h of {Math.round(shiftHours)}h needed
            {maxHours > contractedHours && (
              <span className="text-gray-400"> · {Math.round(contractedHours)}h + {Math.round(maxHours - contractedHours)}h OT</span>
            )}
          </div>
        </div>
        {shortfall > 0 && (
          <div className="px-2 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0" style={{ background: '#FFF7ED', border: '1px solid #FDBA74', color: '#C2410C' }}>
            +{Math.round(shortfall)}h
          </div>
        )}
      </div>
      {warnings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700">
              {w.type === 'keyholder' ? (
                <span className="flex-shrink-0 mt-px">🔑</span>
              ) : (
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              )}
              <span>{w.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}