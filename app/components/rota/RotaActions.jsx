import Button from '@/app/components/Button'

export default function RotaActions({
  loading,
  selectedTeamId,
  showAllTeams,
  onGenerate,
  showSavedRotas,
  setShowSavedRotas,
  rota,
  onSave,
  onApprove,
  onPrint
}) {
  return (
    <div id="tour-rota-actions" className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 no-print">
      <Button
        variant="primary"
        onClick={onGenerate}
        disabled={loading || (!selectedTeamId && !showAllTeams)}
        loading={loading}
        className="flex-1 min-w-[140px] sm:min-w-[200px]"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      >
        Generate
      </Button>

      <Button
        variant="secondary"
        onClick={() => setShowSavedRotas(!showSavedRotas)}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        }
      >
        <span className="hidden sm:inline">Saved Rotas</span>
        <span className="sm:hidden">Saved</span>
      </Button>

      {rota && rota.schedule && (
        <>
          <Button
            variant="secondary"
            onClick={onSave}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            }
          >
            <span className="hidden sm:inline">Save</span>
          </Button>

          <button
            onClick={onApprove}
            className="px-3 sm:px-6 py-2.5 sm:py-3 border-2 border-pink-500 text-pink-600 rounded-lg font-semibold hover:bg-pink-50 transition-all flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Approve</span>
          </button>
          
          <button
            onClick={onPrint}
            className="hidden sm:flex px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </>
      )}
    </div>
  )
}