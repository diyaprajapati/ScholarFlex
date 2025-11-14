import React from 'react'
import ErrorPage from './ErrorPage'

const NetworkError = ({ onButtonClick, showButton = true }) => {
  const svgIcon = (
    <svg 
      className="w-full h-full animate-pulse" 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="#B0CE88" fillOpacity="0.2" />
      
      {/* Signal Waves */}
      <g className="animate-ping" style={{ animationDelay: '0s' }}>
        <circle cx="100" cy="100" r="40" stroke="#4C763B" strokeWidth="3" fill="none" opacity="0.6" />
      </g>
      <g className="animate-ping" style={{ animationDelay: '0.2s' }}>
        <circle cx="100" cy="100" r="60" stroke="#4C763B" strokeWidth="3" fill="none" opacity="0.4" />
      </g>
      <g className="animate-ping" style={{ animationDelay: '0.4s' }}>
        <circle cx="100" cy="100" r="80" stroke="#4C763B" strokeWidth="3" fill="none" opacity="0.2" />
      </g>
      
      {/* WiFi Icon */}
      <path
        d="M100 60 L60 100 L100 140 L140 100 Z"
        stroke="#4C763B"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M100 80 L80 100 L100 120 L120 100 Z"
        stroke="#043915"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="100" cy="100" r="8" fill="#4C763B" />
      
      {/* Error X */}
      <g className="animate-bounce" style={{ animationDelay: '0.5s' }}>
        <line x1="70" y1="70" x2="130" y2="130" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
        <line x1="130" y1="70" x2="70" y2="130" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  )

  return (
    <ErrorPage
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      svgIcon={svgIcon}
      buttonText="Retry"
      onButtonClick={onButtonClick}
      showButton={showButton}
    />
  )
}

export default NetworkError

