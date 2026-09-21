import { type Logger, type LogLevel } from '../log/types';
type PinoLikeLogger = {
    level: string;
    trace: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    child?: (bindings: Readonly<Record<string, unknown>>) => PinoLikeLogger;
};
export interface PinoPrettyOptions {
    readonly colorize?: boolean;
    readonly colorizeObjects?: boolean;
    readonly translateTime?: boolean | string;
    readonly ignore?: string;
    readonly include?: string;
    readonly singleLine?: boolean;
    readonly hideObject?: boolean;
    readonly levelFirst?: boolean;
    readonly messageKey?: string;
    readonly messageFormat?: string;
    readonly timestampKey?: string;
    readonly levelKey?: string;
    readonly levelLabel?: string;
    readonly minimumLevel?: LogLevel;
    readonly errorLikeObjectKeys?: readonly string[];
    readonly errorProps?: string;
    readonly customColors?: string;
    readonly customLevels?: string;
    readonly useOnlyCustomProps?: boolean;
    readonly crlf?: boolean;
    readonly destination?: number | string;
    readonly append?: boolean;
    readonly mkdir?: boolean;
    readonly sync?: boolean;
    readonly [key: string]: unknown;
}
export interface PinoLoggerOptions {
    readonly level?: LogLevel;
    readonly name?: string;
    readonly base?: Readonly<Record<string, unknown>> | null;
    readonly pinoOptions?: Readonly<Record<string, unknown>>;
    readonly pretty?: boolean;
    readonly prettyOptions?: PinoPrettyOptions;
}
/**
 * {@link Logger} adapter over a Pino-shaped logger instance. Construct it
 * directly when you already have a configured Pino logger, or use
 * {@link createPinoLogger} to build one with the optional `pino` /
 * `pino-pretty` dependencies.
 */
export declare class PinoLogger implements Logger {
    readonly level: LogLevel;
    private readonly logger;
    /**
     * @param logger Pino-compatible underlying logger.
     * @param level  Minimum level to emit (also forwarded to `logger.level`).
     */
    constructor(logger: PinoLikeLogger, level?: LogLevel);
    /** Emits a `trace` record. */
    trace(message: string, context?: Readonly<Record<string, unknown>>): void;
    /** Emits a `debug` record. */
    debug(message: string, context?: Readonly<Record<string, unknown>>): void;
    /** Emits an `info` record. */
    info(message: string, context?: Readonly<Record<string, unknown>>): void;
    /** Emits a `warn` record. */
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
    /** Emits an `error` record. */
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
    /**
     * Returns a derived logger that pre-binds `bindings` into every log
     * call's context. Delegates to the underlying pino `child()` when
     * available; otherwise wraps with a parent + bindings merge.
     */
    child(bindings: Readonly<Record<string, unknown>>, options?: {
        readonly level?: LogLevel;
    }): Logger;
    private write;
}
/**
 * Dynamically loads `pino` (and optionally `pino-pretty` when `pretty` is set),
 * configures it with the given options, and wraps it in a {@link PinoLogger}.
 * Throws if the optional `pino` dependency is not installed.
 */
export declare function createPinoLogger(options?: PinoLoggerOptions): Promise<PinoLogger>;
export {};
