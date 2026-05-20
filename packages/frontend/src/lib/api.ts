import type { Session, LogResponse } from './types';

export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch('/api/sessions');
  return res.json();
}

export async function fetchLogs(sessionId: string, params: Record<string, any>): Promise<LogResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
      searchParams.append(key, value.toString());
    }
  });
  const res = await fetch(`/api/sessions/${sessionId}/logs?${searchParams.toString()}`);
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function deleteAllLogs(): Promise<void> {
  await fetch('/api/logs', { method: 'DELETE' });
}
