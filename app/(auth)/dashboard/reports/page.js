'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import TeamSelector from '@/app/components/TeamSelector'
import { generatePayrollPDF } from '@/lib/generatePayrollPDF'
import PageHeader from '@/app/components/PageHeader'
import SectionHeader from '@/app/components/SectionHeader'
import Button from '@/app/components/Button'
import Badge from '@/app/components/Badge'

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeek(dateStr) {
  const d = new Date(dateStr)
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${d.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)} ${d.getFullYear()}`
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-200'}`}>
      <p className="caption mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-pink-600' : 'text-gray-900'} font-cal`}>{value}</p>
      {sub && <p className="caption mt-0.5">{sub}</p>}
    </div>
  )
}

function OvertimeBadge({ status }) {
  const variantMap = {
    under: 'warning',
    met: 'success',
    over: 'error'
  }
  const labels = {
    under: 'Under',
    met: 'Met',
    over: 'Over'
  }
  return <Badge variant={variantMap[status]} size="sm">{labels[status]}</Badge>
}

function MiniBar({ hours, contracted, maxWidth = 120 }) {
  if (!contracted || contracted === 0) return null
  const pct = Math.min((hours / contracted) * 100, 150)
  const isOver = hours > contracted

  return (
    <div className="flex items-center gap-2">
      <div className="bg-gray-100 rounded-full h-2 overflow-hidden" style={{ width: maxWidth }}>
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-400' : 'bg-pink-400'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="caption">{Math.round(pct)}%</span>
    </div>
  )
}

