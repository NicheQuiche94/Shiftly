'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import TeamSelector from '@/app/components/TeamSelector'
import PageHeader from '@/app/components/PageHeader'
import Button from '@/app/components/Button'
import Badge from '@/app/components/Badge'
import CostTrendChart from '@/app/components/CostTrendChart'

export default function ReportsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [report, setReport] = useState([])
  const [summary, setSummary] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [exporting, setExporting] = useState(null)
  const [showStaffBreakdown, setShowStaffBreakdown] = useState(false)
  const [filterStaff, setFilterStaff] = useState('all')

  const currentMonday = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff + (weekOffset * 7))
    monday.setHours(0, 0, 0, 0)
    return monday
  }, [weekOffset])

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    try {
      const startDate = currentMonday.toISOString().split('T')[0]
      const res = await fetch(`/api/reports/labour?start_date=${startDate}&team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setReport(data.report || [])
      setSummary(data.summary || {})
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentMonday, selectedTeamId])

  useEffect(() => {
    if (selectedTeamId) {
      loadReport()
    }
  }, [selectedTeamId, loadReport])

  const formatWeekRange = (monday) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const startMonth = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const endMonth = sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const year = sunday.getFullYear()
    return `${startMonth} – ${endMonth} ${year}`
  }

  const handleExportCSV = async () => {
    setExporting('csv')
    try {
      const startDate = currentMonday.toISOString().split('T')[0]
      const res = await fetch(`/api/reports/export-csv?start_date=${startDate}&team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `labour-report-${startDate}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export CSV')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      const startDate = currentMonday.toISOString().split('T')[0]
      const res = await fetch(`/api/reports/export-pdf?start_date=${startDate}&team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `labour-report-${startDate}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export PDF')
    } finally {
      setExporting(null)
    }
  }

  const filteredReport = useMemo(() => {
    if (filterStaff === 'all') return report
    return report.filter(s => s.staff_id === parseInt(filterStaff))
  }, [report, filterStaff])

  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <PageHeader 
        title="Reports"
        subtitle="Labour costs, hours, and overtime at a glance"
        backLink={{ href: '/dashboard', label: 'Back to Dashboard' }}
      />

      {/* Team Selector */}
      <div className="mb-6">
        <TeamSelector 
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      </div>

      {selectedTeamId && (
        <div className="space-y-4">
          {/* Week Navigator Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
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
                <div className="heading-subsection">
                  {formatWeekRange(currentMonday)}
                </div>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="caption text-pink-600 hover:text-pink-700 transition-colors mt-1"
                  >
                    ← Back to this week
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
                                  {/* Combined status badge - prioritize most serious */}
                                  {s.wtd_status === 'over' ? (
                                    <Badge variant="error" size="sm" title="Exceeds 48h Working Time Directive">
                                      WTD Over
                                    </Badge>
                                  ) : s.overtime_status === 'over' ? (
                                    <Badge variant="warning" size="sm" title="Exceeds contracted hours">
                                      Over Contract
                                    </Badge>
                                  ) : s.overtime_status === 'met' ? (
                                    <Badge variant="success" size="sm">
                                      Met
                                    </Badge>
                                  ) : null}
                                  
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
              <CostTrendChart teamId={selectedTeamId} />
            </>
          )}
        </div>
      )}
    </main>
  )
}

// Helper Components
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${accent ? 'bg-pink-50 border-pink-200' : ''}`}>
      <p className="body-small text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-pink-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="caption mt-1">{sub}</p>}
    </div>
  )
}

function MiniBar({ hours, contracted }) {
  const percentage = contracted > 0 ? Math.min((hours / contracted) * 100, 120) : 0
  const color = percentage > 100 ? 'bg-red-500' : percentage === 100 ? 'bg-green-500' : 'bg-gray-300'
  
  return (
    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}