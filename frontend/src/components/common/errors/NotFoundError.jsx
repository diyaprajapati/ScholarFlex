import React from 'react'
import ErrorPage from './ErrorPage'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../config/paths'

const NotFoundError = ({ onButtonClick, showButton = true }) => {
  const navigate = useNavigate()

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick()
    } else {
      navigate(ROUTES.DASHBOARD)
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
      
      {/* 404 Text */}
      <g className="animate-bounce" style={{ animationDuration: '3s' }}>
        <text 
          x="100" 
          y="90" 
          textAnchor="middle" 
          fill="#4C763B" 
          fontSize="48" 
          fontWeight="bold"
          className="animate-pulse"
        >
          404
        </text>
      </g>
      
      {/* Search Icon */}
      <g className="animate-spin" style={{ animationDuration: '4s', transformOrigin: '100px 140px' }}>
        <circle cx="100" cy="140" r="25" stroke="#4C763B" strokeWidth="3" fill="none" />
        <line x1="115" y1="155" x2="130" y2="170" stroke="#4C763B" strokeWidth="3" strokeLinecap="round" />
      </g>
      
      {/* Question Marks */}
      <g className="animate-pulse" style={{ animationDelay: '0.5s' }}>
        <text x="50" y="70" textAnchor="middle" fill="#B0CE88" fontSize="32" fontWeight="bold">?</text>
        <text x="150" y="70" textAnchor="middle" fill="#B0CE88" fontSize="32" fontWeight="bold">?</text>
      </g>
    </svg>
  )

  return (
    <ErrorPage
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved. Let's get you back on track."
      svgIcon={svgIcon}
      buttonText="Go to Dashboard"
      onButtonClick={handleButtonClick}
      showButton={showButton}
    />
  )
}

export default NotFoundError

