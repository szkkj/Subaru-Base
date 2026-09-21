import { WA_DEFAULTS } from '../../../protocol/defaults.js';
import { WA_IQ_TYPES, WA_XMLNS } from '../../../protocol/nodes.js';
import { buildIqNode } from '../../node/query.js';
export function buildRemoveCompanionDeviceIq(deviceJid, reason) {
    return buildIqNode(WA_IQ_TYPES.SET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.MD, [
        {
            tag: 'remove-companion-device',
            attrs: { jid: deviceJid, reason }
        }
    ]);
}
