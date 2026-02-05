import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import OTPInput from './OTPInput'
import api from '../../services/api'
import { logEvent } from 'firebase/analytics'
import { analytics } from '../../firebase'

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
})

export default function LoginForm() {
  const navigate = useNavigate()
  const [showOTP, setShowOTP] = useState(false)
  const [email, setEmail] = useState('')
  const [otpError, setOtpError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpValue, setOtpValue] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(emailSchema),
  })

  const onEmailSubmit = async (data) => {
    setIsSubmitting(true)
    setEmailError('')
    
    try {
      const response = await api.auth.sendOTP(data.email)
      
      if (response.success) {
        setEmail(data.email)
        setShowOTP(true)
        // In development, if OTP is returned, log it for testing
        if (response.otp) {
          // console.log('OTP (development only):', response.otp)
        }
      }
    } catch (error) {
      setEmailError(error.message || 'Failed to send OTP. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onOTPComplete = async (otp) => {
    setOtpValue(otp)
    if (otp.length === 6) {
      setIsVerifying(true)
      setOtpError('')
      
      try {
        const response = await api.auth.verifyOTP(email, otp)
        
        // Debug: Log response to help diagnose issues
        // console.log('Login response:', { 
        //   success: response.success, 
        //   hasToken: !!response.token, 
        //   hasUser: !!response.user,
        //   userRole: response.user?.role 
        // })
        
        // Check if response has token
        if (!response.success) {
          throw new Error(response.message || 'Login failed')
        }
        
        if (!response.token) {
          console.error('No token received from server:', response)
          throw new Error('No authentication token received. Please try again.')
        }
        
        // Store JWT token and user data in localStorage
        try {
          authService.setToken(response.token, response.user)
          
          // Verify token was stored
          const storedToken = authService.getToken()
          if (!storedToken || storedToken !== response.token) {
            console.error('Failed to store token in localStorage')
            throw new Error('Failed to store authentication token. Please check your browser settings.')
          }
        } catch (storageError) {
          console.error('Error storing token:', storageError)
          throw new Error('Failed to store authentication token. Please check your browser settings.')
        }
        
        // Clear browser history stack to prevent back navigation
        authService.clearHistoryStack()
        
        // Get user from stored data
        const user = response.user || authService.getUser()
        const role = user?.role

        // Track login event in Firebase Analytics
        if (analytics && user) {
          try {
            logEvent(analytics, 'login', {
              user_id: `user_${user.id}`,
              user_role: role || 'UNKNOWN',
              login_method: 'otp',
              timestamp: new Date().toISOString()
            })
            if (import.meta.env.DEV) {
              console.log('Login event logged in Analytics')
            }
          } catch (error) {
            console.error('Error logging login event:', error)
          }
        }
        
        if (!role) {
          console.error('No role found in user data:', user)
          throw new Error('Invalid user data received. Please try again.')
        }
        
        // Navigate based on role
        if (role === 'STUDENT') {
          // Check if student is selected
          if (user?.is_selected) {
            // Selected students - check profile completion from database
            try {
              const response = await api.studentProfile.checkCompletion()
              if (response.success) {
                if (response.isCompleted) {
                  // Profile completed, redirect to dashboard
                  navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
                } else {
                  // Profile not completed, redirect to form page
                  navigate(ROUTES.STUDENT.FORM, { replace: true })
                }
              } else {
                // Error checking, redirect to form to be safe
                navigate(ROUTES.STUDENT.FORM, { replace: true })
              }
            } catch (error) {
              console.error('Error checking profile completion:', error)
              // Error checking, redirect to form to be safe
              navigate(ROUTES.STUDENT.FORM, { replace: true })
            }
          } else {
            // Non-selected students go to test instructions page
            navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })
          }
        } else if (role === 'ADMIN') {
          // Admin users can only access Evaluations, Student Analytics, and Open Student Analytics
          navigate(ROUTES.EVALUATION_MANAGEMENT, { replace: true })
        } else {
          // Super Admin goes to dashboard
          navigate(ROUTES.DASHBOARD, { replace: true })
        }
      } catch (error) {
        setOtpError(error.message || 'Invalid OTP. Please try again.')
        setIsVerifying(false)
      }
    }
  }

  const handleVerify = async () => {
    if (otpValue.length === 6) {
      await onOTPComplete(otpValue)
    } else {
      setOtpError('Please enter complete OTP code')
    }
  }

  return (
    <div className="bg-gray-900/98 backdrop-blur-md rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl p-5 sm:p-6 lg:p-8 w-full border border-emerald-500/20">
      {/* Logo Section */}
      <div className="text-center mb-6 sm:mb-7 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-0.5 sm:mb-1 text-emerald-400">SCHOLARFLEX</h1>
      </div>

      {/* Login Title */}
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-center mb-6 sm:mb-7 lg:mb-8 text-gray-100">Login</h2>

      <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4 sm:space-y-5">
        {/* Email Field */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            showOTP ? 'opacity-0 max-h-0 overflow-hidden -mt-5' : 'opacity-100 max-h-96'
          }`}
        >
          <label htmlFor="email" className="block text-xs sm:text-sm lg:text-base font-medium mb-1.5 sm:mb-2 text-gray-300">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            disabled={showOTP}
            className={`w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base rounded-lg focus:outline-none focus:ring-2 transition bg-gray-800/50 text-gray-100 placeholder-gray-500 border ${
              errors.email ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30'
            }`}
            placeholder="Enter email address*"
          />
          {errors.email && <p className="mt-1 text-xs sm:text-sm text-red-400">{errors.email.message}</p>}
          {emailError && <p className="mt-1 text-xs sm:text-sm text-red-400">{emailError}</p>}
        </div>

        {/* OTP Input */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            showOTP ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'
          }`}
        >
          <OTPInput 
            length={6} 
            onComplete={(otp) => {
              setOtpValue(otp)
              if (otp.length === 6) {
                onOTPComplete(otp)
              }
            }} 
            error={otpError} 
          />
        </div>

        {/* Button */}
        <div className="pt-1.5 sm:pt-2">
          <button
            type={showOTP ? 'button' : 'submit'}
            onClick={showOTP ? handleVerify : undefined}
            disabled={isSubmitting || isVerifying}
            className="w-full py-2.5 sm:py-3 lg:py-3.5 px-3 sm:px-4 lg:px-5 text-xs sm:text-sm lg:text-base rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-gray-900 hover:bg-emerald-400 transform hover:scale-[1.02]"
          >
            {isSubmitting
              ? 'Sending OTP...'
              : isVerifying
              ? 'Verifying...'
              : showOTP
              ? 'Verify'
              : 'Login with OTP'}
          </button>
        </div>
      </form>
    </div>
  )
}


