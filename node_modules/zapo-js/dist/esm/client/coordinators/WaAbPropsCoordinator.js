import { resolveAbPropNameByCode, WA_ABPROPS } from '../../abprops-spec.js';
import { parseAbPropsIqResult } from '../events/abprops.js';
import { WA_ABPROPS_REFRESH_BOUNDS } from '../../protocol/abprops.js';
import { WA_DEFAULTS } from '../../protocol/constants.js';
import { buildGetAbPropsIq } from '../../transport/node/builders/abprops.js';
import { toError } from '../../util/primitives.js';
// The generated table types every entry with literal `code` / `defaultValue`
// types. Reading through a widened view keeps a lookup by a non-literal name
// from expanding into a 2000-member union at every call site.
const AB_PROPS = WA_ABPROPS;
export class WaAbPropsCoordinator {
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
                message: toError(error).message
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
                    message: toError(error).message
                });
            }
        }
    }
    async executeSync(epoch) {
        const iqNode = buildGetAbPropsIq({
            hash: this.syncState.hash,
            refreshId: this.syncState.refreshId
        });
        const response = await this.runtime.queryWithContext('abprops.sync', iqNode, WA_DEFAULTS.IQ_TIMEOUT_MS);
        if (this.syncEpoch !== epoch) {
            return;
        }
        const result = parseAbPropsIqResult(response);
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
            const name = resolveAbPropNameByCode(entry.configCode);
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
    return Math.max(WA_ABPROPS_REFRESH_BOUNDS.MIN_S, Math.min(WA_ABPROPS_REFRESH_BOUNDS.MAX_S, seconds));
}
