import Badge from '@/app/components/Badge'
import Button from '@/app/components/Button'
import SectionHeader from '@/app/components/SectionHeader'

export default function SavedRotasList({ savedRotas, onLoad, onDelete }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 no-print">
      <SectionHeader title="Saved Rotas" />
      
      {savedRotas.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="body-text font-medium">No saved rotas yet</p>
          <p className="body-small mt-1">Generate and save your first rota</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {savedRotas.map((savedRota) => (
            <div
              key={savedRota.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="body-text font-medium truncate">
                    {savedRota.rota_name || savedRota.name || 'Untitled Rota'}
                  </p>
                  {savedRota.approved && (
                    <Badge variant="success" size="sm">
                      <svg className="w-3 h-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approved
                    </Badge>
                  )}
                </div>
                <p className="caption mt-1">
                  {savedRota.start_date && savedRota.end_date ? (
                    <>
                      {formatDate(savedRota.start_date)} - {formatDate(savedRota.end_date)}
                    </>
                  ) : (
                    'No date information'
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onLoad(savedRota.id)}
                >
                  Load
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(savedRota.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}