import type { WaCreateStoreOptions, WaCreateStoreOptionsStrictFor, WaStore, WaStoreBackendMap } from './types';
/**
 * Builds a {@link WaStore} from the configured providers/backends. Each call
 * to `store.session(sessionId)` returns a cached, lock-wrapped per-domain
 * store bundle for that session. Cache domains default to bounded memory
 * with the TTLs in `options.memory.cacheTtlMs`.
 *
 * **Defaults policy:**
 * - With `backends` empty (or absent), every domain falls back to memory
 *   (mailbox domains to `'none'`). The session lives only in memory and the
 *   device re-pairs on every restart.
 * - With `backends` set, **every persistence domain must be assigned
 *   explicitly** in `providers` (auth/signal/preKey/session/identity/
 *   senderKey/appState/privacyToken/messages/threads/contacts). The factory
 *   throws listing the missing keys. Pass `'memory'` to keep the in-tree
 *   memory provider for that domain, `'none'` to skip it, or the backend
 *   name to persist. Cache domains (retry/groupMetadata/deviceList/
 *   messageSecret) stay opt-in and default to memory - they are small,
 *   hot, and cheap to rebuild.
 *
 * **Domain coverage:** the backend map is inferred, so each domain only
 * accepts the backends whose bundle actually declares it. A backend that
 * covers part of the matrix (`WaStoreBackend<'auth', never>`, say) can only
 * be named on the domains it implements - the rest fall back to `'memory'`
 * / `'none'`, checked by the compiler rather than by the
 * `backend '<name>' does not provide <kind>.<domain>` throw on first
 * `session()`.
 *
 * @example
 * ```ts
 * // Persistent setup with @zapo-js/store-sqlite (recommended for production)
 * import { createSqliteStore } from '@zapo-js/store-sqlite'
 * import { createStore } from '..'
 *
 * const store = createStore({
 *     backends: { sqlite: createSqliteStore({ path: '.auth/state.sqlite' }) },
 *     providers: {
 *         auth: 'sqlite',
 *         signal: 'sqlite',
 *         preKey: 'sqlite',
 *         session: 'sqlite',
 *         identity: 'sqlite',
 *         senderKey: 'sqlite',
 *         appState: 'sqlite',
 *         privacyToken: 'sqlite',
 *         messages: 'sqlite',   // 'none' to skip the message archive
 *         threads: 'sqlite',    // 'none' to skip
 *         contacts: 'sqlite'    // 'none' to skip
 *     }
 *     // cacheProviders omitted - retry/groupMetadata/deviceList/
 *     // messageSecret default to memory
 * })
 *
 * // Memory-only (tests / ephemeral sessions - credentials lost on restart)
 * const memStore = createStore({})
 * ```
 */
export declare function createStore(options?: Omit<WaCreateStoreOptions<never>, 'backends' | 'providers'> & {
    readonly backends?: undefined;
    readonly providers?: undefined;
}): WaStore;
export declare function createStore<TBackends extends WaStoreBackendMap>(options: WaCreateStoreOptionsStrictFor<TBackends>): WaStore;
