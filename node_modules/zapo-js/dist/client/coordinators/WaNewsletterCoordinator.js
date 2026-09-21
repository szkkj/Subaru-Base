"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNewsletterMetadata = void 0;
exports.createNewsletterCoordinator = createNewsletterCoordinator;
const admin_1 = require("../newsletter/admin");
const discovery_1 = require("../newsletter/discovery");
const messaging_1 = require("../newsletter/messaging");
var parse_1 = require("../newsletter/parse");
Object.defineProperty(exports, "parseNewsletterMetadata", { enumerable: true, get: function () { return parse_1.parseNewsletterMetadata; } });
/** Builds a {@link WaNewsletterCoordinator} from its MEX/messaging dependencies. */
function createNewsletterCoordinator(options) {
    const mexDeps = options;
    return {
        ...(0, discovery_1.createDiscoveryOps)(mexDeps),
        ...(0, admin_1.createAdminOps)(mexDeps),
        ...(0, messaging_1.createMessagingOps)(options)
    };
}
