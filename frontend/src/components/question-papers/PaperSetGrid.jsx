import React from 'react'
import PaperSetCard from './PaperSetCard'

export default function PaperSetGrid({ paperSets = [], onEdit, onDelete, onView, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 animate-pulse">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2 mb-1.5 sm:mb-2"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!paperSets || paperSets.length === 0) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-8 sm:p-10 lg:p-12 text-center">
        <svg
          className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-3 sm:mt-4 text-base sm:text-lg lg:text-xl font-semibold text-gray-900">No paper sets found</h3>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600">Get started by creating your first question paper set.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {paperSets.map((paperSet) => (
        <PaperSetCard
          key={paperSet.id}
          paperSet={paperSet}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  )
}

