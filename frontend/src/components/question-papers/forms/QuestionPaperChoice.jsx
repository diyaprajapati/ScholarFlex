import React from 'react'

export default function QuestionPaperChoice({ onSelectManual, onSelectJSON }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-8 sm:py-10 lg:py-12">
      <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2">How would you like to add questions?</h2>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">Choose your preferred method to create question papers</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {/* Manual Entry Option */}
          <button
            onClick={onSelectManual}
            className="group relative bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl p-6 sm:p-7 lg:p-8 hover:border-[#4C763B] transition-all duration-200 text-left"
          >
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-[#4C763B]/10 flex items-center justify-center group-hover:bg-[#4C763B]/20 transition-colors">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Add Manually</h3>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">Create questions one by one using our form interface</p>
              </div>
            </div>
          </button>

          {/* JSON Upload Option */}
          <button
            onClick={onSelectJSON}
            className="group relative bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl p-6 sm:p-7 lg:p-8 hover:border-[#4C763B] transition-all duration-200 text-left"
          >
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-[#4C763B]/10 flex items-center justify-center group-hover:bg-[#4C763B]/20 transition-colors">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Upload JSON</h3>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">Import questions from a JSON file with drag & drop</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

