import React from 'react'

export default function ChoiceScreen({ 
  title = "How would you like to add?",
  description = "Choose your preferred method",
  jsonLabel = "Upload JSON",
  jsonDescription = "Import entries from a JSON file with drag & drop",
  formLinkLabel = "Copy Form Link",
  formLinkDescription = "Generate a shareable link for users to fill their data",
  onSelectJSON,
  onSelectFormLink
}) {
  return (
    <div className="flex items-center justify-center py-4 sm:py-5 lg:py-6">
      <div className="w-full max-w-2xl space-y-3 sm:space-y-4 lg:space-y-5">
        <div className="text-center">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">{title}</h2>
          <p className="text-xs sm:text-sm text-gray-600">{description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
          {/* JSON Upload Option */}
          <button
            onClick={onSelectJSON}
            className="group relative bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-5 lg:p-6 hover:border-[#4C763B] transition-all duration-200 text-left"
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-2.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-[#4C763B]/10 flex items-center justify-center group-hover:bg-[#4C763B]/20 transition-colors">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1">{jsonLabel}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{jsonDescription}</p>
              </div>
            </div>
          </button>

          {/* Copy Form Link Option */}
          <button
            onClick={onSelectFormLink}
            className="group relative bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-5 lg:p-6 hover:border-[#4C763B] transition-all duration-200 text-left"
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-2.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-[#4C763B]/10 flex items-center justify-center group-hover:bg-[#4C763B]/20 transition-colors">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.885 12.938 9 12.482 9 12c0-.482-.115-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1">{formLinkLabel}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{formLinkDescription}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

