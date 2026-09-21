"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUsyncSidGenerator = createUsyncSidGenerator;
exports.logUsyncProtocolErrors = logUsyncProtocolErrors;
const helpers_1 = require("./helpers");
function createUsyncSidGenerator() {
    const generatorPromise = (0, helpers_1.createNodeIdGenerator)();
    return async () => (await generatorPromise).next();
}
function logUsyncProtocolErrors(envelope, logger, context) {
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
