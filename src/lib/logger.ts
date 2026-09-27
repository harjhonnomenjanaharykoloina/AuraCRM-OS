type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LOG_LEVEL_PRECEDENCE: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

function getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
    if (level && level in LOG_LEVEL_PRECEDENCE) {
        return level;
    }
    return "info";
}

const CURRENT_LEVEL = getLogLevel();

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRECEDENCE[level] >= LOG_LEVEL_PRECEDENCE[CURRENT_LEVEL];
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) return;

    const entry: {
        timestamp: string;
        level: LogLevel;
        message: string;
        context?: LogContext;
    } = {
        timestamp: new Date().toISOString(),
        level,
        message,
    };

    if (context && Object.keys(context).length > 0) {
        entry.context = context;
    }

    const line = JSON.stringify(entry);

    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
}

export function logInfo(message: string, context?: LogContext): void {
    emit("info", message, context);
}

export function logDebug(message: string, context?: LogContext): void {
    emit("debug", message, context);
}

export function logError(message: string, context?: LogContext): void {
    emit("error", message, context);
}

export function logWarn(message: string, context?: LogContext): void {
    emit("warn", message, context);
}
