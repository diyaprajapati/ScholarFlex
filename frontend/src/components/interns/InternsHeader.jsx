import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../config/paths'

export default function InternsHeader({ onSearch, searchValue, onFilterClick, filters, hasActiveFilters, totalCount }) {
  const navigate = useNavigate()

  const handleAddClick = () => {
    navigate(ROUTES.INTERNS.ADD)
  }

  // Check if any filter is active
  const activeFiltersCount = Object.values(filters).reduce((count, value) => {
    return count + (Array.isArray(value) ? value.length : 0)
  }, 0)

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">All Interns</h1>
            {totalCount !== undefined && totalCount !== null && (
              <span className="px-3 py-1 text-xs sm:text-sm font-semibold text-[#4C763B] bg-[#4C763B]/10 rounded-full border border-[#4C763B]/20">
                Total: {totalCount}
              </span>
            )}
          </div>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600">
            View and manage all registered interns
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base font-semibold text-white rounded-lg transition-colors shadow-sm hover:shadow-md w-full sm:w-auto"
          style={{ backgroundColor: '#4C763B' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Intern</span>
        </button>
      </div>

      {/* Search and Filter Button */}
      <div className="flex gap-2 sm:gap-3">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              className="block w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-[#4C763B] transition-colors"
            />
          </div>
        </div>

        {/* Filter Button */}
        {/* <button
          onClick={onFilterClick}
          className={`relative inline-flex items-center justify-center gap-2 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base font-semibold rounded-lg transition-colors border ${
            activeFiltersCount > 0
              ? 'text-[#4C763B] border-[#4C763B] bg-[#4C763B]/10 hover:bg-[#4C763B]/20'
              : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'
          }`}
        > */}
          {/* <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg> */}
          {/* <span className="hidden sm:inline">Filter</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-[#4C763B] text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )} */}
        {/* </button> */}
      </div>
    </div>
  )
}

