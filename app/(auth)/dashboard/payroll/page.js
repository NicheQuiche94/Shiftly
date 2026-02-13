'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import TeamSelector from '@/app/components/TeamSelector'
import PageHeader from '@/app/components/PageHeader'
import SectionHeader from '@/app/components/SectionHeader'
import Button from '@/app/components/Button'
import Badge from '@/app/components/Badge'

export default function PayrollPage() {
  const { user } = useUser()
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifying, setVerifying] = useState(false)
  
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [staffPayroll, setStaffPayroll] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(null)
  
  const [rotas, setRotas] = useState([])
  const [selectedRotaId, setSelectedRotaId] = useState(null)
  const [rotaCosts, setRotaCosts] = useState(null)
  const [loadingCosts, setLoadingCosts] = useState(false)
  
  const [activeTab, setActiveTab] = useState('pay')
  
  const [editingStaffId, setEditingStaffId] = useState(null)
  const [editForm, setEditForm] = useState({
    pay_type: 'hourly',
    hourly_rate: '',
    annual_salary: ''
  })

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setVerifying(true)
    setPasswordError('')

    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (response.ok) {
        setIsUnlocked(true)
        setPassword('')
        sessionStorage.setItem('payroll_unlocked', 'true')
      } else {
        setPasswordError('Incorrect password. Please try again.')
      }
    } catch (error) {
      setPasswordError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    const unlocked = sessionStorage.getItem('payroll_unlocked')
    if (unlocked === 'true') {
      setIsUnlocked(true)
    }
  }, [])

  useEffect(() => {
    if (isUnlocked && selectedTeamId) {
      loadStaffPayroll()
      loadRotas()
    }
  }, [isUnlocked, selectedTeamId])

  const loadStaffPayroll = async () => {
    setLoading(true)
    try {
      const url = selectedTeamId 
        ? `/api/payroll?team_id=${selectedTeamId}`
        : '/api/payroll'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setStaffPayroll(data)
      }
    } catch (error) {
      console.error('Error loading payroll:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRotas = async () => {
    try {
      const response = await fetch('/api/rotas')
      if (response.ok) {
        const data = await response.json()
        setRotas(data.filter(r => r.approved))
      }
    } catch (error) {
      console.error('Error loading rotas:', error)
    }
  }

  const loadRotaCosts = async (rotaId) => {
    setLoadingCosts(true)
    setRotaCosts(null)
    try {
      const response = await fetch(`/api/payroll/costs?rota_id=${rotaId}`)
      if (response.ok) {
        const data = await response.json()
        setRotaCosts(data)
      }
    } catch (error) {
      console.error('Error loading costs:', error)
    } finally {
      setLoadingCosts(false)
    }
  }

  const handleRotaSelect = (rotaId) => {
    setSelectedRotaId(rotaId)
    if (rotaId) {
      loadRotaCosts(rotaId)
    } else {
      setRotaCosts(null)
    }
  }

  const handleExportCSV = async () => {
    if (!selectedRotaId) return
    
    try {
      const response = await fetch(`/api/payroll/export?rota_id=${selectedRotaId}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll-export.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      }
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export CSV')
    }
  }

  const startEditing = (staff) => {
    setEditingStaffId(staff.id)
    setEditForm({
      pay_type: staff.pay_type || 'hourly',
      hourly_rate: staff.hourly_rate?.toString() || '',
      annual_salary: staff.annual_salary?.toString() || ''
    })
  }

  const cancelEditing = () => {
    setEditingStaffId(null)
    setEditForm({
      pay_type: 'hourly',
      hourly_rate: '',
      annual_salary: ''
    })
  }

  const savePayroll = async (staffId) => {
    setSaving(staffId)
    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          pay_type: editForm.pay_type,
          hourly_rate: editForm.pay_type === 'hourly' ? parseFloat(editForm.hourly_rate) || null : null,
          annual_salary: editForm.pay_type === 'salary' ? parseFloat(editForm.annual_salary) || null : null
        })
      })

      if (response.ok) {
        await loadStaffPayroll()
        setEditingStaffId(null)
      } else {
        alert('Failed to save payroll info')
      }
    } catch (error) {
      console.error('Error saving payroll:', error)
      alert('Failed to save payroll info')
    } finally {
      setSaving(null)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Password gate screen
  if (!isUnlocked) {
    return (
      <main className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="heading-page mb-2">Payroll Access</h1>
            <p className="body-text">
              Enter your account password to access sensitive payroll information
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label className="block body-text font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white text-base"
                placeholder="Enter your password"
                required
              />
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 body-small">
                {passwordError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={verifying || !password}
              loading={verifying}
              className="w-full"
            >
              Unlock Payroll
            </Button>
          </form>

          <p className="caption text-center mt-6">
            Payroll data is protected. Access is logged for security.
          </p>
        </div>
      </main>
    )
  }

  // Main payroll interface
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader 
            title="Payroll"
            subtitle="Manage staff pay rates and calculate rota costs"
          />
          <button
            onClick={() => {
              sessionStorage.removeItem('payroll_unlocked')
              setIsUnlocked(false)
            }}
            className="self-start sm:self-auto px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2 body-small"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lock
          </button>
        </div>
      </div>

      {/* Team Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <SectionHeader title="Select Team" />
        <div className="mt-4">
          <TeamSelector
            selectedTeamId={selectedTeamId}
            onTeamChange={setSelectedTeamId}
            showAddButton={false}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('pay')}
          className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all body-text whitespace-nowrap ${
            activeTab === 'pay'
              ? 'bg-pink-100 text-pink-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pay Rates
        </button>
        <button
          onClick={() => setActiveTab('costs')}
          className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all body-text whitespace-nowrap ${
            activeTab === 'costs'
              ? 'bg-pink-100 text-pink-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Rota Costs
        </button>
      </div>

      {/* Pay Rates Tab */}
      {activeTab === 'pay' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
            <SectionHeader 
              title="Staff Pay Information"
              subtitle="Set hourly rates or annual salaries for each team member"
              size="small"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
          ) : !selectedTeamId ? (
            <div className="text-center py-12 px-4">
              <p className="body-text text-gray-500">Select a team to view staff pay information</p>
            </div>
          ) : staffPayroll.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="body-text text-gray-500">No staff members in this team</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {staffPayroll.map((staff) => (
                <div key={staff.id} className="px-4 sm:px-6 py-4">
                  {editingStaffId === staff.id ? (
                    <div className="space-y-4">
                      <div>
                        <p className="body-text font-semibold">{staff.name}</p>
                        <p className="caption">{staff.contracted_hours}h/week contracted</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block body-small font-medium text-gray-700 mb-1">Pay Type</label>
                          <select
                            value={editForm.pay_type}
                            onChange={(e) => setEditForm({ ...editForm, pay_type: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white text-base"
                          >
                            <option value="hourly">Hourly Rate</option>
                            <option value="salary">Annual Salary</option>
                          </select>
                        </div>

                        {editForm.pay_type === 'hourly' ? (
                          <div>
                            <label className="block body-small font-medium text-gray-700 mb-1">Hourly Rate (£)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.hourly_rate}
                              onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white text-base"
                              placeholder="12.50"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block body-small font-medium text-gray-700 mb-1">Annual Salary (£)</label>
                            <input
                              type="number"
                              step="100"
                              value={editForm.annual_salary}
                              onChange={(e) => setEditForm({ ...editForm, annual_salary: e.target.value })}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white text-base"
                              placeholder="28000"
                            />
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="primary"
                            onClick={() => savePayroll(staff.id)}
                            loading={saving === staff.id}
                            className="flex-1"
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={cancelEditing}
                            className="flex-1"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-600 font-medium caption">{staff.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="body-text font-semibold truncate">{staff.name}</p>
                          <p className="caption">{staff.contracted_hours}h/week</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {staff.pay_set ? (
                          <div className="text-right">
                            <p className="body-text font-semibold">
                              {staff.pay_type === 'hourly' 
                                ? `${formatCurrency(staff.hourly_rate)}/hr`
                                : `${formatCurrency(staff.annual_salary)}/yr`
                              }
                            </p>
                            <p className="caption capitalize hidden sm:block">{staff.pay_type}</p>
                          </div>
                        ) : (
                          <Badge variant="warning" size="sm">Not Set</Badge>
                        )}

                        <button
                          onClick={() => startEditing(staff)}
                          className="btn-icon p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Costs Tab */}
      {activeTab === 'costs' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Rota Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <SectionHeader title="Select Rota" size="small" />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <select
                value={selectedRotaId || ''}
                onChange={(e) => handleRotaSelect(e.target.value || null)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white text-base"
              >
                <option value="">Select an approved rota...</option>
                {rotas.map((rota) => (
                  <option key={rota.id} value={rota.id}>
                    {rota.rota_name || rota.name} - {formatDate(rota.start_date)}
                  </option>
                ))}
              </select>

              {selectedRotaId && (
                <Button
                  variant="secondary"
                  onClick={handleExportCSV}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          {loadingCosts ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
          ) : rotaCosts ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="heading-subsection">{rotaCosts.rota_name}</h3>
                    <p className="caption">
                      {formatDate(rotaCosts.start_date)} - {formatDate(rotaCosts.end_date)} • {rotaCosts.week_count} week{rotaCosts.week_count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(rotaCosts.total_cost)}</p>
                    <p className="caption">Total Cost</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {rotaCosts.staff_costs.map((staff, idx) => (
                  <div key={idx} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 font-medium caption">{staff.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="body-text font-medium truncate">{staff.name}</p>
                        <p className="caption truncate">
                          {staff.totalHours.toFixed(1)}h
                          <span className="hidden sm:inline">
                            {staff.payType === 'hourly' && staff.hourlyRate && ` @ ${formatCurrency(staff.hourlyRate)}/hr`}
                            {staff.payType === 'salary' && staff.annualSalary && ` (${formatCurrency(staff.annualSalary)}/yr)`}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {staff.cost > 0 ? (
                        <p className="body-text font-semibold">{formatCurrency(staff.cost)}</p>
                      ) : (
                        <Badge variant="warning" size="sm">Pay not set</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="body-text font-semibold text-gray-700">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-pink-600">{formatCurrency(rotaCosts.total_cost)}</p>
                </div>
              </div>
            </div>
          ) : selectedRotaId ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="body-text text-gray-500">Failed to load costs. Please try again.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="body-text font-medium text-gray-600">Select a rota to view costs</p>
              <p className="caption mt-1">Only approved rotas are shown</p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}