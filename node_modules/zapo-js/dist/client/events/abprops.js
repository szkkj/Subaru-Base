"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAbPropsIqResult = parseAbPropsIqResult;
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
function parseAbPropsIqResult(node) {
    const propsNode = (0, helpers_1.findNodeChild)(node, 'props');
    if (!propsNode) {
        return {
            abKey: null,
            hash: null,
            refresh: null,
            refreshId: null,
            isDeltaUpdate: false,
            props: []
        };
    }
    const attrs = propsNode.attrs;
    const propChildren = (0, helpers_1.getNodeChildren)(propsNode);
    const props = [];
    for (let i = 0; i < propChildren.length; i += 1) {
        const child = propChildren[i];
        if (child.tag !== 'prop') {
            continue;
        }
        const configCode = (0, primitives_1.parseOptionalInt)(child.attrs.config_code);
        if (configCode === undefined) {
            continue;
        }
        props.push({
            configCode,
            configValue: child.attrs.config_value ?? null
        });
    }
    return {
        abKey: attrs.ab_key ?? null,
        hash: attrs.hash ?? null,
        refresh: (0, primitives_1.parseOptionalInt)(attrs.refresh) ?? null,
        refreshId: (0, primitives_1.parseOptionalInt)(attrs.refresh_id) ?? null,
        isDeltaUpdate: attrs.delta_update === 'true',
        props
    };
}
