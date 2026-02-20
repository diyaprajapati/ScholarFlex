import { useEffect, useRef } from 'react'
import { authService } from '../utils/auth'

/** Check interval for token expiry (ms) */
const CHECK_INTERVAL_MS = 60 * 1000

/**
 * Watches JWT expiry and triggers logout + redirect when token expires.
 * Prevents "still logged in" state when user is idle and token expires.
 * No UI; mount once in App.
 */
export default function AuthWatcher() {
  const didRedirect = useRef(false)

  useEffect(() => {
    const checkExpiry = () => {
      if (didRedirect.current) return
      const token = authService.getToken()
      if (!token) return
      const exp = authService.getTokenExpirySeconds()
      if (exp == null) return
      const now = Math.floor(Date.now() / 1000)
      if (exp >= now) return

      didRedirect.current = true
      authService.setSessionExpiredMessage()
      authService.logout()
      window.location.href = '/login'
    }

    checkExpiry()
    const id = setInterval(checkExpiry, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
