import React, { useState, useRef, useEffect } from 'react'

export default function MultiSelectDropdown({ 
  label, 
  options, 
  selectedValues = [], 
  onChange, 
  placeholder = 'Select options...' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = (value) => {
    const isSelected = selectedValues.includes(value)
    if (isSelected) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([])
    } else {
      onChange(options.map((opt) => opt.value))
    }
  }

  const displayText = selectedValues.length === 0 
    ? placeholder 
    : selectedValues.length === 1
    ? selectedValues[0]
    : `${selectedValues.length} selected`

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2.5 sm:mb-3">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg transition-colors text-left flex items-center justify-between ${
          selectedValues.length > 0
            ? 'border-[#4C763B] bg-[#4C763B]/10'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <span className={`truncate ${selectedValues.length > 0 ? 'text-[#4C763B] font-medium' : 'text-gray-500'}`}>
          {displayText}
        </span>
        <svg
          className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${isOpen ? 'transform rotate-180' : ''} ${
            selectedValues.length > 0 ? 'text-[#4C763B]' : 'text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 sm:mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 max-h-60 sm:max-h-72 overflow-y-auto">
          <div className="p-2">
            {/* Select All Option */}
            <button
              type="button"
              onClick={handleSelectAll}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm font-semibold text-[#4C763B] hover:bg-[#4C763B]/10 rounded-lg transition-colors"
            >
              {selectedValues.length === options.length ? 'Deselect All' : 'Select All'}
            </button>
            
            <div className="border-t border-gray-200 my-2"></div>

            {/* Options */}
            <div className="space-y-1">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(option.value)}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-[#4C763B] border-gray-300 rounded focus:ring-[#4C763B] cursor-pointer"
                      style={{ accentColor: '#4C763B' }}
                    />
                    <span className={`text-xs sm:text-sm lg:text-base flex-1 ${
                      isSelected ? 'text-[#4C763B] font-medium' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

