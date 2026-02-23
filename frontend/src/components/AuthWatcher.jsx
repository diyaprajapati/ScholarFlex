/**
 * AuthWatcher: no proactive logout on access token expiry.
 * Session extension is handled by the API layer (api.js): 401 → refresh via HttpOnly cookie → retry.
 * Only when refresh fails does the app force logout and redirect.
 * Mount once in App. No UI.
 */
export default function AuthWatcher() {
  return null
}
