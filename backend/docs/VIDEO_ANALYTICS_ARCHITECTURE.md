# Video Analytics System Architecture

## Overview

Comprehensive video analytics system for tracking student video engagement with YouTube videos, including detailed event tracking, watch time calculation, and anti-cheating measures.

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/YouTube)│
└────────┬────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼─────────────────────────────────────┐
│           Backend API Layer                  │
│  ┌──────────────────────────────────────┐   │
│  │  Video Tracking Controller          │   │
│  │  - Event Tracking                   │   │
│  │  - Session Management               │   │
│  │  - Validation & Anti-Cheating        │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Video Analytics Controller          │   │
│  │  - Aggregated Analytics              │   │
│  │  - Real-time Analytics               │   │
│  │  - Drop-off Analysis                 │   │
│  └──────────────────────────────────────┘   │
└────────┬────────────────────────────────────┘
         │
         │ Prisma ORM
         │
┌────────▼─────────────────────────────────────┐
│         PostgreSQL Database                   │
│  ┌──────────────────────────────────────┐   │
│  │  video_progress (Aggregated)          │   │
│  │  video_sessions (Sessions)            │   │
│  │  video_events (Event Log)             │   │
│  │  playlist_access (Playlist Opens)     │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

## Database Schema Design

### 1. VideoProgress (Aggregated Data)

- Stores aggregated statistics per student-video pair
- Updated from session data
- Used for quick analytics queries

**Key Fields:**

- `watchTimeSeconds`: Total accumulated watch time
- `progressPercent`: Maximum progress reached
- `replayCount`: Number of times video was replayed
- `isCompleted`: Whether video was completed

### 2. VideoSession (Session Tracking)

- Each video viewing session (from open to close)
- Tracks session-level metrics
- Links to events

**Key Fields:**

- `sessionId`: Unique session identifier (UUID)
- `startedAt`: When session started
- `endedAt`: When session ended
- `watchTimeSeconds`: Calculated watch time for this session
- `exitReason`: Why session ended (completed, exited, timeout, etc.)

### 3. VideoEvent (Event Log)

- Individual events within a session
- Used for detailed analysis and watch time calculation
- Tamper-resistant through server-side validation

**Event Types:**

- `PLAY`: Video started playing
- `PAUSE`: Video paused
- `RESUME`: Video resumed after pause
- `SEEK`: User seeked to different position
- `PROGRESS`: Periodic progress update
- `COMPLETE`: Video completed
- `EXIT`: User left before completion
- `TAB_HIDDEN`: Browser tab hidden
- `TAB_VISIBLE`: Browser tab visible

**Key Fields:**

- `eventType`: Type of event
- `videoPosition`: Current position in video (seconds)
- `videoDuration`: Total video duration
- `progressPercent`: Progress percentage
- `playbackRate`: Playback speed (for cheating detection)
- `timestamp`: Server timestamp (prevents client manipulation)

### 4. PlaylistAccess

- Tracks when students open playlists
- Used for playlist analytics

## Event Tracking Strategy

### Frontend Event Flow

1. **Playlist Opened**

   ```
   User clicks playlist → Track playlist access
   ```

2. **Video Opened**

   ```
   User clicks video → Create session → Track video opened
   ```

3. **Video Playing**

   ```
   YouTube API: onStateChange(PLAYING)
   → Send PLAY event
   → Start watch time calculation
   ```

4. **Video Paused**

   ```
   YouTube API: onStateChange(PAUSED)
   → Send PAUSE event
   → Stop watch time calculation
   ```

5. **Video Resumed**

   ```
   YouTube API: onStateChange(PLAYING) after PAUSE
   → Send RESUME event
   → Resume watch time calculation
   ```

6. **User Seeks**

   ```
   YouTube API: onStateChange(SEEKING)
   → Send SEEK event with new position
   → Update watch time calculation
   ```

7. **Progress Updates**

   ```
   Every 10 seconds while playing
   → Send PROGRESS event
   → Update aggregated progress
   ```

8. **Video Completed**

   ```
   YouTube API: onStateChange(ENDED)
   → Send COMPLETE event
   → End session
   → Update VideoProgress
   ```

9. **User Exits**

   ```
   Before video ends or component unmounts
   → Send EXIT event
   → End session
   → Calculate final watch time
   ```

10. **Tab Visibility**
    ```
    Visibility API: visibilitychange
    → Send TAB_HIDDEN/TAB_VISIBLE events
    → Pause watch time when hidden
    ```

### Watch Time Calculation Algorithm

**Accurate Watch Time = Sum of all playing intervals**

```
For each session:
  watchTime = 0
  lastPlayPosition = 0
  lastPlayTimestamp = null
  isPlaying = false

  For each event in chronological order:
    if event.type == PLAY or RESUME:
      isPlaying = true
      lastPlayTimestamp = event.timestamp
      lastPlayPosition = event.videoPosition

    if event.type == PAUSE or TAB_HIDDEN:
      if isPlaying:
        watchTime += (event.timestamp - lastPlayTimestamp)
        isPlaying = false

    if event.type == SEEK:
      if isPlaying:
        // Only count time if seeking forward or small backward
        if event.videoPosition >= lastPlayPosition - 5:
          watchTime += (event.timestamp - lastPlayTimestamp)
        lastPlayTimestamp = event.timestamp
        lastPlayPosition = event.videoPosition

    if event.type == COMPLETE or EXIT:
      if isPlaying:
        watchTime += (event.timestamp - lastPlayTimestamp)
      break

  session.watchTimeSeconds = watchTime
```

