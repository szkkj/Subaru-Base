"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAuthCreds = exports.addTransactionCapability = void 0;
exports.makeCacheableSignalKeyStore = makeCacheableSignalKeyStore;
const node_cache_1 = __importDefault(require("@cacheable/node-cache"));
const async_hooks_1 = require("async_hooks");
const async_mutex_1 = require("async-mutex");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const p_queue_1 = __importDefault(require("p-queue"));
const Defaults_1 = require("../Defaults");
const crypto_2 = require("./crypto");
const generics_1 = require("./generics");
const pre_key_manager_1 = require("./pre-key-manager");
/**
 * Adds caching capability to a SignalKeyStore
 * @param store the store to add caching to
 * @param logger to log trace events
 * @param _cache cache store to use
 */
function makeCacheableSignalKeyStore(store, logger, _cache) {
  const cache =
    _cache ||
    new node_cache_1.default({
      stdTTL: Defaults_1.DEFAULT_CACHE_TTLS.SIGNAL_STORE, // 5 minutes
      useClones: false,
      deleteOnExpire: true,
    });
  // Mutex for protecting cache operations
  const cacheMutex = new async_mutex_1.Mutex();
  function getUniqueId(type, id) {
    return `${type}.${id}`;
  }
  return {
    async get(type, ids) {
      return cacheMutex.runExclusive(async () => {
        const data = {};
        const idsToFetch = [];
        for (const id of ids) {
          const item = await cache.get(getUniqueId(type, id));
          if (typeof item !== "undefined") {
            data[id] = item;
          } else {
            idsToFetch.push(id);
          }
        }
        if (idsToFetch.length) {
          logger === null || logger === void 0
            ? void 0
            : logger.trace({ items: idsToFetch.length }, "loading from store");
          const fetched = await store.get(type, idsToFetch);
          for (const id of idsToFetch) {
            const item = fetched[id];
            if (item) {
              data[id] = item;
              cache.set(getUniqueId(type, id), item);
            }
          }
        }
        return data;
      });
    },
    async set(data) {
      return cacheMutex.runExclusive(async () => {
        let keys = 0;
        for (const type in data) {
          for (const id in data[type]) {
            await cache.set(getUniqueId(type, id), data[type][id]);
            keys += 1;
          }
        }
        logger === null || logger === void 0
          ? void 0
          : logger.trace({ keys }, "updated cache");
        await store.set(data);
      });
    },
    async clear() {
      var _a;
      await cache.flushAll();
      await ((_a = store.clear) === null || _a === void 0
        ? void 0
        : _a.call(store));
    },
  };
}
/**
 * Adds DB-like transaction capability to the SignalKeyStore
 * Uses AsyncLocalStorage for automatic context management
 * @param state the key store to apply this capability to
 * @param logger logger to log events
 * @returns SignalKeyStore with transaction capability
 */
