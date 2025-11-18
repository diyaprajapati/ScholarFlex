import React from 'react'

export default function QuestionView({ question, index, showAnswers = true }) {
  const isMultipleChoice = question.type === 'multiple-choice' || question.type === 'single-choice'
  const isTrueFalse = question.type === 'true-false'
  const isShortAnswer = false // short-answer removed

  return (
    <div className="mb-2.5 sm:mb-3 pb-2.5 sm:pb-3 border-b border-gray-100 last:border-b-0">
      {/* Question Number and Text */}
      <div className="mb-1.5 sm:mb-2">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#4C763B] text-white flex items-center justify-center font-semibold text-[10px] sm:text-xs">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 leading-snug whitespace-pre-wrap">
              {question.text}
            </p>
            <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs text-gray-500">
                {question.type === 'multiple-choice' ? 'MCQ' : 
                 question.type === 'single-choice' ? 'SCQ' :
                 question.type === 'true-false' ? 'T/F' : 'SA'}
              </span>
              <span className="text-[10px] sm:text-xs text-[#4C763B] font-medium">
                [{question.weightage} {question.weightage === 1 ? 'Mark' : 'Marks'}]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Options for Multiple Choice / Single Choice / True False */}
      {(isMultipleChoice || isTrueFalse) && question.options && question.options.length > 0 && (
        <div className="ml-6 sm:ml-8 space-y-1 sm:space-y-1.5">
          {question.options.map((option, optIndex) => {
            const isCorrect = question.correctOptions?.includes(optIndex) || false
            return (
              <div
                key={optIndex}
                className={`flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded border transition-all ${
                  isCorrect && showAnswers
                    ? 'bg-[#4C763B]/10 border-[#4C763B]'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                  isCorrect && showAnswers
                    ? 'bg-[#4C763B] text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {String.fromCharCode(65 + optIndex)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-xs lg:text-sm leading-snug ${
                    isCorrect && showAnswers ? 'text-[#4C763B] font-medium' : 'text-gray-700'
                  }`}>
                    {option}
                  </p>
                  {isCorrect && showAnswers && (
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-xs text-[#4C763B]">
                      <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Correct</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Correct Answer for Short Answer */}
      {isShortAnswer && showAnswers && question.correctAnswer && (
        <div className="ml-6 sm:ml-8 mt-1.5 sm:mt-2 p-2 sm:p-2.5 bg-[#4C763B]/10 border border-[#4C763B] rounded">
          <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
            <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#4C763B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] sm:text-xs font-semibold text-[#4C763B]">Correct Answer:</span>
          </div>
          <p className="text-[10px] sm:text-xs lg:text-sm text-gray-900 leading-snug whitespace-pre-wrap">{question.correctAnswer}</p>
        </div>
      )}
    </div>
  )
}

