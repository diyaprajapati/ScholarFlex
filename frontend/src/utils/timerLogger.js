/**
 * Structured logging for timer actions and state transitions.
 * Use for debugging why only some users are affected by timer issues.
 */
// const LOG_PREFIX = '[Timer]';

export function timerLog(action, data = {}) {
  const payload = {
    action,
    ts: new Date().toISOString(),
    ...data,
  };
  if (import.meta.env.DEV || typeof window !== 'undefined') {
    try {
      // console.log(LOG_PREFIX, payload);
    } catch (_) {}
  }
}

export function timerLogApi(action, responseOrError) {
  const isError = responseOrError instanceof Error;
  timerLog('api', {
    action,
    success: !isError,
    message: isError ? responseOrError.message : (responseOrError?.message ?? 'ok'),
    status: responseOrError?.status,
  });
}

export function timerLogState(from, to, context = {}) {
  timerLog('state_transition', { from, to, ...context });
}
