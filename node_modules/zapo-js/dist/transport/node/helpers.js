"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeChildren = getNodeChildren;
exports.findNodeChild = findNodeChild;
exports.getFirstNodeChild = getFirstNodeChild;
exports.getNodeChildrenByTag = getNodeChildrenByTag;
exports.getNodeChildrenByTagFromChildren = getNodeChildrenByTagFromChildren;
exports.getNodeChildrenTags = getNodeChildrenTags;
exports.getNodeChildrenNonEmptyAttrValuesByTag = getNodeChildrenNonEmptyAttrValuesByTag;
exports.getNodeChildrenNonEmptyUtf8ByTag = getNodeChildrenNonEmptyUtf8ByTag;
exports.findNodeChildrenByTags = findNodeChildrenByTags;
exports.hasNodeChild = hasNodeChild;
exports.decodeNodeContentUtf8OrBytes = decodeNodeContentUtf8OrBytes;
exports.getNodeTextContent = getNodeTextContent;
exports.getNodeBytesContent = getNodeBytesContent;
exports.decodeNodeContentBase64OrBytes = decodeNodeContentBase64OrBytes;
exports.createNodeIdGenerator = createNodeIdGenerator;
exports.createMobileNodeIdGenerator = createMobileNodeIdGenerator;
const _crypto_1 = require("../../crypto");
const bytes_1 = require("../../util/bytes");
const EMPTY_NODE_CHILDREN = Object.freeze([]);
const EMPTY_NODE_TAGS = Object.freeze([]);
const EMPTY_NODE_VALUES = Object.freeze([]);
const NODE_ID_PREFIX_SEED = new Uint8Array(4);
function getNodeChildren(node) {
    return Array.isArray(node.content) ? node.content : EMPTY_NODE_CHILDREN;
}
function findNodeChild(node, tag) {
    const content = node.content;
    if (!Array.isArray(content))
        return undefined;
    for (let i = 0; i < content.length; i++) {
        if (content[i].tag === tag)
            return content[i];
    }
}
function getFirstNodeChild(node) {
    return getNodeChildren(node)[0];
}
function getNodeChildrenByTag(node, tag) {
    const content = node.content;
    if (!Array.isArray(content))
        return EMPTY_NODE_CHILDREN;
    let tagged = null;
    for (let i = 0; i < content.length; i++) {
        if (content[i].tag !== tag)
            continue;
        if (!tagged)
            tagged = [];
        tagged.push(content[i]);
    }
    return tagged ?? EMPTY_NODE_CHILDREN;
}
function getNodeChildrenByTagFromChildren(node, tag) {
    let tagged = null;
    const content = node.content;
    if (!Array.isArray(content))
        return EMPTY_NODE_CHILDREN;
    for (let i = 0; i < content.length; i += 1) {
        const nested = content[i].content;
        if (!Array.isArray(nested))
            continue;
        for (let j = 0; j < nested.length; j += 1) {
            if (nested[j].tag !== tag)
                continue;
            if (!tagged)
                tagged = [];
            tagged.push(nested[j]);
        }
    }
    return tagged ?? EMPTY_NODE_CHILDREN;
}
function getNodeChildrenTags(node) {
    const content = node.content;
    if (!Array.isArray(content) || content.length === 0)
        return EMPTY_NODE_TAGS;
    const tags = new Array(content.length);
    for (let i = 0; i < content.length; i += 1) {
        tags[i] = content[i].tag;
    }
    return tags;
}
function getNodeChildrenNonEmptyAttrValuesByTag(node, tag, attr) {
    let values = null;
    const children = getNodeChildren(node);
    for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (child.tag !== tag) {
            continue;
        }
        const value = child.attrs[attr];
        if (!value) {
            continue;
        }
        if (!values) {
            values = [];
        }
        values.push(value);
    }
    return values ?? EMPTY_NODE_VALUES;
}
function getNodeChildrenNonEmptyUtf8ByTag(node, tag, field) {
    let values = null;
    const children = getNodeChildren(node);
    for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (child.tag !== tag) {
            continue;
        }
        const raw = child.content;
        if (raw === null || raw === undefined) {
            continue;
        }
        if (raw instanceof Uint8Array && raw.length === 0) {
            continue;
        }
        const value = bytes_1.TEXT_DECODER.decode(decodeNodeContentUtf8OrBytes(raw, field));
        if (value.length === 0) {
            continue;
        }
        if (!values) {
            values = [];
        }
        values.push(value);
    }
    return values ?? EMPTY_NODE_VALUES;
}
function findNodeChildrenByTags(node, tags) {
    const out = new Array(tags.length);
    for (let index = 0; index < tags.length; index += 1) {
        out[index] = findNodeChild(node, tags[index]);
    }
    return out;
}
function hasNodeChild(node, tag) {
    return findNodeChild(node, tag) !== undefined;
}
function decodeNodeContentUtf8OrBytes(value, field) {
    if (value instanceof Uint8Array) {
        return value;
    }
    if (typeof value === 'string') {
        return bytes_1.TEXT_ENCODER.encode(value);
    }
    throw new Error(`node ${field} has no binary content`);
}
function getNodeTextContent(node) {
    if (!node)
        return undefined;
    const content = node.content;
    if (content instanceof Uint8Array)
        return bytes_1.TEXT_DECODER.decode(content);
    if (typeof content === 'string')
        return content;
    return undefined;
}
/**
 * Binary counterpart of {@link getNodeTextContent}: the node's raw bytes, or
 * `undefined` when it is missing or carries children/text instead. Empty
 * content comes back as a zero-length view, mirroring the empty string
 * {@link getNodeTextContent} returns - check `byteLength` when that matters.
 */
function getNodeBytesContent(node) {
    return node?.content instanceof Uint8Array ? node.content : undefined;
}
function decodeNodeContentBase64OrBytes(value, field) {
    if (value === null || value === undefined) {
        throw new Error(`missing binary node content for ${field}`);
    }
    if (typeof value === 'string') {
        return (0, bytes_1.base64ToBytesChecked)(value, field);
    }
    if (value instanceof Uint8Array) {
        return value;
    }
    throw new Error(`missing binary node content for ${field}`);
}
function formatNodeIdPrefixFromSeed(seed) {
    const left = ((seed[0] << 8) | seed[1]) >>> 0;
    const right = ((seed[2] << 8) | seed[3]) >>> 0;
    return `${left}.${right}-`;
}
async function createNodeIdGenerator() {
    await (0, _crypto_1.randomFillAsync)(NODE_ID_PREFIX_SEED);
    const prefix = formatNodeIdPrefixFromSeed(NODE_ID_PREFIX_SEED);
    let counter = 0;
    return {
        prefix,
        next() {
            counter += 1;
            return `${prefix}${counter}`;
        }
    };
}
function createMobileNodeIdGenerator() {
    let featureCounter = 0;
    let systemCounter = 0;
    return {
        prefix: '0',
        next() {
            const id = `0${featureCounter.toString(16)}`;
            featureCounter = (featureCounter + 1) & 0xffff;
            return id;
        },
        nextSystem() {
            systemCounter = (systemCounter + 1) & 0xffff;
            return systemCounter.toString(16);
        }
    };
}
