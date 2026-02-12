'use client'

export default function TeamSetupSuccess({ teamName, onGetStarted }) {
  return (
    <div className="text-center py-8">
      {/* Success Icon */}
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2 font-cal">
        Team Created! 🎉
      </h2>
      <p className="text-gray-600 mb-6">
        <span className="font-medium text-gray-900">{teamName}</span> is ready. Let's set it up!
      </p>

      {/* Setup Checklist Preview */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left max-w-sm mx-auto">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 font-cal">Next Steps</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">Team created</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-700 font-medium">Add your staff</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-600">Add shift patterns</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-600">Configure rules</span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onGetStarted}
        className="px-8 py-3 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-pink-500/25 transition-all"
        style={{ background: '#FF1F7D' }}
      >
        Get Started
      </button>
      
      <p className="text-xs text-gray-500 mt-4">
        We'll guide you through each step
      </p>
    </div>
  )
}