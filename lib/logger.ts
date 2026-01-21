type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: LogMeta;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 환경에 따른 최소 로그 레벨 설정
const getMinLogLevel = (): LogLevel => {
  if (process.env.NODE_ENV === 'production') {
    return 'warn';
  }
  return 'debug';
};

const shouldLog = (level: LogLevel): boolean => {
  const minLevel = getMinLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
};

const formatLogEntry = (entry: LogEntry): string => {
  const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`, entry.message];

  if (entry.meta && Object.keys(entry.meta).length > 0) {
    parts.push(JSON.stringify(entry.meta));
  }

  if (entry.error) {
    parts.push(`\n  Error: ${entry.error.name}: ${entry.error.message}`);
    if (entry.error.stack && process.env.NODE_ENV !== 'production') {
      parts.push(`\n  Stack: ${entry.error.stack}`);
    }
  }

  return parts.join(' ');
};

const createLogEntry = (
  level: LogLevel,
  message: string,
  error?: Error,
  meta?: LogMeta
): LogEntry => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (meta && Object.keys(meta).length > 0) {
    entry.meta = meta;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
};

const log = (level: LogLevel, message: string, error?: Error, meta?: LogMeta): void => {
  if (!shouldLog(level)) return;

  const entry = createLogEntry(level, message, error, meta);
  const formattedMessage = formatLogEntry(entry);

  switch (level) {
    case 'debug':
      console.debug(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
  }

  // 프로덕션에서 외부 서비스로 전송할 수 있는 훅
  // if (process.env.NODE_ENV === 'production' && level === 'error') {
  //   sendToExternalService(entry);
  // }
};

export const logger = {
  debug: (message: string, meta?: LogMeta): void => {
    log('debug', message, undefined, meta);
  },

  info: (message: string, meta?: LogMeta): void => {
    log('info', message, undefined, meta);
  },

  warn: (message: string, meta?: LogMeta): void => {
    log('warn', message, undefined, meta);
  },

  error: (message: string, error?: Error | unknown, meta?: LogMeta): void => {
    const err = error instanceof Error ? error : undefined;
    log('error', message, err, meta);
  },
};

export default logger;