**Key Rules:**

1. Only count time when video is actually playing
2. Don't count time when paused or tab hidden
3. Handle seeks intelligently (small backward seeks OK, large backward = rewind)
4. Server validates all timestamps to prevent manipulation

## Anti-Cheating Measures

### 1. Server-Side Validation

- All events timestamped on server
- Client timestamps ignored for critical calculations
- Rate limiting on event submissions

### 2. Playback Rate Detection

- Track playback speed
- Flag suspicious speeds (>2x normal)
- May indicate skipping or manipulation

### 3. Position Validation

- Validate position changes are reasonable
- Large backward jumps may indicate manipulation
- Forward jumps beyond video duration = invalid

### 4. Session Validation

- Maximum session duration (video duration + buffer)
- Minimum time between events
- Detect impossible watch times

### 5. Tab Visibility Tracking

- Don't count watch time when tab is hidden
- Prevents background playback abuse

### 6. Event Sequence Validation

- Validate event order (can't resume without pause)
- Detect missing events
- Flag suspicious patterns

## API Endpoints

### Tracking Endpoints

#### POST /api/video-tracking/playlist-opened

Track when student opens a playlist

```json
{
  "playlistId": 1
}
```

#### POST /api/video-tracking/session/start

Start a new video viewing session

```json
{
  "videoId": 1,
  "playlistId": 1
}
```

Response:

```json
{
  "sessionId": "uuid-here",
  "success": true
}
```

#### POST /api/video-tracking/session/event

Track an event within a session

```json
{
  "sessionId": "uuid-here",
  "eventType": "PLAY",
  "videoPosition": 10.5,
  "videoDuration": 300.0,
  "progressPercent": 3.5,
  "playbackRate": 1.0,
  "metadata": {}
}
```

#### POST /api/video-tracking/session/end

End a session

```json
{
  "sessionId": "uuid-here",
  "exitReason": "completed" | "exited" | "timeout"
}
```

### Analytics Endpoints

#### GET /api/video-analytics/student

Get student's own analytics

- Summary statistics
- Per-playlist breakdown
- Per-video breakdown
- Daily watch time
- Completion rates

#### GET /api/video-analytics/admin

Get admin analytics for all students

- Overall statistics
- Per-student analytics
- Per-playlist analytics
- Per-video analytics
- Drop-off analysis

#### GET /api/video-analytics/admin/student/:studentId

Get detailed analytics for specific student

- All sessions
- Event timeline
- Watch patterns
- Drop-off points

#### GET /api/video-analytics/admin/video/:videoId

Get analytics for specific video

- Total views
- Completion rate
- Average watch time
- Drop-off timestamps
- Most common exit points

#### GET /api/video-analytics/admin/playlist/:playlistId

Get analytics for specific playlist

- Total accesses
- Videos watched
- Completion rates
- Student engagement

## Edge Cases Handling

### 1. Multiple Tabs/Devices

- Each tab/device creates separate session
- Sessions tracked independently
- Final watch time = sum of all sessions

### 2. Network Interruptions

- Events queued locally
- Batch sent when connection restored
- Server validates timestamps

### 3. Browser Refresh

- Session ends on unmount
- New session starts on remount
- Progress preserved in VideoProgress

### 4. Video Replay

- New session for each replay
- Replay count incremented
- Watch time accumulated

### 5. Seeking Behavior

- Forward seeks: Normal (user skipping)
- Small backward seeks (<5s): Normal (user reviewing)
- Large backward seeks (>30s): May indicate rewind/replay

### 6. Tab Switching

- Tab hidden: Pause watch time
- Tab visible: Resume watch time
- Prevents background playback abuse

### 7. Video Duration Changes

- YouTube may update video duration
- Use latest duration from events
- Recalculate progress if needed

## Real-time Analytics (Optional)

### WebSocket Implementation

```javascript
// Server sends real-time updates
ws.on("video_event", (data) => {
  // Update analytics dashboard
  updateDashboard(data);
});
```

### Kafka Integration (Future)

- Stream events to Kafka
- Process with Kafka Streams
- Real-time aggregations
- Event replay capability

## Performance Considerations

### Database Indexing

- Index on (studentId, videoId) for quick lookups
- Index on (sessionId, timestamp) for event queries
- Index on (playlistId, openedAt) for playlist analytics

### Caching Strategy

- Cache aggregated VideoProgress data
- Invalidate on new events
- Use Redis for real-time analytics

### Batch Processing

- Batch event inserts
- Periodic aggregation updates
- Background jobs for heavy calculations

## Security Considerations

1. **Authentication**: All endpoints require valid JWT
2. **Authorization**: Students can only access their own data
3. **Rate Limiting**: Prevent event spam
4. **Input Validation**: Validate all event data
5. **SQL Injection**: Use parameterized queries (Prisma)
6. **XSS Prevention**: Sanitize all user inputs

## Monitoring & Alerts

- Track event submission rates
- Monitor watch time anomalies
- Alert on suspicious patterns
- Dashboard for system health
