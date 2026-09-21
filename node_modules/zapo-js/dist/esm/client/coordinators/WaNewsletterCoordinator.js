import { createAdminOps } from '../newsletter/admin.js';
import { createDiscoveryOps } from '../newsletter/discovery.js';
import { createMessagingOps } from '../newsletter/messaging.js';
export { parseNewsletterMetadata } from '../newsletter/parse.js';
/** Builds a {@link WaNewsletterCoordinator} from its MEX/messaging dependencies. */
export function createNewsletterCoordinator(options) {
    const mexDeps = options;
    return {
        ...createDiscoveryOps(mexDeps),
        ...createAdminOps(mexDeps),
        ...createMessagingOps(options)
    };
}
