import { type Logger, type LogLevel } from '../log/types';
/**
 * Default zero-dependency {@link Logger} that writes structured records to
 * the standard `console` sinks. Messages below the configured `level` are
 * dropped without formatting cost.
 */
export declare class ConsoleLogger implements Logger {
    readonly level: LogLevel;
    private readonly minLevelPriority;
    private readonly bindings;
    /** @param level Minimum level to emit. Defaults to `'info'`. */
    constructor(level?: LogLevel, bindings?: Readonly<Record<string, unknown>> | null);
    /** Emits a `trace` record. */
    trace(message: string, context?: Record<string, unknown>): void;
    /** Emits a `debug` record. */
    debug(message: string, context?: Record<string, unknown>): void;
    /** Emits an `info` record. */
    info(message: string, context?: Record<string, unknown>): void;
    /** Emits a `warn` record. */
    warn(message: string, context?: Record<string, unknown>): void;
    /** Emits an `error` record. */
    error(message: string, context?: Record<string, unknown>): void;
    /**
     * Returns a derived logger with `bindings` merged into the parent's
     * bindings. Per-call context still wins on key conflicts.
     */
    child(bindings: Readonly<Record<string, unknown>>, options?: {
        readonly level?: LogLevel;
    }): Logger;
    private write;
}
