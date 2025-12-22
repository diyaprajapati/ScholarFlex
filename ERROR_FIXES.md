# Error Fixes and Explanations

## 🔴 Error 1: ERR_CONNECTION_REFUSED

### Error Message
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
API request error: TypeError: Failed to fetch
```

### Cause
The backend server is **not running** or not accessible at the configured API URL.

### Solution

1. **Start the Backend Server:**
   ```bash
   cd backend
   npm run dev
   # or
   npm start
   ```

2. **Check Backend Port:**
   - Default is usually `http://localhost:5000` or `http://localhost:3000`
   - Check `backend/.env` for `PORT` variable
   - Check `frontend/src/services/api.js` for `API_BASE_URL`

3. **Verify Backend is Running:**
   - Open browser to `http://localhost:5000/api/health` (or your backend URL)
   - Should return a response

4. **Check CORS Configuration:**
   - Ensure backend allows requests from frontend origin
   - Check `backend/server.js` for CORS settings

### Quick Fix
```bash
# Terminal 1 - Start Backend
cd backend
npm run dev

# Terminal 2 - Start Frontend (if not already running)
cd frontend
npm run dev
```

---

## 🔴 Error 2: progressPercent.toFixed is not a function

### Error Message
```
Uncaught TypeError: video.progressPercent.toFixed is not a function
```

### Cause
`progressPercent` is coming from Prisma as a **Decimal** type, not a JavaScript number. The `.toFixed()` method only works on numbers.

### Solution Applied

**Backend Fix:**
- Updated `backend/controllers/videoAnalyticsController.js` to convert Decimal to number:
  ```javascript
  progressPercent: parseFloat(vp.progressPercent),
  ```

**Frontend Fix:**
- Updated `frontend/src/pages/student/StudentVideoAnalyticsPage.jsx` with defensive coding:
  ```javascript
  {typeof video.progressPercent === 'number' 
    ? video.progressPercent.toFixed(0) 
    : parseFloat(video.progressPercent || 0).toFixed(0)}% watched
  ```

### Why This Happens
- Prisma returns Decimal types for database Decimal columns
- JavaScript doesn't have a native Decimal type
- Need to convert using `parseFloat()` or `.toNumber()` before using number methods

### Additional Fixes Needed
Check other places where Decimal types are used:
- `lastPosition` - Fixed ✅
- `progressPercent` - Fixed ✅
- Any other Decimal fields from Prisma

---

## 🔴 Error 3: Failed to fetch (Related to Error 1)

### Error Message
```
Error checking user status: TypeError: Failed to fetch
```

### Cause
This is a consequence of Error 1 - the backend server is not running, so API calls fail.

### Solution
Same as Error 1 - start the backend server.

---

## ✅ All Fixes Applied

### Files Modified:

1. **`backend/controllers/videoAnalyticsController.js`**
   - Converted `progressPercent` from Decimal to number using `parseFloat()`
   - Converted `lastPosition` from Decimal to number using `parseFloat()`

2. **`frontend/src/pages/student/StudentVideoAnalyticsPage.jsx`**
   - Added defensive coding to handle both number and Decimal types
   - Safe conversion before calling `.toFixed()`

### Testing Steps:

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Verify Backend is Running:**
   - Check terminal for "Server running on port XXXX"
   - Test API: `curl http://localhost:5000/api/health` (or your port)

3. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Test Analytics Page:**
   - Navigate to Student Video Analytics page
   - Should load without errors
   - Progress percentages should display correctly

---

## 🔍 Additional Checks

### Check API Base URL
```javascript
// frontend/src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

### Check Backend Port
```javascript
// backend/.env
PORT=5000
```

### Check CORS
```javascript
// backend/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

---

## 📝 Summary

| Error | Status | Fix |
|-------|--------|-----|
| ERR_CONNECTION_REFUSED | ⚠️ Runtime | Start backend server |
| progressPercent.toFixed | ✅ Fixed | Convert Decimal to number |
| Failed to fetch | ⚠️ Runtime | Start backend server |

**Next Steps:**
1. Start backend server
2. Test the analytics page
3. Verify all Decimal fields are converted properly

