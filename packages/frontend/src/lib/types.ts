export interface Session {
  id: string;
  mtime: string;
  path: string;
}

export interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  timestamp: number;
  module: string;
  message: string;
}

export interface LogResponse {
  logs: LogEntry[];
  total: number;
  modules: string[];
}
