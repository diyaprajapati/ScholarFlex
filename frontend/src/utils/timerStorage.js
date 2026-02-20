/**
 * Client-resilient timer state in localStorage.
 * Shape: { startTime, sessionId, status, pauseTime?, accumulatedPausedMs? }
 * Elapsed = currentTime - startTime - accumulatedPausedMs - (if paused: now - pauseTime)
 */

const STORAGE_KEY = 'scholarflex_timer_session';

/** @typedef {'running'|'paused'|'stopped'} TimerStatus */

/**
 * @typedef {{
 *   startTime: number,
 *   sessionId: string,
 *   status: TimerStatus,
 *   pauseTime?: number | null,
 *   accumulatedPausedMs?: number
 * }} TimerState
 */

/**
 * @param {TimerState} state
 * @returns {number} Elapsed time in seconds (excluding paused duration)
 */
export function getElapsedSeconds(state) {
  if (!state || !state.startTime) return 0;
  const now = Date.now();
  const base = (state.pauseTime || now) - state.startTime;
  const accumulated = state.accumulatedPausedMs || 0;
  const currentPause = state.status === 'paused' && state.pauseTime ? (now - state.pauseTime) : 0;
  const totalPaused = accumulated + currentPause;
  return Math.max(0, Math.floor((base - totalPaused) / 1000));
}

/**
 * @returns {TimerState | null}
 */
export function getTimerState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.sessionId || !parsed.startTime || !parsed.status) return null;
    return {
      startTime: Number(parsed.startTime),
      sessionId: String(parsed.sessionId),
      status: parsed.status,
      pauseTime: parsed.pauseTime != null ? Number(parsed.pauseTime) : null,
      accumulatedPausedMs: Number(parsed.accumulatedPausedMs || 0),
    };
  } catch {
    return null;
  }
}

/**
 * @param {Partial<TimerState> & Pick<TimerState, 'startTime'|'sessionId'|'status'>} state
 */
export function setTimerState(state) {
  try {
    const payload = {
      startTime: state.startTime,
      sessionId: state.sessionId,
      status: state.status,
      pauseTime: state.pauseTime ?? null,
      accumulatedPausedMs: state.accumulatedPausedMs ?? 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('[timerStorage] setTimerState failed', e);
  }
}

export function clearTimerState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[timerStorage] clearTimerState failed', e);
  }
}

export const TIMER_STORAGE_KEY = STORAGE_KEY;
