"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIDMappingStore = void 0;
const lru_cache_1 = require("lru-cache");
const WABinary_1 = require("../WABinary");
class LIDMappingStore {
  constructor(keys, logger, pnToLIDFunc) {
    this.mappingCache = new lru_cache_1.LRUCache({
      ttl: 3 * 24 * 60 * 60 * 1000, // 7 days
      ttlAutopurge: true,
      updateAgeOnGet: true,
    });
    this.keys = keys;
    this.pnToLIDFunc = pnToLIDFunc;
    this.logger = logger;
  }
  /**
   * Store LID-PN mapping - USER LEVEL
   */
  async storeLIDPNMappings(pairs) {
    // Validate inputs
    const pairMap = {};
    for (const { lid, pn } of pairs) {
      if (
        !(
          ((0, WABinary_1.isLidUser)(lid) && (0, WABinary_1.isPnUser)(pn)) ||
          ((0, WABinary_1.isPnUser)(lid) && (0, WABinary_1.isLidUser)(pn))
        )
      ) {
        this.logger.warn(`Invalid LID-PN mapping: ${lid}, ${pn}`);
        continue;
      }
      const lidDecoded = (0, WABinary_1.jidDecode)(lid);
      const pnDecoded = (0, WABinary_1.jidDecode)(pn);
      if (!lidDecoded || !pnDecoded) return;
      const pnUser = pnDecoded.user;
      const lidUser = lidDecoded.user;
      let existingLidUser = this.mappingCache.get(`pn:${pnUser}`);
      if (!existingLidUser) {
        this.logger.trace(
          `Cache miss for PN user ${pnUser}; checking database`,
        );
        const stored = await this.keys.get("lid-mapping", [pnUser]);
        existingLidUser = stored[pnUser];
        if (existingLidUser) {
          // Update cache with database value
          this.mappingCache.set(`pn:${pnUser}`, existingLidUser);
          this.mappingCache.set(`lid:${existingLidUser}`, pnUser);
        }
      }
      if (existingLidUser === lidUser) {
        this.logger.debug(
          { pnUser, lidUser },
          "LID mapping already exists, skipping",
        );
        continue;
      }
      pairMap[pnUser] = lidUser;
    }
    this.logger.trace(
      { pairMap },
      `Storing ${Object.keys(pairMap).length} pn mappings`,
    );
    await this.keys.transaction(async () => {
      for (const [pnUser, lidUser] of Object.entries(pairMap)) {
        await this.keys.set({
          "lid-mapping": {
            [pnUser]: lidUser,
            [`${lidUser}_reverse`]: pnUser,
          },
        });
        this.mappingCache.set(`pn:${pnUser}`, lidUser);
        this.mappingCache.set(`lid:${lidUser}`, pnUser);
      }
    }, "lid-mapping");
  }
  /**
   * Get LID for PN - Returns device-specific LID based on user mapping
   */
  async getLIDForPN(pn) {
    var _a, _b;
    return (
      ((_b =
        (_a = await this.getLIDsForPNs([pn])) === null || _a === void 0
          ? void 0
          : _a[0]) === null || _b === void 0
        ? void 0
        : _b.lid) || null
    );
  }
  async getLIDsForPNs(pns) {
    var _a, _b, _c;
    const usyncFetch = {};
    // mapped from pn to lid mapping to prevent duplication in results later
    const successfulPairs = {};
    for (const pn of pns) {
      if (!(0, WABinary_1.isPnUser)(pn) && !(0, WABinary_1.isHostedPnUser)(pn))
        continue;
      const decoded = (0, WABinary_1.jidDecode)(pn);
      if (!decoded) continue;
      // Check cache first for PN → LID mapping
      const pnUser = decoded.user;
      let lidUser = this.mappingCache.get(`pn:${pnUser}`);
      if (!lidUser) {
        // Cache miss - check database
        const stored = await this.keys.get("lid-mapping", [pnUser]);
        lidUser = stored[pnUser];
        if (lidUser) {
          this.mappingCache.set(`pn:${pnUser}`, lidUser);
          this.mappingCache.set(`lid:${lidUser}`, pnUser);
        } else {
          this.logger.trace(
            `No LID mapping found for PN user ${pnUser}; batch getting from USync`,
          );
          const device = decoded.device || 0;
          let normalizedPn = (0, WABinary_1.jidNormalizedUser)(pn);
          if ((0, WABinary_1.isHostedPnUser)(normalizedPn)) {
            normalizedPn = `${pnUser}@s.whatsapp.net`;
          }
          if (!usyncFetch[normalizedPn]) {
            usyncFetch[normalizedPn] = [device];
          } else {
            (_a = usyncFetch[normalizedPn]) === null || _a === void 0
              ? void 0
              : _a.push(device);
          }
          continue;
        }
      }
      lidUser = lidUser.toString();
      if (!lidUser) {
        this.logger.warn(
          `Invalid or empty LID user for PN ${pn}: lidUser = "${lidUser}"`,
        );
        return null;
      }
      // Push the PN device ID to the LID to maintain device separation
      const pnDevice = decoded.device !== undefined ? decoded.device : 0;
      const deviceSpecificLid = `${lidUser}${!!pnDevice ? `:${pnDevice}` : ``}@${decoded.server === "hosted" ? "hosted.lid" : "lid"}`;
      this.logger.trace(
        `getLIDForPN: ${pn} → ${deviceSpecificLid} (user mapping with device ${pnDevice})`,
      );
      successfulPairs[pn] = { lid: deviceSpecificLid, pn };
    }
    if (Object.keys(usyncFetch).length > 0) {
      const result = await ((_b = this.pnToLIDFunc) === null || _b === void 0
        ? void 0
        : _b.call(this, Object.keys(usyncFetch))); // this function already adds LIDs to mapping
      if (result && result.length > 0) {
        this.storeLIDPNMappings(result);
        for (const pair of result) {
          const pnDecoded = (0, WABinary_1.jidDecode)(pair.pn);
          const pnUser =
            pnDecoded === null || pnDecoded === void 0
              ? void 0
              : pnDecoded.user;
          if (!pnUser) continue;
          const lidUser =
            (_c = (0, WABinary_1.jidDecode)(pair.lid)) === null || _c === void 0
              ? void 0
              : _c.user;
          if (!lidUser) continue;
          for (const device of usyncFetch[pair.pn]) {
            const deviceSpecificLid = `${lidUser}${!!device ? `:${device}` : ``}@${device === 99 ? "hosted.lid" : "lid"}`;
            this.logger.trace(
              `getLIDForPN: USYNC success for ${pair.pn} → ${deviceSpecificLid} (user mapping with device ${device})`,
            );
            const deviceSpecificPn = `${pnUser}${!!device ? `:${device}` : ``}@${device === 99 ? "hosted" : "s.whatsapp.net"}`;
            successfulPairs[deviceSpecificPn] = {
              lid: deviceSpecificLid,
              pn: deviceSpecificPn,
            };
          }
        }
      } else {
        return null;
      }
    }
    return Object.values(successfulPairs);
  }
  /**
   * Get PN for LID - USER LEVEL with device construction
   */
  async getPNForLID(lid) {
    if (!(0, WABinary_1.isLidUser)(lid)) return null;
    const decoded = (0, WABinary_1.jidDecode)(lid);
    if (!decoded) return null;
    // Check cache first for LID → PN mapping
    const lidUser = decoded.user;
    let pnUser = this.mappingCache.get(`lid:${lidUser}`);
    if (!pnUser || typeof pnUser !== "string") {
      // Cache miss - check database
      const stored = await this.keys.get("lid-mapping", [`${lidUser}_reverse`]);
      pnUser = stored[`${lidUser}_reverse`];
      if (!pnUser || typeof pnUser !== "string") {
        this.logger.trace(`No reverse mapping found for LID user: ${lidUser}`);
        return null;
      }
      this.mappingCache.set(`lid:${lidUser}`, pnUser);
    }
    // Construct device-specific PN JID
    const lidDevice = decoded.device !== undefined ? decoded.device : 0;
    const pnJid = `${pnUser}:${lidDevice}@${decoded.domainType === WABinary_1.WAJIDDomains.HOSTED_LID ? "hosted" : "s.whatsapp.net"}`;
    this.logger.trace(`Found reverse mapping: ${lid} → ${pnJid}`);
    return pnJid;
  }
}
exports.LIDMappingStore = LIDMappingStore;
