"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_LEVEL_PRIORITY = void 0;
exports.createNoopLogger = createNoopLogger;
exports.LOG_LEVEL_PRIORITY = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50
};
function noop() { }
function createNoopLogger(level = 'trace') {
    const logger = {
        level,
        trace: noop,
        debug: noop,
        info: noop,
        warn: noop,
        error: noop,
        child: (_bindings, options) => (options?.level ? createNoopLogger(options.level) : logger)
    };
    return logger;
}
