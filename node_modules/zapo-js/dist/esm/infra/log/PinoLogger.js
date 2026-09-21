import { LOG_LEVEL_PRIORITY } from '../log/types.js';
const PINO_MODULE = 'pino';
const PINO_PRETTY_MODULE = 'pino-pretty';
async function loadPinoFactory() {
    try {
        const loaded = await import(PINO_MODULE);
        if (typeof loaded === 'function') {
            return loaded;
        }
        const candidate = loaded && typeof loaded === 'object' ? loaded.default : undefined;
        if (typeof candidate === 'function') {
            return candidate;
        }
        throw new Error('invalid pino module export');
    }
    catch {
        throw new Error('optional dependency "pino" is not installed. Install with: npm i pino');
    }
}
/**
 * {@link Logger} adapter over a Pino-shaped logger instance. Construct it
 * directly when you already have a configured Pino logger, or use
 * {@link createPinoLogger} to build one with the optional `pino` /
 * `pino-pretty` dependencies.
 */
export class PinoLogger {
    /**
     * @param logger Pino-compatible underlying logger.
     * @param level  Minimum level to emit (also forwarded to `logger.level`).
     */
    constructor(logger, level = 'info') {
        this.logger = logger;
        this.level = level;
        this.logger.level = level;
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
     * Returns a derived logger that pre-binds `bindings` into every log
     * call's context. Delegates to the underlying pino `child()` when
     * available; otherwise wraps with a parent + bindings merge.
     */
    child(bindings, options) {
        if (typeof this.logger.child === 'function') {
            return new PinoLogger(this.logger.child(bindings), options?.level ?? this.level);
        }
        return new BoundLogger(this, bindings, options?.level);
    }
    write(level, message, context) {
        if (context === null || context === undefined) {
            this.logger[level](message);
            return;
        }
        for (const key in context) {
            if (Object.prototype.hasOwnProperty.call(context, key)) {
                this.logger[level](context, message);
                return;
            }
        }
        this.logger[level](message);
    }
}
/**
 * Fallback {@link Logger} that pre-binds context fields by merging them
 * into every call before delegating to a parent logger. Used when the
 * underlying logger does not support `child()` natively.
 */
class BoundLogger {
    constructor(parent, bindings, level) {
        this.parent = parent;
        this.level = level ?? parent.level;
        this.bindings = bindings;
        this.minPriority = LOG_LEVEL_PRIORITY[this.level];
    }
    trace(message, context) {
        if (LOG_LEVEL_PRIORITY.trace >= this.minPriority) {
            this.parent.trace(message, this.merge(context));
        }
    }
    debug(message, context) {
        if (LOG_LEVEL_PRIORITY.debug >= this.minPriority) {
            this.parent.debug(message, this.merge(context));
        }
    }
    info(message, context) {
        if (LOG_LEVEL_PRIORITY.info >= this.minPriority) {
            this.parent.info(message, this.merge(context));
        }
    }
    warn(message, context) {
        if (LOG_LEVEL_PRIORITY.warn >= this.minPriority) {
            this.parent.warn(message, this.merge(context));
        }
    }
    error(message, context) {
        if (LOG_LEVEL_PRIORITY.error >= this.minPriority) {
            this.parent.error(message, this.merge(context));
        }
    }
    child(bindings, options) {
        return new BoundLogger(this.parent, { ...this.bindings, ...bindings }, options?.level ?? this.level);
    }
    merge(context) {
        return context ? { ...this.bindings, ...context } : this.bindings;
    }
}
/**
 * Dynamically loads `pino` (and optionally `pino-pretty` when `pretty` is set),
 * configures it with the given options, and wraps it in a {@link PinoLogger}.
 * Throws if the optional `pino` dependency is not installed.
 */
export async function createPinoLogger(options = {}) {
    const level = options.level ?? 'info';
    const pino = await loadPinoFactory();
    const pinoOptions = {
        ...(options.pinoOptions ?? {}),
        level
    };
    if (options.name) {
        pinoOptions.name = options.name;
    }
    if (options.base !== undefined) {
        pinoOptions.base = options.base;
    }
    if (options.pretty) {
        pinoOptions.transport = options.prettyOptions
            ? {
                target: PINO_PRETTY_MODULE,
                options: options.prettyOptions
            }
            : {
                target: PINO_PRETTY_MODULE
            };
    }
    const pinoLogger = pino(pinoOptions);
    return new PinoLogger(pinoLogger, level);
}
