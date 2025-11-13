import React, { useRef, useState, useEffect } from 'react'

export default function OTPInput({ length = 6, onComplete, error }) {
  const [otp, setOtp] = useState(Array(length).fill(''))
  const inputRefs = useRef([])

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take the last character
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check if all inputs are filled
    if (newOtp.every((digit) => digit !== '')) {
      onComplete(newOtp.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, length)
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp]
      pastedData.split('').forEach((digit, index) => {
        if (index < length) {
          newOtp[index] = digit
        }
      })
      setOtp(newOtp)
      const nextIndex = Math.min(pastedData.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
      
      if (newOtp.every((digit) => digit !== '')) {
        onComplete(newOtp.join(''))
      }
    }
  }

  return (
    <div className="w-full">
      <label className="block text-xs sm:text-sm lg:text-base font-medium mb-2 sm:mb-3 text-gray-300 text-center">
        Enter OTP Code
      </label>
      <div className="flex justify-center gap-2 sm:gap-2.5 lg:gap-3 mb-1.5 sm:mb-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 text-center text-base sm:text-lg lg:text-xl font-semibold rounded-lg focus:outline-none focus:ring-2 transition-all bg-gray-800/50 text-gray-100 border ${
              error
                ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                : 'border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30'
            }`}
          />
        ))}
      </div>
      {error && <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-400 text-center">{error}</p>}
    </div>
  )
}

