import Button from '@/app/components/Button'

export default function SaveApproveModal({
  isOpen,
  onClose,
  mode, // 'save' or 'approve'
  rotaName,
  setRotaName,
  onSubmit,
  viewingRotaId
}) {
  if (!isOpen) return null

  const isSaveMode = mode === 'save'
  const title = viewingRotaId 
    ? (isSaveMode ? 'Update Rota Draft' : 'Update & Approve Rota')
    : (isSaveMode ? 'Save Rota as Draft' : 'Save & Approve Rota')
  
  const description = viewingRotaId
    ? (isSaveMode ? 'Update this rota with your changes.' : 'Approve this rota to finalize it.')
    : (isSaveMode ? 'Save this rota to revisit later.' : 'Approve this rota to finalize it.')
  
  const buttonText = viewingRotaId
    ? (isSaveMode ? 'Update Draft' : 'Update & Approve')
    : (isSaveMode ? 'Save Draft' : 'Approve')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 no-print">
      <div className="bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl">
        <h3 className="heading-subsection mb-4">
          {title}
        </h3>
        <p className="body-small mb-4">
          {description}
        </p>
        <input
          type="text"
          value={rotaName}
          onChange={(e) => setRotaName(e.target.value)}
          placeholder="Enter rota name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white mb-4 text-base"
        />
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant={isSaveMode ? 'secondary' : 'primary'}
            onClick={onSubmit}
            className="flex-1"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  )
}