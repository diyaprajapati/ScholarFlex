import React from 'react'

export default function QuestionInput({ question, index, onChange, onRemove, onAddOption }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5 space-y-2.5 sm:space-y-3">
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Question {index + 1}</h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 transition-colors"
            aria-label="Remove question"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Section Field */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
          Section <span className="text-red-500">*</span>
        </label>
        <select
          value={question.section || 'Technical'}
          onChange={(e) => onChange({ ...question, section: e.target.value })}
          className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors bg-white"
        >
          <option value="Technical">Technical Section</option>
          <option value="Coding">Coding Section</option>
          <option value="Theory">Theory Section</option>
          <option value="Maths & Logical Reasoning">Maths & Logical Reasoning Section</option>
        </select>
      </div>

      {/* Question Text and Type Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="lg:col-span-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
            Question Text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={question.text || ''}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder="Enter your question here..."
            rows={2}
            className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors resize-none"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={question.type || 'multiple-choice'}
              onChange={(e) => onChange({ ...question, type: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors text-xs sm:text-sm"
              required
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="single-choice">Single Choice</option>
              <option value="true-false">True/False</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={question.weightage || ''}
              onChange={(e) => onChange({ ...question, weightage: parseInt(e.target.value) || 0 })}
              placeholder="Marks"
              min="1"
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
              required
            />
          </div>
        </div>
      </div>

      {/* Options Section */}
      {(question.type === 'multiple-choice' || question.type === 'single-choice' || question.type === 'true-false') && (
        <div className="space-y-2 sm:space-y-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700">
            Options <span className="text-red-500">*</span>
          </label>

          {/* Ensure at least one option is always shown */}
          <div className="space-y-1.5 sm:space-y-2">
            {question.options && question.options.length > 0 ? (
              question.options.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={option || ''}
                    onChange={(e) => {
                      const newOptions = [...question.options]
                      newOptions[optIndex] = e.target.value
                      onChange({ ...question, options: newOptions })
                    }}
                    placeholder={`Option ${optIndex + 1} - Write option value here`}
                    readOnly={question.type === 'true-false'}
                    className={`flex-1 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors ${
                      question.type === 'true-false' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0">
                    <input
                      type={question.type === 'single-choice' ? 'radio' : 'checkbox'}
                      name={`question-${index}`}
                      checked={question.correctOptions?.includes(optIndex) || false}
                      onChange={(e) => {
                        const currentCorrect = question.correctOptions || []
                        let newCorrect
                        if (question.type === 'single-choice') {
                          newCorrect = e.target.checked ? [optIndex] : []
                        } else {
                          newCorrect = e.target.checked
                            ? [...currentCorrect, optIndex]
                            : currentCorrect.filter(i => i !== optIndex)
                        }
                        onChange({ ...question, correctOptions: newCorrect })
                      }}
                      className="h-4 w-4 sm:h-5 sm:w-5 text-[#4C763B] focus:ring-[#4C763B] border-gray-300"
                    />
                    <span className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Correct</span>
                  </label>
                  {question.type !== 'true-false' && question.options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = question.options.filter((_, i) => i !== optIndex)
                        const newCorrect = question.correctOptions?.filter(i => i !== optIndex).map(i => i > optIndex ? i - 1 : i) || []
                        onChange({ ...question, options: newOptions, correctOptions: newCorrect })
                      }}
                      className="text-red-600 hover:text-red-700 transition-colors flex-shrink-0"
                      aria-label="Remove option"
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            ) : (
              // Always show at least one option field
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  value=""
                  onChange={(e) => {
                    onChange({ 
                      ...question, 
                      options: [e.target.value],
                      correctOptions: []
                    })
                  }}
                  placeholder="Option 1 - Write option value here"
                  readOnly={question.type === 'true-false'}
                  className={`flex-1 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors ${
                    question.type === 'true-false' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0">
                  <input
                    type={question.type === 'single-choice' ? 'radio' : 'checkbox'}
                    name={`question-${index}`}
                    className="h-4 w-4 sm:h-5 sm:w-5 text-[#4C763B] focus:ring-[#4C763B] border-gray-300"
                    disabled
                  />
                  <span className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Correct</span>
                </label>
              </div>
            )}
          </div>

          {/* Add More Options Button - Below options with dotted border */}
          {onAddOption && question.type !== 'true-false' && (
            <button
              type="button"
              onClick={onAddOption}
              className="w-full py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 border-2 border-dashed border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] hover:border-[#4C763B] transition-colors flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-50 hover:bg-gray-100"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add More Options
            </button>
          )}
        </div>
      )}

    </div>
  )
}

