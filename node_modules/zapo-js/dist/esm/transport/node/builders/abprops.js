import { WA_ABPROPS_PROTOCOL_VERSION } from '../../../protocol/abprops.js';
import { WA_DEFAULTS, WA_IQ_TYPES, WA_XMLNS } from '../../../protocol/constants.js';
import { buildIqNode } from '../../node/query.js';
export function buildGetAbPropsIq(options) {
    const propsAttrs = {
        protocol: WA_ABPROPS_PROTOCOL_VERSION
    };
    if (options?.hash) {
        propsAttrs.hash = options.hash;
    }
    if (options?.refreshId !== undefined && options.refreshId !== null) {
        propsAttrs.refresh_id = `${options.refreshId}`;
    }
    return buildIqNode(WA_IQ_TYPES.GET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.ABPROPS, [
        {
            tag: 'props',
            attrs: propsAttrs
        }
    ]);
}
