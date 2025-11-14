import React from 'react'
import { useNavigate } from 'react-router-dom'

const ErrorPage = ({ 
  title, 
  message, 
  svgIcon, 
  buttonText = 'Go Back', 
  onButtonClick,
  showButton = true 
}) => {
  const navigate = useNavigate()

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick()
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="h-full flex items-center justify-center px-3 sm:px-4 lg:px-6 py-8 sm:py-10 lg:py-12">
      <div className="max-w-md w-full text-center">
        {/* Animated SVG Icon */}
        <div className="mb-6 sm:mb-7 lg:mb-8 flex justify-center">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64">
            {svgIcon}
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
          {title}
        </h1>

        {/* Error Message */}
        <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 sm:mb-7 lg:mb-8 px-2">
          {message}
        </p>

        {/* Action Button */}
        {showButton && (
          <button
            onClick={handleButtonClick}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base font-semibold text-white rounded-lg transition-all duration-200 transform hover:scale-105"
            style={{ backgroundColor: '#4C763B' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#043915'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4C763B'
            }}
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorPage

