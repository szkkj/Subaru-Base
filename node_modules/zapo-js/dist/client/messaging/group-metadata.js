"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupMetadataCache = createGroupMetadataCache;
const PromiseDedup_1 = require("../../infra/perf/PromiseDedup");
const jid_1 = require("../../protocol/jid");
const primitives_1 = require("../../util/primitives");
function createGroupMetadataCache(options) {
    const { groupMetadataStore, queryGroupMetadata, logger } = options;
    const dedup = new PromiseDedup_1.PromiseDedup();
    const pendingMutations = new Map();
    const sanitizeParticipantUsers = (participants) => {
        const deduped = new Set();
        for (const participant of participants) {
            if (!participant || !participant.includes('@')) {
                continue;
            }
            try {
                deduped.add((0, jid_1.toUserJid)(participant));
            }
            catch (error) {
                logger.trace('ignoring malformed participant jid', {
                    participant,
                    message: (0, primitives_1.toError)(error).message
                });
            }
        }
        return [...deduped];
    };
    const areParticipantListsEqual = (left, right) => {
        if (left.length !== right.length) {
            return false;
        }
        for (let index = 0; index < left.length; index += 1) {
            if (left[index] !== right[index]) {
                return false;
            }
        }
        return true;
    };
    const upsertParticipants = async (cached, groupJid, participants) => {
        await groupMetadataStore.upsertGroupMetadata({
            groupJid,
            participants,
            ephemeral: cached?.ephemeral,
            ephemeralTrigger: cached?.ephemeralTrigger,
            updatedAtMs: Date.now()
        });
    };
    const mergeParticipantUsersIntoCache = async (groupJid, cached, participantsToAdd) => {
        if (participantsToAdd.length === 0) {
            return;
        }
        const cachedParticipants = cached.participants;
        const nextParticipants = [...cachedParticipants];
        const existing = new Set(cachedParticipants);
        for (const participant of participantsToAdd) {
            if (existing.has(participant)) {
                continue;
            }
            existing.add(participant);
            nextParticipants.push(participant);
        }
        if (nextParticipants.length === cachedParticipants.length) {
            return;
        }
        await upsertParticipants(cached, groupJid, nextParticipants);
    };
    const removeParticipantUsersFromCache = async (groupJid, cached, participantsToRemove) => {
        if (participantsToRemove.length === 0) {
            return;
        }
        const removed = new Set(participantsToRemove);
        const cachedParticipants = cached.participants;
        const nextParticipants = cachedParticipants.filter((participant) => !removed.has(participant));
        if (nextParticipants.length === cachedParticipants.length) {
            return;
        }
        if (nextParticipants.length === 0) {
            await groupMetadataStore.deleteGroupMetadata(groupJid);
            return;
        }
        await upsertParticipants(cached, groupJid, nextParticipants);
    };
    const replaceParticipantUsersInCache = async (groupJid, cached, participantsToReplace, replacementParticipants) => {
        const toReplace = new Set(participantsToReplace);
        const cachedParticipants = cached.participants;
        const nextParticipants = cachedParticipants.filter((participant) => !toReplace.has(participant));
        const existing = new Set(nextParticipants);
        for (const participant of replacementParticipants) {
            if (existing.has(participant)) {
                continue;
            }
            existing.add(participant);
            nextParticipants.push(participant);
        }
        if (areParticipantListsEqual(cachedParticipants, nextParticipants)) {
            return;
        }
        if (nextParticipants.length === 0) {
            await groupMetadataStore.deleteGroupMetadata(groupJid);
            return;
        }
        await upsertParticipants(cached, groupJid, nextParticipants);
    };
    const resolveGroupJidForGroupCacheEvent = (event) => {
        if (event.action === 'linked_group_promote' || event.action === 'linked_group_demote') {
            return event.contextGroupJid ?? event.groupJid ?? null;
        }
        return event.groupJid ?? null;
    };
    const extractParticipantUsersFromGroupEvent = (event) => {
        const candidates = [];
        for (const participant of event.participants ?? []) {
            const canonical = participant.jid ?? participant.lidJid ?? participant.phoneJid;
            if (canonical) {
                candidates.push(canonical);
            }
        }
        return sanitizeParticipantUsers(candidates);
    };
    const refreshParticipantUsers = (groupJid) => dedup.run(`refresh:${groupJid}`, async () => {
        const queried = await queryGroupMetadata(groupJid);
        const participants = sanitizeParticipantUsers(queried.participants);
        await groupMetadataStore.upsertGroupMetadata({
            groupJid,
            participants,
            ephemeral: queried.ephemeral,
            ephemeralTrigger: queried.ephemeralTrigger,
            updatedAtMs: Date.now()
        });
        return participants;
    });
    const resolveParticipantUsers = (groupJid) => dedup.run(`resolve:${groupJid}`, async () => {
        await pendingMutations.get(groupJid)?.catch(() => undefined);
        const cached = await groupMetadataStore.getGroupMetadata(groupJid);
        if (cached && cached.participants.length > 0) {
            return sanitizeParticipantUsers(cached.participants);
        }
        return refreshParticipantUsers(groupJid);
    });
    const getEphemeral = async (groupJid) => {
        const cached = await groupMetadataStore.getGroupMetadata(groupJid);
        return cached?.ephemeral ?? null;
    };
    const resolveEphemeralSettings = async (groupJid) => {
        let cached = await groupMetadataStore.getGroupMetadata(groupJid);
        if (!cached) {
            await refreshParticipantUsers(groupJid);
            cached = await groupMetadataStore.getGroupMetadata(groupJid);
        }
        const expirationSeconds = cached?.ephemeral;
        if (expirationSeconds === undefined || expirationSeconds <= 0) {
            return null;
        }
        return {
            expirationSeconds,
            ...(cached?.ephemeralTrigger !== undefined ? { trigger: cached.ephemeralTrigger } : {})
        };
    };
    const resolveEphemeral = async (groupJid) => (await resolveEphemeralSettings(groupJid))?.expirationSeconds ?? null;
    const applyGroupEvent = async (event) => {
        const groupJid = resolveGroupJidForGroupCacheEvent(event);
        if (!groupJid) {
            return;
        }
        if (event.action === 'delete') {
            await groupMetadataStore.deleteGroupMetadata(groupJid);
            return;
        }
        if (event.action === 'ephemeral') {
            const cached = await groupMetadataStore.getGroupMetadata(groupJid);
            if (!cached) {
                return;
            }
            const nextEphemeral = event.expirationSeconds;
            const parsedTrigger = event.mode === undefined ? undefined : Number(event.mode);
            const nextTrigger = parsedTrigger !== undefined && Number.isFinite(parsedTrigger)
                ? parsedTrigger
                : cached.ephemeralTrigger;
            if (cached.ephemeral === nextEphemeral && cached.ephemeralTrigger === nextTrigger) {
                return;
            }
            await groupMetadataStore.upsertGroupMetadata({
                groupJid,
                participants: cached.participants,
                ephemeral: nextEphemeral,
                ephemeralTrigger: nextTrigger,
                updatedAtMs: Date.now()
            });
            return;
        }
        const participantUsers = extractParticipantUsersFromGroupEvent(event);
        if (event.action === 'create') {
            if (participantUsers.length === 0) {
                return;
            }
            const existing = await groupMetadataStore.getGroupMetadata(groupJid);
            await groupMetadataStore.upsertGroupMetadata({
                groupJid,
                participants: participantUsers,
                ephemeral: existing?.ephemeral,
                ephemeralTrigger: existing?.ephemeralTrigger,
                updatedAtMs: Date.now()
            });
            return;
        }
        const cached = await groupMetadataStore.getGroupMetadata(groupJid);
        if (!cached || cached.participants.length === 0) {
            return;
        }
        const cachedParticipants = sanitizeParticipantUsers(cached.participants);
        if (cachedParticipants.length === 0) {
            return;
        }
        const cachedWithSanitized = {
            ...cached,
            participants: cachedParticipants
        };
        if (event.action === 'add' ||
            event.action === 'promote' ||
            event.action === 'demote' ||
            event.action === 'linked_group_promote' ||
            event.action === 'linked_group_demote') {
            await mergeParticipantUsersIntoCache(groupJid, cachedWithSanitized, participantUsers);
            return;
        }
        if (event.action === 'remove') {
            await removeParticipantUsersFromCache(groupJid, cachedWithSanitized, participantUsers);
            return;
        }
        if (event.action === 'modify') {
            const authorUsers = event.authorJid ? sanitizeParticipantUsers([event.authorJid]) : [];
            await replaceParticipantUsersInCache(groupJid, cachedWithSanitized, authorUsers, participantUsers);
        }
    };
    const mutateFromGroupEvent = (event) => {
        const groupJid = resolveGroupJidForGroupCacheEvent(event);
        if (!groupJid) {
            return applyGroupEvent(event);
        }
        const prev = pendingMutations.get(groupJid) ?? Promise.resolve();
        const next = prev.then(() => applyGroupEvent(event), () => applyGroupEvent(event));
        pendingMutations.set(groupJid, next);
        return next.finally(() => {
            if (pendingMutations.get(groupJid) === next) {
                pendingMutations.delete(groupJid);
            }
        });
    };
    return {
        resolveParticipantUsers,
        refreshParticipantUsers,
        getEphemeral,
        resolveEphemeral,
        resolveEphemeralSettings,
        mutateFromGroupEvent
    };
}
