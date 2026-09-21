import { LOG_LEVEL_PRIORITY } from '../log/types.js';
const CONSOLE_WRITERS = {
    trace: (...args) => console.debug(...args),
    debug: (...args) => console.debug(...args),
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args)
};
/**
 * Default zero-dependency {@link Logger} that writes structured records to
 * the standard `console` sinks. Messages below the configured `level` are
 * dropped without formatting cost.
 */
export class ConsoleLogger {
    /** @param level Minimum level to emit. Defaults to `'info'`. */
    constructor(level = 'info', bindings = null) {
        this.level = level;
        this.minLevelPriority = LOG_LEVEL_PRIORITY[level];
        this.bindings = bindings;
    }
    /** Emits a `trace` record. */
    trace(message, context) {
        this.write('trace', message, context);
    }
    /** Emits a `debug` record. */
    debug(message, context) {
        this.write('debug', message, context);
    }
    /** Emits an `info` record. */
    info(message, context) {
        this.write('info', message, context);
    }
    /** Emits a `warn` record. */
    warn(message, context) {
        this.write('warn', message, context);
    }
    /** Emits an `error` record. */
    error(message, context) {
        this.write('error', message, context);
    }
    /**
     * Returns a derived logger with `bindings` merged into the parent's
     * bindings. Per-call context still wins on key conflicts.
     */
    child(bindings, options) {
        const merged = this.bindings ? { ...this.bindings, ...bindings } : { ...bindings };
        return new ConsoleLogger(options?.level ?? this.level, merged);
    }
    write(level, message, context) {
        if (LOG_LEVEL_PRIORITY[level] < this.minLevelPriority) {
            return;
        }
        if (this.bindings) {
            CONSOLE_WRITERS[level](message, { ...this.bindings, ...context });
            return;
        }
        CONSOLE_WRITERS[level](message, context);
    }
}
