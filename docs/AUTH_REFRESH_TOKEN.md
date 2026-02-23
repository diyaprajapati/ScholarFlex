# Authentication: Refresh Token Architecture

## Overview

- **Access token**: 1 hour, sent in `Authorization: Bearer` header, used for all protected routes.
- **Refresh token**: 30 days, stored in **HttpOnly, secure, sameSite=strict** cookie only; not sent in response body and not readable by JavaScript.

## Environment Variables (Backend)

| Variable         | Purpose                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `JWT_SECRET`     | Signs and verifies **access** tokens. Required.                                       |
| `REFRESH_SECRET` | Signs and verifies **refresh** tokens. Must be different from `JWT_SECRET`. Required. |
| `JWT_EXPIRE`     | Optional; access token expiry (e.g. `1h`). Code default: 1h.                          |
| `NODE_ENV`       | When `production`, refresh cookie is set with `secure: true`.                         |

Example `.env`:

```env
JWT_SECRET=<min-32-chars-access-secret>
REFRESH_SECRET=<min-32-chars-refresh-secret-different-from-jwt>
JWT_EXPIRE=1h
NODE_ENV=development
```

## Flow

1. **Login (POST /auth/verify-otp)**
   - Server issues `accessToken` (JWT with `JWT_SECRET`) and `refreshToken` (JWT with `REFRESH_SECRET`).
   - Response: JSON with `token` (access token) and `user`.
   - Response: `Set-Cookie` with refresh token (HttpOnly, secure in prod, sameSite=strict, 30d).
   - Refresh token is **never** in the response body.

2. **Protected requests**
   - Client sends `Authorization: Bearer <accessToken>` on every request.
   - No cookie needed for normal API calls; only the access token is used.

3. **Access token expired (401)**
   - Client (Axios response interceptor) catches 401.
   - If the failed request was **not** `/auth/refresh` and has **not** been retried:
     - Call `POST /auth/refresh` with **credentials** (cookie only; no Bearer).
     - Server reads refresh token from cookie, verifies with `REFRESH_SECRET`, returns new access token in JSON.
     - Client stores new access token and **retries the original request** once.
   - If the request was already retried or the failed request was `/auth/refresh`:
     - Force logout (clear local token, set session-expired message), redirect to login.

4. **Refresh endpoint (POST /auth/refresh)**
   - No body required.
   - Reads refresh token from cookie.
   - Verifies with `REFRESH_SECRET`; checks `type === 'refresh'` and user exists.
   - Returns new **access** token only (no new refresh token in this implementation).
   - On invalid/expired refresh: 401 → client forces logout and redirect.

5. **Logout (POST /auth/logout)**
   - Protected route (valid access token required).
   - Server clears refresh token cookie.
   - Client clears access token and user from storage and redirects to login.

## Security Notes

- **Separate secrets**: Access and refresh tokens use different secrets to limit impact of compromise.
- **Refresh in cookie only**: HttpOnly + sameSite=strict (+ secure in prod) prevents XSS and reduces CSRF risk; refresh not exposed to JS.
- **No refresh in body**: Prevents accidental logging or exposure of refresh tokens.
- **Single retry**: `_retried` flag prevents infinite retry loops on 401.
- **Refresh not re-issued**: Current design does not rotate refresh tokens on use; can be added later if needed.

## Frontend (React + Axios)

- **Storage**: Access token in `localStorage` (key: `scholarflex_token`). No refresh token in storage.
- **Axios**: `apiClient` uses `withCredentials: true` so the refresh cookie is sent on same-origin (or CORS-configured) requests, including `/auth/refresh` and `/auth/logout`.
- **Interceptor**: On 401 → call `/auth/refresh` → store new token → retry original request; on refresh failure or if request was already retried → force logout and redirect to login.

## Backend Files

- **Controller**: `backend/controllers/authController.js` — `verifyOTP`, `refreshAccessToken`, `logout`.
- **Routes**: `backend/routes/authRoutes.js` — `POST /auth/refresh` (public, cookie-based), `POST /auth/logout` (protected).
- **Middleware**: `backend/middleware/auth.js` — validates **access** token from `Authorization: Bearer` only; does not use cookies for protection.
