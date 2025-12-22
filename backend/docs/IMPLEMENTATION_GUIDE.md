# Video Analytics Implementation Guide

## Step-by-Step Implementation

### Step 1: Database Migration

Run the migration to create the new tables:

```bash
cd backend
npx prisma migrate dev --name enhanced_video_analytics
```

This will create:
- `video_sessions` table
- `video_events` table  
- `playlist_access` table
- Update `video_progress` table with `replayCount`

### Step 2: Backend Setup

The enhanced controllers and routes are already created:
- `enhancedVideoTrackingController.js` - Event tracking
- `enhancedVideoAnalyticsController.js` - Detailed analytics
- Routes are registered in `server.js`

### Step 3: Frontend Implementation

#### 3.1 Update API Service

Add new methods to `frontend/src/services/api.js`:

```javascript
enhancedVideoTracking: {
  trackPlaylistOpened: async (playlistId) => {
    return apiRequest('/video-tracking/playlist-opened', {
      method: 'POST',
      body: JSON.stringify({ playlistId }),
    });
  },

  startSession: async (videoId, playlistId) => {
    return apiRequest('/video-tracking/session/start', {
      method: 'POST',
      body: JSON.stringify({ videoId, playlistId }),
    });
  },

  trackEvent: async (sessionId, eventData) => {
    return apiRequest('/video-tracking/session/event', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        ...eventData,
      }),
    });
  },

  endSession: async (sessionId, exitReason) => {
    return apiRequest('/video-tracking/session/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId, exitReason }),
    });
  },
},

enhancedVideoAnalytics: {
  getStudentDetailed: async () => {
    return apiRequest('/video-analytics/student/detailed', {
      method: 'GET',
    });
  },

  getAdminDetailed: async (selectedOnly = true) => {
    const params = new URLSearchParams();
    if (selectedOnly !== undefined) {
      params.append('selectedOnly', selectedOnly.toString());
    }
    const queryString = params.toString();
    const endpoint = queryString 
      ? `/video-analytics/admin/detailed?${queryString}` 
      : '/video-analytics/admin/detailed';
    return apiRequest(endpoint, { method: 'GET' });
  },

  getVideoAnalytics: async (videoId) => {
    return apiRequest(`/video-analytics/admin/video/${videoId}`, {
      method: 'GET',
    });
  },
},
```

#### 3.2 Enhanced Video Player Implementation

The video player needs to:
1. Track playlist opened
2. Start session when video opens
3. Track all YouTube API events
4. Handle tab visibility
5. End session properly

Key events to track:
- `PLAY` - Video starts playing
- `PAUSE` - Video paused
- `RESUME` - Video resumed after pause
- `SEEK` - User seeks to different position
- `PROGRESS` - Periodic progress updates (every 10s)
- `COMPLETE` - Video completed
- `EXIT` - User left before completion
- `TAB_HIDDEN` - Browser tab hidden
- `TAB_VISIBLE` - Browser tab visible

### Step 4: Watch Time Calculation

Watch time is calculated server-side from events:

**Algorithm:**
1. Sort events by timestamp
2. Track playing state
3. Accumulate time only when playing
4. Handle seeks intelligently
5. Don't count time when paused or tab hidden

**Example:**
```
Event 1: PLAY at 0s, position 0s
Event 2: PROGRESS at 10s, position 10s → +10s watch time
Event 3: PAUSE at 20s, position 20s → +10s watch time (total: 20s)
Event 4: RESUME at 30s, position 20s
Event 5: PROGRESS at 40s, position 30s → +10s watch time (total: 30s)
Event 6: COMPLETE at 50s, position 50s → +10s watch time (total: 40s)
```

### Step 5: Anti-Cheating Measures

1. **Server Timestamps**: All events timestamped on server
2. **Rate Limiting**: Max 1 event per second
3. **Position Validation**: Position must be reasonable
4. **Playback Rate**: Flag speeds >2x
5. **Session Duration**: Max duration = video duration + 10%
6. **Event Sequence**: Validate logical event order

### Step 6: Testing

1. **Test Playlist Tracking**
   - Open playlist → Check `playlist_access` table

2. **Test Session Tracking**
   - Open video → Check session created
   - Play video → Check PLAY event
   - Pause → Check PAUSE event
   - Resume → Check RESUME event
   - Seek → Check SEEK event
   - Complete → Check COMPLETE event and session ended

3. **Test Watch Time**
   - Play for 30 seconds
   - Pause for 10 seconds
   - Resume for 20 seconds
   - Expected watch time: 50 seconds (not 60)

4. **Test Tab Visibility**
   - Play video
   - Switch tabs
   - Return to tab
   - Watch time should not include hidden time

5. **Test Analytics**
   - View student analytics
   - View admin analytics
   - Check drop-off points
   - Verify completion rates

## Edge Cases

### Multiple Tabs
- Each tab creates separate session
- Sessions tracked independently
- Final watch time = sum of all sessions

### Network Issues
- Queue events locally
- Batch send when connection restored
- Server validates timestamps

### Browser Refresh
- End session on unmount
- Start new session on mount
- Progress preserved in VideoProgress

### Video Replay
- New session for each replay
- Replay count incremented
- Watch time accumulated

## Performance Optimization

1. **Batch Events**: Send multiple events in one request
2. **Debounce Progress**: Only send progress every 10s
3. **Index Database**: Proper indexes on foreign keys
4. **Cache Aggregations**: Cache VideoProgress data
5. **Background Jobs**: Calculate watch time asynchronously

## Monitoring

Track:
- Event submission rate
- Watch time anomalies
- Suspicious patterns
- System performance

Alert on:
- Unusual playback rates
- Impossible watch times
- High exit rates
- System errors

