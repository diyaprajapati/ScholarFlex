import React, { useEffect, useState } from 'react'
import MultiSelectDropdown from './MultiSelectDropdown'

export default function FilterPanel({ isOpen, onClose, filters, onFilterChange, onApplyFilters }) {
  const [localFilters, setLocalFilters] = useState(filters)

  // Update local filters when filters prop changes or panel opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [filters, isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Filter Panel */}
      <div 
        className="fixed top-14 sm:top-16 right-0 bottom-0 w-full sm:w-80 lg:w-96 bg-white shadow-xl z-40 overflow-y-auto border-l border-gray-200"
        style={{ animation: 'slideInRight 0.3s ease-in-out' }}
      >
        <div className="p-4 sm:p-5 lg:p-6 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 sm:mb-6 lg:mb-8 pb-4 sm:pb-5 border-b-2 border-gray-100">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Filters</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close filters"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Options */}
          <div className="space-y-5 sm:space-y-6 lg:space-y-7">
            {/* Status Filter */}
            <MultiSelectDropdown
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Pending', label: 'Pending' },
              ]}
              selectedValues={localFilters.status || []}
              onChange={(values) => {
                setLocalFilters((prev) => ({
                  ...prev,
                  status: values,
                }))
              }}
              placeholder="Select Status"
            />

            {/* Domain Filter */}
            <MultiSelectDropdown
              label="Domain"
              options={[
                { value: 'Web Development', label: 'Web Development' },
                { value: 'Mobile Development', label: 'Mobile Development' },
                { value: 'UI/UX Design', label: 'UI/UX Design' },
                { value: 'Data Science', label: 'Data Science' },
                { value: 'Cloud Computing', label: 'Cloud Computing' },
              ]}
              selectedValues={localFilters.domain || []}
              onChange={(values) => {
                setLocalFilters((prev) => ({
                  ...prev,
                  domain: values,
                }))
              }}
              placeholder="Select Domain"
            />

            {/* Aptitude Status Filter */}
            <MultiSelectDropdown
              label="Aptitude Status"
              options={[
                { value: 'Completed', label: 'Completed' },
                { value: 'Pending', label: 'Pending' },
              ]}
              selectedValues={localFilters.aptitudeStatus || []}
              onChange={(values) => {
                setLocalFilters((prev) => ({
                  ...prev,
                  aptitudeStatus: values,
                }))
              }}
              placeholder="Select Aptitude Status"
            />

            {/* Selection Status Filter */}
            <MultiSelectDropdown
              label="Selection Status"
              options={[
                { value: 'Selected', label: 'Selected' },
                { value: 'Not Selected', label: 'Not Selected' },
              ]}
              selectedValues={localFilters.selectionStatus || []}
              onChange={(values) => {
                setLocalFilters((prev) => ({
                  ...prev,
                  selectionStatus: values,
                }))
              }}
              placeholder="Select Selection Status"
            />
          </div>

          {/* Footer Actions */}
          <div className="mt-8 sm:mt-10 lg:mt-12 pt-5 sm:pt-6 border-t-2 border-gray-100 space-y-3 sm:space-y-3.5">
            <button
              onClick={() => {
                // Clear all filters by setting them to empty arrays
                setLocalFilters({
                  status: [],
                  domain: [],
                  aptitudeStatus: [],
                  selectionStatus: [],
                })
              }}
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors"
            >
              Clear All Filters
            </button>
            <button
              onClick={() => {
                // Apply filters by calling the parent's apply function
                if (onApplyFilters) {
                  onApplyFilters(localFilters)
                }
                onClose()
              }}
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
              style={{ backgroundColor: '#4C763B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}

