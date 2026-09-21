"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaReceiptQueue = void 0;
const constants_1 = require("../../protocol/constants");
class WaReceiptQueue {
    constructor(options = {}) {
        this.maxSize = options.maxSize ?? constants_1.WA_DEFAULTS.MAX_DANGLING_RECEIPTS;
        this.danglingReceipts = [];
        this.danglingHead = 0;
    }
    shouldQueue(node, error) {
        if (node.tag !== constants_1.WA_MESSAGE_TAGS.RECEIPT) {
            return false;
        }
        const normalized = error.message.trim().toLowerCase();
        return (normalized === 'comms is not connected' ||
            normalized === 'websocket is not connected' ||
            normalized === 'noise session socket closed' ||
            normalized.startsWith('socket closed ('));
    }
    enqueue(node) {
        if (this.maxSize <= 0) {
            return;
        }
        if (this.size() >= this.maxSize) {
            this.danglingHead += 1;
        }
        if (this.danglingHead > 64 && this.danglingHead * 2 >= this.danglingReceipts.length) {
            const live = this.danglingReceipts.length - this.danglingHead;
            this.danglingReceipts.copyWithin(0, this.danglingHead);
            this.danglingReceipts.length = live;
            this.danglingHead = 0;
        }
        this.danglingReceipts.push(node);
    }
    take() {
        if (this.danglingHead >= this.danglingReceipts.length) {
            this.danglingReceipts.length = 0;
            this.danglingHead = 0;
            return [];
        }
        const out = this.danglingReceipts.slice(this.danglingHead);
        this.danglingReceipts.length = 0;
        this.danglingHead = 0;
        return out;
    }
    size() {
        return this.danglingReceipts.length - this.danglingHead;
    }
}
exports.WaReceiptQueue = WaReceiptQueue;
