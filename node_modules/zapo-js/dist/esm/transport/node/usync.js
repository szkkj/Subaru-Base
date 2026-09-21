import { createNodeIdGenerator } from './helpers.js';
export function createUsyncSidGenerator() {
    const generatorPromise = createNodeIdGenerator();
    return async () => (await generatorPromise).next();
}
export function logUsyncProtocolErrors(envelope, logger, context) {
    for (const protocol of Object.keys(envelope.errors)) {
        const err = envelope.errors[protocol];
        logger.warn('usync protocol error', {
            context,
            protocol,
            code: err.code,
            text: err.text,
            backoffSeconds: err.backoffSeconds
        });
    }
}