export default function ReportsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [filterStaff, setFilterStaff] = useState('all')
  const [exporting, setExporting] = useState(null)
  const [showStaffBreakdown, setShowStaffBreakdown] = useState(false)

  const currentMonday = useMemo(() => {
    const monday = getMonday(new Date())
    const d = new Date(monday)
    d.setDate(d.getDate() + weekOffset * 7)
    return d.toISOString().split('T')[0]
  }, [weekOffset])

  const weekEndStr = useMemo(() => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  }, [currentMonday])

  const { data: labourData, isLoading } = useQuery({
    queryKey: ['labour-report', selectedTeamId, currentMonday],
    queryFn: async () => {
      const res = await fetch(`/api/reports/labour?start_date=${currentMonday}&team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    enabled: !!selectedTeamId
  })

  const { data: trendData } = useQuery({
    queryKey: ['labour-trend', selectedTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/trend?team_id=${selectedTeamId}&weeks=8`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    enabled: !!selectedTeamId
  })

  const report = labourData?.report || []
  const summary = labourData?.summary || {}

  const filteredReport = filterStaff === 'all'
    ? report
    : report.filter(s => s.staff_id === parseInt(filterStaff))

  const maxTrendCost = trendData ? Math.max(...trendData.map(w => w.total_cost), 1) : 1

  const handleExportCSV = async () => {
    setExporting('csv')
    try {
      const res = await fetch(`/api/reports/export-csv?start_date=${currentMonday}&team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${currentMonday}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export failed:', err)
      alert('Failed to export CSV')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      await generatePayrollPDF(report, summary, labourData?.teamName || 'Team', currentMonday, weekEndStr)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Failed to export PDF')
    } finally {
      setExporting(null)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <PageHeader 
        title="Reports"
        subtitle="Labour costs, hours, and overtime at a glance"
        backLink={{ href: '/dashboard', label: 'Back to Dashboard' }}
      />

      <div className="mb-6">
        <TeamSelector selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} />
      </div>

      {!selectedTeamId ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="body-text font-medium mb-1">Select a team to view reports</p>
          <p className="body-small">Choose a team from the dropdown above</p>
        </div>
      ) : (
        <>
          {/* Week navigation + export buttons */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="btn-icon p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="text-center">
                <p className="heading-subsection font-cal">{formatWeek(currentMonday)}</p>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="caption font-medium hover:text-pink-700"
                    style={{ color: '#FF1F7D' }}
                  >
                    ← This week
                  </button>
                )}
              </div>

              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="btn-icon p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Export buttons */}
            {report.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCSV}
                  loading={exporting === 'csv'}
                  icon={
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Download CSV
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExportPDF}
                  loading={exporting === 'pdf'}
                  icon={
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  }
                >
                  Download PDF
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard label="Total Hours" value={summary.total_hours || 0} sub={`${summary.staff_count || 0} staff`} />
                <StatCard label="Regular Hours" value={summary.total_regular_hours || 0} />
                <StatCard label="Overtime Hours" value={summary.total_overtime_hours || 0} sub={summary.overtime_count > 0 ? `${summary.overtime_count} staff over` : 'None'} />
                <StatCard label="Labour Cost" value={`£${(summary.total_cost || 0).toFixed(2)}`} accent />
              </div>

              {/* Staff Breakdown - Collapsible */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
                <button
                  onClick={() => setShowStaffBreakdown(!showStaffBreakdown)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="heading-section">Staff Breakdown</h2>
                    <Badge variant="default">{filteredReport.length}</Badge>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${showStaffBreakdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showStaffBreakdown && (
                  <>
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                      <p className="body-small font-medium text-gray-700">Filter by staff member</p>
                      <select
                        value={filterStaff}
                        onChange={(e) => setFilterStaff(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      >
                        <option value="all">All staff</option>
                        {report.map(s => (
                          <option key={s.staff_id} value={s.staff_id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {filteredReport.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="body-small">No scheduled hours this week</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredReport.map(s => (
                          <div key={s.staff_id} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <span className="caption font-medium text-gray-600">{s.name.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="body-text font-medium">{s.name}</p>
                                  <p className="caption">{s.role}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <OvertimeBadge status={s.overtime_status} />
                                  {s.wtd_status !== 'normal' && (
                                    <OvertimeBadge status={s.wtd_status === 'over' ? 'over' : 'under'} />
                                  )}
                                  <p className="body-text font-semibold">
                                    {s.hourly_rate > 0 ? `£${s.total_cost.toFixed(2)}` : `${s.scheduled_hours}h`}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-4 caption">
                                <span>{s.regular_hours}h reg</span>
                                {s.overtime_hours > 0 && (
                                  <span className="text-amber-600 font-medium">+{s.overtime_hours}h OT</span>
                                )}
                                {s.hourly_rate > 0 && <span>@ £{s.hourly_rate.toFixed(2)}/h</span>}
                                {s.hourly_rate === 0 && <span className="text-amber-500 italic">No rate set</span>}
                              </div>
                              <MiniBar hours={s.scheduled_hours} contracted={s.contracted_hours} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Cost trend chart */}
              {trendData && trendData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                  <SectionHeader title="Cost Trend (8 weeks)" />

                  <div className="flex items-end gap-1 sm:gap-2 h-40">
                    {trendData.map((week, i) => {
                      const heightPct = maxTrendCost > 0 ? (week.total_cost / maxTrendCost) * 100 : 0
                      const isCurrentWeek = week.week_start === currentMonday

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <p className="caption font-medium">
                            {week.total_cost > 0 ? `£${week.total_cost.toFixed(0)}` : ''}
                          </p>
                          <div className="w-full flex items-end" style={{ height: '100px' }}>
                            <div
                              className={`w-full rounded-t-md transition-all ${
                                isCurrentWeek ? 'bg-pink-400' : 'bg-gray-200'
                              }`}
                              style={{ height: `${Math.max(heightPct, 2)}%` }}
                            />
                          </div>
                          <p className={`caption ${isCurrentWeek ? 'text-pink-600 font-semibold' : ''}`}>
                            {week.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {trendData.some(w => w.overtime_hours > 0) && (
                    <p className="caption text-center mt-3">
                      Overtime hours shown at regular rate — configure overtime multiplier in settings
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}