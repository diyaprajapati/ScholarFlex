import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import OTPInput from './OTPInput'

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
})

export default function LoginForm() {
  const navigate = useNavigate()
  const [showOTP, setShowOTP] = useState(false)
  const [email, setEmail] = useState('')
  const [otpError, setOtpError] = useState('')
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
    // Simulate API call to send OTP
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setEmail(data.email)
    setShowOTP(true)
    setIsSubmitting(false)
  }

  const onOTPComplete = async (otp) => {
    setOtpValue(otp)
    if (otp.length === 6) {
      setIsVerifying(true)
      setOtpError('')
      
      // Simulate OTP verification
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // For demo purposes, accept any 6-digit OTP
      const userData = {
        email: email,
        loginTime: new Date().toISOString(),
      }
      authService.login(userData)
      navigate('/dashboard', { replace: true })
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
    <div className="bg-gray-900/98 backdrop-blur-md rounded-xl shadow-2xl p-8 w-full border border-emerald-500/20">
      {/* Logo Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold mb-1 text-emerald-400">SCHOLARFLEX</h1>
      </div>

      {/* Login Title */}
      <h2 className="text-2xl font-semibold text-center mb-8 text-gray-100">Login</h2>

      <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-5">
        {/* Email Field */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            showOTP ? 'opacity-0 max-h-0 overflow-hidden -mt-5' : 'opacity-100 max-h-96'
          }`}
        >
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-300">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            disabled={showOTP}
            className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition bg-gray-800/50 text-gray-100 placeholder-gray-500 border ${
              errors.email ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30'
            }`}
            placeholder="Enter email address*"
          />
          {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
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
        <div className="pt-2">
          <button
            type={showOTP ? 'button' : 'submit'}
            onClick={showOTP ? handleVerify : undefined}
            disabled={isSubmitting || isVerifying}
            className="w-full py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-gray-900 hover:bg-emerald-400 transform hover:scale-[1.02]"
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


