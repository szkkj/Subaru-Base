"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaAbPropsCoordinator = void 0;
const _abprops_spec_1 = require("../../abprops-spec");
const abprops_1 = require("../events/abprops");
const abprops_2 = require("../../protocol/abprops");
const constants_1 = require("../../protocol/constants");
const abprops_3 = require("../../transport/node/builders/abprops");
const primitives_1 = require("../../util/primitives");
// The generated table types every entry with literal `code` / `defaultValue`
// types. Reading through a widened view keeps a lookup by a non-literal name
// from expanding into a 2000-member union at every call site.
const AB_PROPS = _abprops_spec_1.WA_ABPROPS;
class WaAbPropsCoordinator {
    constructor(options) {
        this.logger = options.logger;
        this.runtime = options.runtime;
        this.cache = new Map();
        this.syncState = { hash: null, abKey: null, refreshId: null };
        this.syncPromise = null;
        this.syncEpoch = 0;
        this.pendingSync = false;
    }
    getConfigValue(name) {
        const cached = this.cache.get(name);
        if (cached !== undefined) {
            return cached;
        }
        return AB_PROPS[name].defaultValue;
    }
    sync() {
        if (this.syncPromise) {
            this.pendingSync = true;
            return;
        }
        this.startSync();
    }
    reset() {
        this.cache.clear();
        this.syncState.hash = null;
        this.syncState.abKey = null;
        this.syncState.refreshId = null;
        this.syncPromise = null;
        this.pendingSync = false;
        this.syncEpoch += 1;
    }
    startSync() {
        const epoch = this.syncEpoch;
        this.pendingSync = false;
        this.syncPromise = this.executeSyncWithRetry(epoch)
            .catch((error) => {
            this.logger.warn('ab props sync failed', {
                message: (0, primitives_1.toError)(error).message
            });
        })
            .finally(() => {
            if (this.syncEpoch !== epoch) {
                return;
            }
            this.syncPromise = null;
            if (this.pendingSync) {
                this.startSync();
            }
        });
    }
    async executeSyncWithRetry(epoch) {
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt += 1) {
            if (this.syncEpoch !== epoch) {
                return;
            }
            try {
                await this.executeSync(epoch);
                return;
            }
            catch (error) {
                if (attempt === maxRetries - 1) {
                    throw error;
                }
                this.logger.debug('ab props sync retrying', {
                    attempt: attempt + 1,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        }
    }
    async executeSync(epoch) {
        const iqNode = (0, abprops_3.buildGetAbPropsIq)({
            hash: this.syncState.hash,
            refreshId: this.syncState.refreshId
        });
        const response = await this.runtime.queryWithContext('abprops.sync', iqNode, constants_1.WA_DEFAULTS.IQ_TIMEOUT_MS);
        if (this.syncEpoch !== epoch) {
            return;
        }
        const result = (0, abprops_1.parseAbPropsIqResult)(response);
        if (result.abKey !== null) {
            this.syncState.abKey = result.abKey;
        }
        if (result.hash !== null) {
            this.syncState.hash = result.hash;
        }
        if (result.refreshId !== null) {
            this.syncState.refreshId = result.refreshId;
        }
        if (!result.isDeltaUpdate) {
            this.cache.clear();
        }
        let applied = 0;
        for (let i = 0; i < result.props.length; i += 1) {
            const entry = result.props[i];
            const name = (0, _abprops_spec_1.resolveAbPropNameByCode)(entry.configCode);
            if (!name) {
                continue;
            }
            const config = AB_PROPS[name];
            const parsed = parseConfigValue(entry.configValue, config.type, config.defaultValue);
            this.cache.set(name, parsed);
            applied += 1;
        }
        this.logger.info('ab props synced', {
            received: result.props.length,
            applied,
            isDelta: result.isDeltaUpdate,
            abKey: result.abKey,
            refresh: result.refresh !== null ? clampRefresh(result.refresh) : null
        });
    }
}
exports.WaAbPropsCoordinator = WaAbPropsCoordinator;
// parseInt, not a digits-only parse: negative values are in band, several props
// ship -1 as their default. Divergence: WA Web caches NaN, we keep the default.
function parseConfigValue(value, type, defaultValue) {
    if (value === null) {
        return defaultValue;
    }
    if (type === 'bool') {
        return value === '1' || value === 'true' || value === 'True';
    }
    if (type === 'int') {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? defaultValue : parsed;
    }
    if (type === 'float') {
        const parsed = Number.parseFloat(value);
        return Number.isNaN(parsed) ? defaultValue : parsed;
    }
    return value;
}
function clampRefresh(seconds) {
    return Math.max(abprops_2.WA_ABPROPS_REFRESH_BOUNDS.MIN_S, Math.min(abprops_2.WA_ABPROPS_REFRESH_BOUNDS.MAX_S, seconds));
}
