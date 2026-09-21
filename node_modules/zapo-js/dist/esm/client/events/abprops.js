import { findNodeChild, getNodeChildren } from '../../transport/node/helpers.js';
import { parseOptionalInt } from '../../util/primitives.js';
export function parseAbPropsIqResult(node) {
    const propsNode = findNodeChild(node, 'props');
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
    const propChildren = getNodeChildren(propsNode);
    const props = [];
    for (let i = 0; i < propChildren.length; i += 1) {
        const child = propChildren[i];
        if (child.tag !== 'prop') {
            continue;
        }
        const configCode = parseOptionalInt(child.attrs.config_code);
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
        refresh: parseOptionalInt(attrs.refresh) ?? null,
        refreshId: parseOptionalInt(attrs.refresh_id) ?? null,
        isDeltaUpdate: attrs.delta_update === 'true',
        props
    };
}