const addTransactionCapability = (
  state,
  logger,
  { maxCommitRetries, delayBetweenTriesMs },
) => {
  const txStorage = new async_hooks_1.AsyncLocalStorage();
  // Queues for concurrency control
  const keyQueues = new Map();
  const txMutexes = new Map();
  // Pre-key manager for specialized operations
  const preKeyManager = new pre_key_manager_1.PreKeyManager(state, logger);
  /**
   * Get or create a queue for a specific key type
   */
  function getQueue(key) {
    if (!keyQueues.has(key)) {
      keyQueues.set(key, new p_queue_1.default({ concurrency: 1 }));
    }
    return keyQueues.get(key);
  }
  /**
   * Get or create a transaction mutex
   */
  function getTxMutex(key) {
    if (!txMutexes.has(key)) {
      txMutexes.set(key, new async_mutex_1.Mutex());
    }
    return txMutexes.get(key);
  }
  /**
   * Check if currently in a transaction
   */
  function isInTransaction() {
    return !!txStorage.getStore();
  }
  /**
   * Commit transaction with retries
   */
  async function commitWithRetry(mutations) {
    if (Object.keys(mutations).length === 0) {
      logger.trace("no mutations in transaction");
      return;
    }
    logger.trace("committing transaction");
    for (let attempt = 0; attempt < maxCommitRetries; attempt++) {
      try {
        await state.set(mutations);
        logger.trace(
          { mutationCount: Object.keys(mutations).length },
          "committed transaction",
        );
        return;
      } catch (error) {
        const retriesLeft = maxCommitRetries - attempt - 1;
        logger.warn(`failed to commit mutations, retries left=${retriesLeft}`);
        if (retriesLeft === 0) {
          throw error;
        }
        await (0, generics_1.delay)(delayBetweenTriesMs);
      }
    }
  }
  return {
    get: async (type, ids) => {
      var _a;
      const ctx = txStorage.getStore();
      if (!ctx) {
        // No transaction - direct read without exclusive lock for concurrency
        return state.get(type, ids);
      }
      // In transaction - check cache first
      const cached = ctx.cache[type] || {};
      const missing = ids.filter((id) => !(id in cached));
      if (missing.length > 0) {
        ctx.dbQueries++;
        logger.trace(
          { type, count: missing.length },
          "fetching missing keys in transaction",
        );
        const fetched = await getTxMutex(type).runExclusive(() =>
          state.get(type, missing),
        );
        // Update cache
        ctx.cache[type] = ctx.cache[type] || {};
        Object.assign(ctx.cache[type], fetched);
      }
      // Return requested ids from cache
      const result = {};
      for (const id of ids) {
        const value =
          (_a = ctx.cache[type]) === null || _a === void 0 ? void 0 : _a[id];
        if (value !== undefined && value !== null) {
          result[id] = value;
        }
      }
      return result;
    },
    set: async (data) => {
      const ctx = txStorage.getStore();
      if (!ctx) {
        // No transaction - direct write with queue protection
        const types = Object.keys(data);
        // Process pre-keys with validation
        for (const type_ of types) {
          const type = type_;
          if (type === "pre-key") {
            await preKeyManager.validateDeletions(data, type);
          }
        }
        // Write all data in parallel
        await Promise.all(
          types.map((type) =>
            getQueue(type).add(async () => {
              const typeData = { [type]: data[type] };
              await state.set(typeData);
            }),
          ),
        );
        return;
      }
      // In transaction - update cache and mutations
      logger.trace({ types: Object.keys(data) }, "caching in transaction");
      for (const key_ in data) {
        const key = key_;
        // Ensure structures exist
        ctx.cache[key] = ctx.cache[key] || {};
        ctx.mutations[key] = ctx.mutations[key] || {};
        // Special handling for pre-keys
        if (key === "pre-key") {
          await preKeyManager.processOperations(
            data,
            key,
            ctx.cache,
            ctx.mutations,
            true,
          );
        } else {
          // Normal key types
          Object.assign(ctx.cache[key], data[key]);
          Object.assign(ctx.mutations[key], data[key]);
        }
      }
    },
    isInTransaction,
    transaction: async (work, key) => {
      const existing = txStorage.getStore();
      // Nested transaction - reuse existing context
      if (existing) {
        logger.trace("reusing existing transaction context");
        return work();
      }
      // New transaction - acquire mutex and create context
      return getTxMutex(key).runExclusive(async () => {
        const ctx = {
          cache: {},
          mutations: {},
          dbQueries: 0,
        };
        logger.trace("entering transaction");
        try {
          const result = await txStorage.run(ctx, work);
          // Commit mutations
          await commitWithRetry(ctx.mutations);
          logger.trace({ dbQueries: ctx.dbQueries }, "transaction completed");
          return result;
        } catch (error) {
          logger.error({ error }, "transaction failed, rolling back");
          throw error;
        }
      });
    },
  };
};
exports.addTransactionCapability = addTransactionCapability;
const initAuthCreds = () => {
  const identityKey = crypto_2.Curve.generateKeyPair();
  return {
    noiseKey: crypto_2.Curve.generateKeyPair(),
    pairingEphemeralKeyPair: crypto_2.Curve.generateKeyPair(),
    signedIdentityKey: identityKey,
    signedPreKey: (0, crypto_2.signedKeyPair)(identityKey, 1),
    registrationId: (0, generics_1.generateRegistrationId)(),
    advSecretKey: (0, crypto_1.randomBytes)(32).toString("base64"),
    processedHistoryMessages: [],
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    accountSyncCounter: 0,
    accountSettings: {
      unarchiveChats: false,
    },
    deviceId: Buffer.from((0, uuid_1.v4)().replace(/-/g, ""), "hex").toString(
      "base64url",
    ),
    phoneId: (0, uuid_1.v4)(),
    identityId: (0, crypto_1.randomBytes)(20),
    backupToken: (0, crypto_1.randomBytes)(20),
    registration: {},
    registered: false,
    pairingCode: undefined,
    lastPropHash: undefined,
    routingInfo: undefined,
    additionalData: undefined,
  };
};
exports.initAuthCreds = initAuthCreds;
