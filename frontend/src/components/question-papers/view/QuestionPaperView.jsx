import React from 'react'
import QuestionView from './QuestionView'

export default function QuestionPaperView({ paperSet, showAnswers = true }) {
  const totalMarks = paperSet.questions?.reduce((sum, q) => sum + (q.weightage || 0), 0) || paperSet.totalMarks || 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
      {/* Header Section */}
      <div className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">{paperSet.name}</h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 mt-0.5">
              <span className="truncate">{paperSet.subject}</span>
              <span>•</span>
              <span>{paperSet.year}</span>
              <span>•</span>
              <span>{paperSet.semester}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs flex-shrink-0">
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded whitespace-nowrap">{paperSet.questions?.length || paperSet.totalQuestions || 0} Questions</span>
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded whitespace-nowrap">{totalMarks} Marks</span>
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded whitespace-nowrap">{paperSet.duration}m</span>
          </div>
        </div>

        {showAnswers && (
          <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[#4C763B]/10 border border-[#4C763B] rounded text-[10px] sm:text-xs text-[#4C763B] font-medium">
            ✓ Answer Key - Correct answers highlighted
          </div>
        )}
      </div>

      {/* Questions Section - Two Column Layout */}
      <div>
        {paperSet.questions && paperSet.questions.length > 0 ? (
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
            {/* Vertical Divider - Only visible on large screens */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 -translate-x-1/2"></div>
            
            {/* Left Column */}
            <div className="lg:pr-4 xl:pr-6">
              {paperSet.questions
                .filter((_, index) => index % 2 === 0)
                .map((question, filteredIndex) => {
                  const originalIndex = filteredIndex * 2
                  return (
                    <QuestionView
                      key={originalIndex}
                      question={question}
                      index={originalIndex}
                      showAnswers={showAnswers}
                    />
                  )
                })}
            </div>
            
            {/* Right Column */}
            <div className="lg:pl-4 xl:pl-6">
              {paperSet.questions
                .filter((_, index) => index % 2 === 1)
                .map((question, filteredIndex) => {
                  const originalIndex = filteredIndex * 2 + 1
                  return (
                    <QuestionView
                      key={originalIndex}
                      question={question}
                      index={originalIndex}
                      showAnswers={showAnswers}
                    />
                  )
                })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <p className="text-xs sm:text-sm text-gray-500">No questions available for this paper set.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200 text-center">
        <p className="text-[10px] sm:text-xs text-gray-500">
          End of Question Paper • Total Marks: {totalMarks}
        </p>
      </div>
    </div>
  )
}

