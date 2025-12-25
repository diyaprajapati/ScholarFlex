import React from 'react'

export default function PaperSetCard({ paperSet, onEdit, onDelete, onView }) {
  const statusColors = {
    published: 'text-[#4C763B]',
    draft: 'bg-amber-100 text-amber-700',
  }

  const statusIcons = {
    published: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    draft: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  }

  return (
    <div className="group relative bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 hover:border-[#4C763B]/40 hover:shadow-lg transition-all duration-200">
      {/* Status Badge */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <span
          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${statusColors[paperSet.status] || statusColors.draft}`}
          style={paperSet.status === 'published' ? { backgroundColor: 'rgba(76, 118, 59, 0.2)' } : {}}
        >
          {statusIcons[paperSet.status]}
          {paperSet.status}
        </span>
      </div>

      {/* Card Content */}
      <div className="pr-16 sm:pr-20">
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2 group-hover:text-[#4C763B] transition-colors line-clamp-2">
          {paperSet.name}
        </h3>
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#4C763B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="font-medium truncate">{paperSet.subject}</span>
          </div>
          {paperSet.domains && paperSet.domains.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {paperSet.domains.map((domain) => (
                <span
                  key={domain.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#4C763B]/10 text-[10px] sm:text-xs text-[#4C763B] font-medium"
                >
                  {domain.domain_name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs">
            <span className="flex items-center gap-1 sm:gap-1.5">
              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {paperSet.year} • {paperSet.semester}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Questions</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-900">{paperSet.totalQuestions}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Duration</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-900">{paperSet.duration}m</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Marks</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-900">{paperSet.maxMarks}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-100">
        <button
          onClick={() => onView?.(paperSet)}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm font-medium text-[#4C763B] rounded-lg transition-colors cursor-pointer"
          style={{ backgroundColor: 'rgba(76, 118, 59, 0.1)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 118, 59, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 118, 59, 0.1)'}
        >
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="hidden sm:inline">View</span>
        </button>
        <button
          onClick={() => onEdit?.(paperSet)}
          className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Edit paper set"
        >
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete?.(paperSet)}
          className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
          aria-label="Delete paper set"
        >
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

