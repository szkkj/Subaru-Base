"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaTrustedContactTokenCoordinator = void 0;
const cs_token_1 = require("../tokens/cs-token");
const tc_token_1 = require("../tokens/tc-token");
const PromiseDedup_1 = require("../../infra/perf/PromiseDedup");
const privacy_token_1 = require("../../protocol/privacy-token");
const privacy_token_2 = require("../../transport/node/builders/privacy-token");
const primitives_1 = require("../../util/primitives");
const NCT_SALT_SENTINEL_JID = '__nct_salt__';
class WaTrustedContactTokenCoordinator {
    constructor(options) {
        this.logger = options.logger;
        this.store = options.store;
        this.runtime = options.runtime;
        this.serverClock = options.serverClock;
        const maxDurationS = options.maxDurationS ?? privacy_token_1.WA_TC_TOKEN_DEFAULTS.MAX_DURATION_S;
        this.baseConfig = {
            durationS: (0, tc_token_1.clampDuration)(options.durationS ?? privacy_token_1.WA_TC_TOKEN_DEFAULTS.DURATION_S, maxDurationS),
            numBuckets: options.numBuckets ?? privacy_token_1.WA_TC_TOKEN_DEFAULTS.NUM_BUCKETS,
            senderDurationS: (0, tc_token_1.clampDuration)(options.senderDurationS ?? privacy_token_1.WA_TC_TOKEN_DEFAULTS.SENDER_DURATION_S, maxDurationS),
            senderNumBuckets: options.senderNumBuckets ?? privacy_token_1.WA_TC_TOKEN_DEFAULTS.SENDER_NUM_BUCKETS,
            maxDurationS
        };
        this.getConfigOverrides = options.getConfigOverrides;
        this.csTokenGenerator = new cs_token_1.CsTokenGenerator();
        this.senderTokenDedup = new PromiseDedup_1.PromiseDedup();
        this.cachedNctSalt = null;
        this.nctSaltHydrated = false;
    }
    resolveConfig() {
        const overrides = this.getConfigOverrides?.();
        if (!overrides) {
            return this.baseConfig;
        }
        const maxDurationS = overrides.maxDurationS ?? this.baseConfig.maxDurationS;
        return {
            durationS: (0, tc_token_1.clampDuration)(overrides.durationS ?? this.baseConfig.durationS, maxDurationS),
            numBuckets: overrides.numBuckets ?? this.baseConfig.numBuckets,
            senderDurationS: (0, tc_token_1.clampDuration)(overrides.senderDurationS ?? this.baseConfig.senderDurationS, maxDurationS),
            senderNumBuckets: overrides.senderNumBuckets ?? this.baseConfig.senderNumBuckets,
            maxDurationS
        };
    }
    /**
     * Resolves the receiver-mode `<tctoken>` node to echo back on outbound
     * queries against a contact's privacy-gated data (presence subscribe,
     * profile-picture get, about/status usync). Returns the token only when a
     * non-expired receiver token exists for `jid`; unlike
     * {@link resolveTokenForMessage} it does **not** fall back to a `<cstoken>`
     * (the gated query flows attach the trusted-contact token only).
     */
    async resolveReceiverTokenNode(jid) {
        const record = await this.store.getByJid(jid);
        if (!record?.tcToken || record.tcTokenTimestamp === undefined) {
            return null;
        }
        const config = this.resolveConfig();
        const nowS = this.serverClock.nowSeconds();
        if ((0, tc_token_1.isTokenExpired)(record.tcTokenTimestamp, nowS, config.durationS, config.numBuckets)) {
            return null;
        }
        return (0, privacy_token_2.buildTcTokenMessageNode)(record.tcToken);
    }
    async resolveTokenForMessage(recipientJid) {
        const tcTokenNode = await this.resolveReceiverTokenNode(recipientJid);
        if (tcTokenNode) {
            return tcTokenNode;
        }
        const nctSalt = await this.getNctSalt();
        if (!nctSalt) {
            return null;
        }
        const meLid = this.runtime.getCurrentCredentials()?.meLid;
        if (!meLid) {
            return null;
        }
        const hash = this.csTokenGenerator.generate(nctSalt, meLid);
        return (0, privacy_token_2.buildCsTokenMessageNode)(hash);
    }
    async handleIncomingToken(fromJid, tokens) {
        const nowMs = Date.now();
        for (let i = 0; i < tokens.length; i += 1) {
            const token = tokens[i];
            if (token.type !== privacy_token_1.WA_PRIVACY_TOKEN_TYPES.TRUSTED_CONTACT) {
                this.logger.warn('ignoring unknown privacy token type', { type: token.type });
                continue;
            }
            await this.store.upsert({
                jid: fromJid,
                tcToken: token.tokenBytes,
                tcTokenTimestamp: token.timestampS,
                updatedAtMs: nowMs
            });
            this.runtime.emitEvent('debug_privacy_token', {
                jid: fromJid,
                timestampS: token.timestampS,
                type: token.type,
                source: 'notification'
            });
        }
    }
    async maybeIssueSenderToken(recipientJid) {
        return this.senderTokenDedup.run(recipientJid, async () => {
            const nowS = this.serverClock.nowSeconds();
            const record = await this.store.getByJid(recipientJid);
            const senderTimestampS = record?.tcTokenSenderTimestamp;
            const config = this.resolveConfig();
            if (senderTimestampS !== undefined && senderTimestampS > 0) {
                if (!(0, tc_token_1.shouldSendNewToken)(senderTimestampS, nowS, config.senderDurationS)) {
                    return;
                }
            }
            await this.issuePrivacyToken(recipientJid, nowS);
            await this.store.upsert({
                jid: recipientJid,
                tcTokenSenderTimestamp: nowS,
                updatedAtMs: Date.now()
            });
        });
    }
    async reissueOnIdentityChange(jid) {
        const record = await this.store.getByJid(jid);
        if (!record?.tcTokenSenderTimestamp) {
            return;
        }
        const nowS = this.serverClock.nowSeconds();
        const config = this.resolveConfig();
        if ((0, tc_token_1.isTokenExpired)(record.tcTokenSenderTimestamp, nowS, config.senderDurationS, config.senderNumBuckets)) {
            return;
        }
        try {
            await this.issuePrivacyToken(jid, record.tcTokenSenderTimestamp);
        }
        catch (error) {
            this.logger.warn('send-tc-token-device-identity-change-failed', {
                jid,
                message: (0, primitives_1.toError)(error).message
            });
        }
    }
    async hydrateFromHistorySync(conversations) {
        const nowMs = Date.now();
        const records = [];
        for (let i = 0; i < conversations.length; i += 1) {
            const conv = conversations[i];
            if (!conv.tcToken && !conv.tcTokenTimestamp && !conv.tcTokenSenderTimestamp) {
                continue;
            }
            records[records.length] = {
                jid: conv.jid,
                tcToken: conv.tcToken ?? undefined,
                tcTokenTimestamp: conv.tcTokenTimestamp ?? undefined,
                tcTokenSenderTimestamp: conv.tcTokenSenderTimestamp ?? undefined,
                updatedAtMs: nowMs
            };
        }
        if (records.length > 0) {
            await this.store.upsertBatch(records);
        }
    }
    async handleNctSaltSync(salt) {
        if (salt) {
            await this.store.upsert({
                jid: NCT_SALT_SENTINEL_JID,
                nctSalt: salt,
                updatedAtMs: Date.now()
            });
            this.cachedNctSalt = salt;
        }
        else {
            await this.store.deleteByJid(NCT_SALT_SENTINEL_JID);
            this.cachedNctSalt = null;
        }
        this.nctSaltHydrated = true;
        this.csTokenGenerator.invalidate();
    }
    async hydrateNctSaltFromHistorySync(salt) {
        await this.store.upsert({
            jid: NCT_SALT_SENTINEL_JID,
            nctSalt: salt,
            updatedAtMs: Date.now()
        });
        this.cachedNctSalt = salt;
        this.nctSaltHydrated = true;
    }
    async getNctSalt() {
        if (this.nctSaltHydrated) {
            return this.cachedNctSalt;
        }
        const record = await this.store.getByJid(NCT_SALT_SENTINEL_JID);
        this.cachedNctSalt = record?.nctSalt ?? null;
        this.nctSaltHydrated = true;
        return this.cachedNctSalt;
    }
    async issuePrivacyToken(jid, timestampS) {
        const node = (0, privacy_token_2.buildPrivacyTokenIqNode)({ jid, timestampS });
        await this.runtime.queryWithContext('issue-privacy-token', node);
    }
}
exports.WaTrustedContactTokenCoordinator = WaTrustedContactTokenCoordinator;
