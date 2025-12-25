import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../config/paths'

export default function QuestionPaperHeader() {
  const navigate = useNavigate()

  const handleAddClick = () => {
    navigate(ROUTES.QUESTION_PAPERS.ADD)
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Question Papers</h1>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600">Manage and organize all your question paper sets</p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base font-semibold text-white rounded-lg transition-colors shadow-sm hover:shadow-md w-full sm:w-auto cursor-pointer"
          style={{ backgroundColor: '#4C763B' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Question Paper</span>
        </button>
      </div>
    </div>
  )
}

