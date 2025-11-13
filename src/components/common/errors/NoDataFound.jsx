import React from 'react'
import ErrorPage from './ErrorPage'

const NoDataFound = ({ 
  title = "No Data Found",
  message = "We couldn't find what you're looking for. It may have been deleted or doesn't exist.",
  onButtonClick, 
  showButton = true,
  buttonText = "Go Back"
}) => {
  const svgIcon = (
    <svg 
      className="w-full h-full" 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="#B0CE88" fillOpacity="0.2" />
      
      {/* Empty Box */}
      <g className="animate-bounce" style={{ animationDuration: '2s' }}>
        <rect x="60" y="60" width="80" height="80" rx="4" fill="none" stroke="#4C763B" strokeWidth="4" strokeDasharray="8 4" />
        <line x1="70" y1="80" x2="130" y2="80" stroke="#B0CE88" strokeWidth="2" strokeDasharray="4 2" />
        <line x1="70" y1="100" x2="130" y2="100" stroke="#B0CE88" strokeWidth="2" strokeDasharray="4 2" />
        <line x1="70" y1="120" x2="130" y2="120" stroke="#B0CE88" strokeWidth="2" strokeDasharray="4 2" />
      </g>
      
      {/* Magnifying Glass */}
      <g className="animate-pulse" style={{ animationDelay: '0.5s' }}>
        <circle cx="140" cy="50" r="20" fill="none" stroke="#4C763B" strokeWidth="3" />
        <line x1="155" y1="65" x2="170" y2="80" stroke="#4C763B" strokeWidth="3" strokeLinecap="round" />
      </g>
      
      {/* Question Mark */}
      <g className="animate-bounce" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}>
        <circle cx="100" cy="170" r="15" fill="#B0CE88" />
        <text x="100" y="177" textAnchor="middle" fill="#4C763B" fontSize="20" fontWeight="bold">?</text>
      </g>
    </svg>
  )

  return (
    <ErrorPage
      title={title}
      message={message}
      svgIcon={svgIcon}
      buttonText={buttonText}
      onButtonClick={onButtonClick}
      showButton={showButton}
    />
  )
}

export default NoDataFound

