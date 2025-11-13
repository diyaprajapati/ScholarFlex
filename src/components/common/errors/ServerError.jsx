import React from 'react'
import ErrorPage from './ErrorPage'

const ServerError = ({ onButtonClick, showButton = true }) => {
  const svgIcon = (
    <svg 
      className="w-full h-full" 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="#B0CE88" fillOpacity="0.2" />
      
      {/* Server Rack */}
      <g className="animate-bounce" style={{ animationDuration: '2s' }}>
        <rect x="60" y="40" width="80" height="120" rx="4" fill="#4C763B" fillOpacity="0.3" stroke="#4C763B" strokeWidth="3" />
        
        {/* Server Slots */}
        <rect x="70" y="55" width="60" height="15" rx="2" fill="#B0CE88" />
        <rect x="70" y="80" width="60" height="15" rx="2" fill="#B0CE88" />
        <rect x="70" y="105" width="60" height="15" rx="2" fill="#B0CE88" />
        <rect x="70" y="130" width="60" height="15" rx="2" fill="#B0CE88" />
        
        {/* Status Lights */}
        <circle cx="75" cy="62" r="3" fill="#dc2626" className="animate-pulse" />
        <circle cx="75" cy="87" r="3" fill="#dc2626" className="animate-pulse" />
        <circle cx="75" cy="112" r="3" fill="#dc2626" className="animate-pulse" />
        <circle cx="75" cy="137" r="3" fill="#dc2626" className="animate-pulse" />
      </g>
      
      {/* Error Symbol */}
      <g className="animate-pulse">
        <circle cx="100" cy="180" r="12" fill="#dc2626" />
        <text x="100" y="186" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
      </g>
    </svg>
  )

  return (
    <ErrorPage
      title="Server Error"
      message="Something went wrong on our end. Our team has been notified and is working to fix the issue."
      svgIcon={svgIcon}
      buttonText="Go Back"
      onButtonClick={onButtonClick}
      showButton={showButton}
    />
  )
}

export default ServerError

