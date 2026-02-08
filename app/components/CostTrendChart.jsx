'use client'

import { useState, useEffect, useRef } from 'react'
import SectionHeader from '@/app/components/SectionHeader'

const PRESET_RANGES = [
  { id: 'last_4', label: 'Last 4 weeks', getRange: () => getWeekRange(-3, 0) },
  { id: 'last_8', label: 'Last 8 weeks', getRange: () => getWeekRange(-7, 0) },
  { id: 'next_4', label: 'Next 4 weeks', getRange: () => getWeekRange(1, 4) },
  { id: 'last_4_next_4', label: 'Last 4 + Next 4', getRange: () => getWeekRange(-3, 4) },
  { id: 'custom', label: 'Custom range', getRange: null },
]

// Helper to get Monday-based week range
function getWeekRange(startWeekOffset, endWeekOffset) {
  const today = new Date()
  const currentMonday = getMonday(today)
  
  const startMonday = new Date(currentMonday)
  startMonday.setDate(currentMonday.getDate() + (startWeekOffset * 7))
  
  const endMonday = new Date(currentMonday)
  endMonday.setDate(currentMonday.getDate() + (endWeekOffset * 7))
  const endSunday = new Date(endMonday)
  endSunday.setDate(endSunday.getDate() + 6)
  
  return {
    start: startMonday.toISOString().split('T')[0],
    end: endSunday.toISOString().split('T')[0]
  }
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function CostTrendChart({ teamId }) {
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState('last_8')
  const [showPicker, setShowPicker] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [dateRange, setDateRange] = useState(getWeekRange(-7, 0))
  const pickerRef = useRef(null)

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (teamId) {
      loadTrend()
    }
  }, [teamId, dateRange])

  const loadTrend = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/trend?team_id=${teamId}&start_date=${dateRange.start}&end_date=${dateRange.end}`)
      if (!res.ok) throw new Error('Failed to load trend')
      const data = await res.json()
      setTrendData(data || [])
    } catch (error) {
      console.error('Error loading cost trend:', error)
      setTrendData([])
    } finally {
      setLoading(false)
    }
  }

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.id)
    if (preset.id === 'custom') {
      setShowPicker(true)
    } else {
      setShowPicker(false)
      const range = preset.getRange()
      setDateRange(range)
    }
  }

  const handleCustomDateApply = () => {
    if (customStart && customEnd) {
      setDateRange({ start: customStart, end: customEnd })
      setShowPicker(false)
    }
  }

  const formatDateRange = () => {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Labour Cost Trend" />
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const maxCost = Math.max(...trendData.map(w => w.total_cost || 0), 1)
  const hasData = trendData.some(w => (w.total_cost || 0) > 0)
  const totalCost = trendData.reduce((sum, w) => sum + (w.total_cost || 0), 0)
  const totalHours = trendData.reduce((sum, w) => sum + (w.total_hours || 0), 0)

  // Find current week index
  const today = new Date().toISOString().split('T')[0]
  const currentWeekIndex = trendData.findIndex(w => {
    const weekStart = new Date(w.week_start)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const todayDate = new Date(today)
    return todayDate >= weekStart && todayDate <= weekEnd
  })

  const hasFutureData = currentWeekIndex >= 0 && currentWeekIndex < trendData.length - 1
  const hasPastData = currentWeekIndex > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header with date range picker */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="heading-section mb-1">Labour Cost Trend</h2>
          <p className="body-small text-gray-600">{formatDateRange()}</p>
        </div>
        
        {/* Date range selector */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 transition-all body-text"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{PRESET_RANGES.find(p => p.id === selectedPreset)?.label}</span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown picker */}
          {showPicker && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 min-w-[320px] overflow-hidden">
              {/* Preset buttons */}
              <div className="p-3 border-b border-gray-100">
                <p className="caption font-medium text-gray-700 mb-2">Quick select</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_RANGES.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`px-3 py-2 rounded-lg body-small text-left transition-all ${
                        selectedPreset === preset.id
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-pink-50 hover:text-pink-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date inputs */}
              {selectedPreset === 'custom' && (
                <div className="p-4 bg-gray-50">
                  <p className="caption font-medium text-gray-700 mb-3">Custom date range</p>
                  <div className="space-y-3">
                    <div>
                      <label className="caption text-gray-600 mb-1 block">Start date</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg body-small focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="caption text-gray-600 mb-1 block">End date</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={customStart}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg body-small focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleCustomDateApply}
                      disabled={!customStart || !customEnd}
                      className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg body-small font-medium hover:bg-pink-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Apply custom range
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="body-text text-gray-500 mb-1">No cost data available</p>
            <p className="body-small text-gray-400">Approve rotas to see labour costs</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-64 flex items-end justify-between gap-1.5">
            {trendData.map((week, i) => {
              const cost = week.total_cost || 0
              const height = (cost / maxCost) * 100
              const isCurrentWeek = i === currentWeekIndex
              const isFuture = i > currentWeekIndex

              return (
                <div 
                  key={i} 
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  {/* Bar */}
                  <div 
                    className={`w-full rounded-t-xl transition-all cursor-pointer relative group ${
                      isCurrentWeek 
                        ? 'bg-gradient-to-t from-pink-600 to-pink-500 shadow-lg shadow-pink-200' 
                        : isFuture
                        ? 'bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 hover:shadow-lg hover:shadow-blue-100'
                        : 'bg-gradient-to-t from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 hover:shadow-lg hover:shadow-pink-100'
                    }`}
                    style={{ 
                      height: `${height}%`, 
                      minHeight: cost > 0 ? '16px' : '4px',
                      opacity: cost > 0 ? 1 : 0.2
                    }}
                  >
                    {/* Hover tooltip */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-2xl z-10">
                      {cost > 0 ? (
                        <>
                          <div className="font-semibold text-lg mb-1">£{cost.toFixed(2)}</div>
                          <div className="text-gray-300 text-xs mb-1">{week.total_hours}h scheduled</div>
                          {week.overtime_hours > 0 && (
                            <div className="text-amber-300 text-xs">+{week.overtime_hours}h overtime</div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400 text-xs">No rota</div>
                      )}
                    </div>
                  </div>

                  {/* Week label */}
                  <div className="text-center">
                    <div className={`caption font-medium ${
                      isCurrentWeek 
                        ? 'text-pink-600' 
                        : isFuture 
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}>
                      {week.label}
                    </div>
                    {isCurrentWeek && (
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mx-auto mt-1"></div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend & Summary */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              {hasPastData && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-t from-pink-500 to-pink-400 shadow-sm"></div>
                  <span className="caption">Past</span>
                </div>
              )}
              {currentWeekIndex >= 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-t from-pink-600 to-pink-500 shadow-md shadow-pink-200"></div>
                  <span className="caption">Current</span>
                </div>
              )}
              {hasFutureData && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-t from-blue-500 to-blue-400 shadow-sm"></div>
                  <span className="caption">Forecast</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="heading-subsection text-gray-900">
                £{totalCost.toFixed(2)}
              </div>
              <div className="caption">
                {totalHours.toFixed(1)}h total
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}