'use client'

import { DAYS, getBlockColor, formatTime } from './shift-constants'

export default function WeekOverview({
  weekDays, templates, shiftLengths,
  onToggleDay, onAssignTemplate,
  compact = false, readOnly = false, vertical = false,
}) {
  const templateNames = Object.keys(templates)

  const weeklyHours = DAYS.reduce((sum, d) => {
    if (!weekDays[d]?.on) return sum
    const tmpl = templates[weekDays[d].tmpl]
    if (!tmpl?.shifts) return sum
    return sum + tmpl.shifts.reduce((a, s) => a + s.length * s.headcount, 0)
  }, 0)

  const daysOpen = DAYS.filter(d => weekDays[d]?.on).length

  return (
    <div>
      <div className={vertical ? 'flex flex-col gap-2' : `flex gap-2 ${compact ? 'mb-4' : 'mb-5'}`}>
        {DAYS.map(d => {
          const wd = weekDays[d]
          const enabled = wd?.on
          const tmpl = enabled ? templates[wd.tmpl] : null
          const shifts = tmpl?.shifts || []
          const dayHours = shifts.reduce((a, s) => a + s.length * s.headcount, 0)

          if (vertical) {
            return (
              <div key={d} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-40'}`}>
                <span className="text-xs font-bold text-gray-900 w-8">{d}</span>
                {enabled && (
                  <>
                    <div className="flex gap-0.5 flex-1">
                      {shifts.map((s, i) => {
                        const c = getBlockColor(i)
                        return (
                          <div key={i} className="rounded flex items-center justify-center px-1" style={{ height: 16, flex: s.length, background: c.bg, borderLeft: `2px solid ${c.border}` }}>
                            <span className="text-[7px] font-bold" style={{ color: c.text }}>×{s.headcount}</span>
                          </div>
                        )
                      })}
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium w-7 text-right">{Math.round(dayHours)}h</span>
                    {!readOnly && templateNames.length > 1 && (
                      <select value={wd.tmpl} onChange={(e) => onAssignTemplate(d, e.target.value)} className="text-[9px] px-1 py-0.5 rounded border border-gray-200 bg-white font-semibold text-gray-600 focus:border-pink-500 focus:outline-none w-16">
                        {templateNames.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </>
                )}
                {!enabled && <span className="text-[10px] text-gray-400 flex-1">Closed</span>}
                {!readOnly && (
                  <button onClick={() => onToggleDay(d)} className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className="absolute w-[14px] h-[14px] bg-white rounded-full top-[2px] shadow-sm transition-all" style={{ left: enabled ? 14 : 2 }} />
                  </button>
                )}
              </div>
            )
          }

          // Horizontal layout (step 6)
          return (
            <div key={d} className={`flex-1 rounded-xl border transition-all ${compact ? 'p-2.5' : 'p-3.5'} ${enabled ? 'border-gray-200 bg-white shadow-sm' : 'border-gray-100 bg-gray-50 opacity-40'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`font-bold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>{d}</span>
                {!readOnly && (
                  <button onClick={() => onToggleDay(d)} className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className="absolute w-4 h-4 bg-white rounded-full top-0.5 shadow-sm transition-all" style={{ left: enabled ? 18 : 2 }} />
                  </button>
                )}
              </div>
              {enabled && (
                <>
                  <div className="flex flex-col gap-0.5">
                    {shifts.map((s, i) => {
                      const c = getBlockColor(i)
                      return (
                        <div key={i} className="rounded flex items-center pl-1" style={{ height: Math.max(6, s.length * 2.5), background: c.bg, borderLeft: `2px solid ${c.border}` }}>
                          <span className="text-[8px] font-bold" style={{ color: c.text }}>×{s.headcount}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className={`mt-1.5 text-gray-500 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>{Math.round(dayHours)}h</div>
                  {!readOnly && templateNames.length > 1 && (
                    <select value={wd.tmpl} onChange={(e) => onAssignTemplate(d, e.target.value)} className={`mt-1.5 w-full rounded-lg border border-gray-200 bg-white font-semibold text-gray-600 focus:border-pink-500 focus:outline-none ${compact ? 'text-[9px] px-1 py-0.5' : 'text-[11px] px-2 py-1'}`}>
                      {templateNames.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </>
              )}
              {!enabled && <div className={`text-gray-400 mt-1 ${compact ? 'text-[9px]' : 'text-xs'}`}>Closed</div>}
            </div>
          )
        })}
      </div>

      {!compact && !vertical && (
        <div className="flex gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Weekly staff-hours</div>
            <div className="text-3xl font-bold" style={{ color: '#EC4899' }}>{Math.round(weeklyHours)}h</div>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Days open</div>
            <div className="text-3xl font-bold" style={{ color: '#10B981' }}>{daysOpen}</div>
          </div>
        </div>
      )}
    </div>
  )
}