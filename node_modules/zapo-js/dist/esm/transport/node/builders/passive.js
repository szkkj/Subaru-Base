import { WA_DEFAULTS, WA_IQ_TYPES, WA_XMLNS } from '../../../protocol/constants.js';
import { buildIqNode } from '../../node/query.js';
export function buildPassiveModeIqNode(mode) {
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.PASSIVE, [
        { tag: mode, attrs: {} }
    ]);
}
