import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { logEvent } from "firebase/analytics"
import { analytics } from "../firebase"

const PageTracker = () => {
  const location = useLocation()
  const startTimeRef = useRef(Date.now())
  const pathnameRef = useRef(location.pathname)

  useEffect(() => {
    // Track page view when page loads
    if (analytics) {
      try {
        logEvent(analytics, "page_view", {
          page_path: location.pathname,
          page_title: document.title
        })
        // Only log in development mode
        if (import.meta.env.DEV) {
        //   console.log('Analytics event logged:', location.pathname)
        }
      } catch (error) {
        console.error('Error logging analytics event:', error)
      }
    } else {
      console.warn('Firebase Analytics is not initialized')
    }

    // Reset timer for new page
    startTimeRef.current = Date.now()
    pathnameRef.current = location.pathname

    // Cleanup function: track time spent when leaving page
    return () => {
      if (analytics && pathnameRef.current) {
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000) // in seconds
        
        try {
          logEvent(analytics, "page_time", {
            page_path: pathnameRef.current,
            time_spent_seconds: timeSpent,
            time_spent_minutes: Math.round((timeSpent / 60) * 100) / 100 // rounded to 2 decimals
          })
          
          if (import.meta.env.DEV) {
            // console.log(`Time spent on ${pathnameRef.current}:`, timeSpent, 'seconds')
          }
        } catch (error) {
          console.error('Error logging page time:', error)
        }
      }
    }
  }, [location])

  return null
}

export default PageTracker
