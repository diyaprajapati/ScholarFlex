import React from 'react'
import ErrorPage from './ErrorPage'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../config/paths'

const NoUserFound = ({ onButtonClick, showButton = true }) => {
  const navigate = useNavigate()

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick()
    } else {
      navigate(ROUTES.LOGIN)
    }
  }

  const svgIcon = (
    <svg 
      className="w-full h-full" 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="#B0CE88" fillOpacity="0.2" />
      
      {/* User Icon */}
      <g className="animate-bounce" style={{ animationDuration: '2s' }}>
        {/* Head */}
        <circle cx="100" cy="70" r="25" fill="#4C763B" fillOpacity="0.3" stroke="#4C763B" strokeWidth="3" />
        
        {/* Body */}
        <path
          d="M 50 120 Q 50 100 100 100 Q 150 100 150 120 L 150 160 L 50 160 Z"
          fill="#4C763B"
          fillOpacity="0.3"
          stroke="#4C763B"
          strokeWidth="3"
        />
      </g>
      
      {/* Question Mark */}
      <g className="animate-pulse" style={{ animationDelay: '0.5s' }}>
        <circle cx="100" cy="180" r="18" fill="#B0CE88" />
        <text x="100" y="188" textAnchor="middle" fill="#4C763B" fontSize="24" fontWeight="bold">?</text>
      </g>
      
      {/* Search Lines */}
      <g className="animate-spin" style={{ animationDuration: '3s', transformOrigin: '100px 100px' }}>
        <line x1="100" y1="100" x2="60" y2="60" stroke="#B0CE88" strokeWidth="2" strokeDasharray="4 2" />
        <line x1="100" y1="100" x2="140" y2="60" stroke="#B0CE88" strokeWidth="2" strokeDasharray="4 2" />
        <line x1="100" y1="100" x2="60" y2="140" stroke="#B0CE88" strokeWidth="2" strokeDasharray="4 2" />
        <line x1="100" y1="100" x2="140" y2="140" stroke="#B0CE88" strokeWidth="2" strokeDasharray="4 2" />
      </g>
    </svg>
  )

  return (
    <ErrorPage
      title="User Not Found"
      message="The user account you're looking for doesn't exist or has been removed. Please check your credentials and try again."
      svgIcon={svgIcon}
      buttonText="Go to Login"
      onButtonClick={handleButtonClick}
      showButton={showButton}
    />
  )
}

export default NoUserFound

