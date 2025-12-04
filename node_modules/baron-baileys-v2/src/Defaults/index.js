"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CACHE_TTLS =
  exports.MIN_UPLOAD_INTERVAL =
  exports.UPLOAD_TIMEOUT =
  exports.INITIAL_PREKEY_COUNT =
  exports.MIN_PREKEY_COUNT =
  exports.MEDIA_KEYS =
  exports.MEDIA_HKDF_KEY_MAPPING =
  exports.MEDIA_PATH_MAP =
  exports.DEFAULT_CONNECTION_CONFIG =
  exports.PROCESSABLE_HISTORY_TYPES =
  exports.WA_CERT_DETAILS =
  exports.URL_REGEX =
  exports.NOISE_WA_HEADER =
  exports.KEY_BUNDLE_TYPE =
  exports.DICT_VERSION =
  exports.NOISE_MODE =
  exports.WA_DEFAULT_EPHEMERAL =
  exports.WA_ADV_HOSTED_DEVICE_SIG_PREFIX =
  exports.WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX =
  exports.WA_ADV_DEVICE_SIG_PREFIX =
  exports.WA_ADV_ACCOUNT_SIG_PREFIX =
  exports.PHONE_CONNECTION_CB =
  exports.DEF_TAG_PREFIX =
  exports.DEF_CALLBACK_PREFIX =
  exports.CALL_AUDIO_PREFIX =
  exports.CALL_VIDEO_PREFIX =
  exports.DEFAULT_ORIGIN =
  exports.UNAUTHORIZED_CODES =
    void 0;
const index_js_1 = require("../../WAProto/index.js");
const libsignal_1 = require("../Signal/libsignal");
const browser_utils_1 = require("../Utils/browser-utils");
const logger_1 = __importDefault(require("../Utils/logger"));
const { createHash } = require("crypto");
const phonenumberMcc = require("./phonenumber-mcc.json");
exports.PHONENUMBER_MCC = require("./phonenumber-mcc.json");
const version = [2, 3000, 1030215530]; // WA Web version
exports.VERSION = version;
exports.UNAUTHORIZED_CODES = [401, 403, 419];
exports.DEFAULT_ORIGIN = "https://web.whatsapp.com";
exports.CALL_VIDEO_PREFIX = "https://call.whatsapp.com/video/";
exports.CALL_AUDIO_PREFIX = "https://call.whatsapp.com/voice/";
exports.DEF_CALLBACK_PREFIX = "CB:";
exports.DEF_TAG_PREFIX = "TAG:";
exports.PHONE_CONNECTION_CB = "CB:Pong";
exports.WA_ADV_ACCOUNT_SIG_PREFIX = Buffer.from([6, 0]);
exports.WA_ADV_DEVICE_SIG_PREFIX = Buffer.from([6, 1]);
exports.WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX = Buffer.from([6, 5]);
exports.WA_ADV_HOSTED_DEVICE_SIG_PREFIX = Buffer.from([6, 6]);
exports.WA_DEFAULT_EPHEMERAL = 7 * 24 * 60 * 60;
exports.NOISE_MODE = "Noise_XX_25519_AESGCM_SHA256\0\0\0\0";
exports.DICT_VERSION = 3;
exports.KEY_BUNDLE_TYPE = Buffer.from([5]);
exports.NOISE_WA_HEADER = Buffer.from([87, 65, 6, exports.DICT_VERSION]); // last is "DICT_VERSION"
//=======================================================//
exports.MOBILE_NOISE_HEADER = Buffer.concat([
  Buffer.from("WA"),
  Buffer.from([5, 2]),
]);
exports.MOBILE_ENDPOINT = "g.whatsapp.net";
exports.MOBILE_PORT = 443;
//=======================================================//
const WA_VERSION_IOS = "2.25.34.75";
const WA_VERSION_HASH = createHash("md5").update(WA_VERSION_IOS).digest("hex");
exports.MOBILE_TOKEN = Buffer.from(
  "0a1mLfGUIBVrMKF1RdvLI5lkRBvof6vn0fD2QRSM" + WA_VERSION_HASH,
);
//=======================================================//
exports.MOBILE_REGISTRATION_ENDPOINT = "https://v.whatsapp.net/v2";
exports.MOBILE_USERAGENT =
  "WhatsApp/2.25.34.75 iOS/18.2 Device/Apple-iPhone_11";
exports.REGISTRATION_PUBLIC_KEY = Buffer.from([
  5, 142, 140, 15, 116, 195, 235, 197, 215, 166, 134, 92, 108, 60, 132, 56, 86,
  176, 97, 33, 204, 232, 234, 119, 77, 34, 251, 111, 18, 37, 18, 48, 45,
]);
//=======================================================//
/** from: https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url */
exports.URL_REGEX =
  /https:\/\/(?![^:@\/\s]+:[^:@\/\s]+@)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?/g;
// TODO: Add WA root CA
exports.WA_CERT_DETAILS = {
  SERIAL: 0,
};
exports.PROCESSABLE_HISTORY_TYPES = [
  index_js_1.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP,
  index_js_1.proto.HistorySync.HistorySyncType.PUSH_NAME,
  index_js_1.proto.HistorySync.HistorySyncType.RECENT,
  index_js_1.proto.HistorySync.HistorySyncType.FULL,
  index_js_1.proto.HistorySync.HistorySyncType.ON_DEMAND,
  index_js_1.proto.HistorySync.HistorySyncType.NON_BLOCKING_DATA,
  index_js_1.proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3,
  index_js_1.proto.HistorySync.HistorySyncType.NO_HISTORY,
  index_js_1.proto.HistorySync.HistorySyncType.MESSAGE_ACCESS_STATUS,
];
exports.DEFAULT_CONNECTION_CONFIG = {
  version: version,
  browser: browser_utils_1.Browsers.windows("Chrome"),
  waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
  connectTimeoutMs: 20000,
  keepAliveIntervalMs: 30000,
  logger: logger_1.default.child({ class: "baileys" }),
  emitOwnEvents: true,
  defaultQueryTimeoutMs: 60000,
  customUploadHosts: [],
  retryRequestDelayMs: 250,
  maxMsgRetryCount: 6,
  fireInitQueries: true,
  auth: undefined,
  markOnlineOnConnect: true,
  syncFullHistory: true,
  patchMessageBeforeSending: (msg) => msg,
  shouldSyncHistoryMessage: () => true,
  shouldIgnoreJid: () => false,
  linkPreviewImageThumbnailWidth: 192,
  transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
  generateHighQualityLinkPreview: false,
  enableAutoSessionRecreation: true,
  enableRecentMessageCache: true,
  options: {},
  appStateMacVerification: {
    patch: false,
    snapshot: false,
  },
  countryCode: "US",
  getMessage: async () => undefined,
  cachedGroupMetadata: async () => undefined,
  makeSignalRepository: libsignal_1.makeLibSignalRepository,
};
exports.MEDIA_PATH_MAP = {
  image: "/mms/image",
  video: "/mms/video",
  document: "/mms/document",
  audio: "/mms/audio",
  sticker: "/mms/image",
  "thumbnail-link": "/mms/image",
  "product-catalog-image": "/product/image",
  "md-app-state": "",
  "md-msg-hist": "/mms/md-app-state",
  "biz-cover-photo": "/pps/biz-cover-photo",
};
exports.MEDIA_HKDF_KEY_MAPPING = {
  audio: "Audio",
  document: "Document",
  gif: "Video",
  image: "Image",
  ppic: "",
  product: "Image",
  ptt: "Audio",
  sticker: "Image",
  video: "Video",
  "thumbnail-document": "Document Thumbnail",
  "thumbnail-image": "Image Thumbnail",
  "thumbnail-video": "Video Thumbnail",
  "thumbnail-link": "Link Thumbnail",
  "md-msg-hist": "History",
  "md-app-state": "App State",
  "product-catalog-image": "",
  "payment-bg-image": "Payment Background",
  ptv: "Video",
  "biz-cover-photo": "Image",
};
exports.MEDIA_KEYS = Object.keys(exports.MEDIA_PATH_MAP);
exports.MIN_PREKEY_COUNT = 5;
exports.INITIAL_PREKEY_COUNT = 812;
exports.UPLOAD_TIMEOUT = 30000; // 30 seconds
exports.MIN_UPLOAD_INTERVAL = 5000; // 5 seconds minimum between uploads
exports.DEFAULT_CACHE_TTLS = {
  SIGNAL_STORE: 5 * 60, // 5 minutes
  MSG_RETRY: 60 * 60, // 1 hour
  CALL_OFFER: 5 * 60, // 5 minutes
  USER_DEVICES: 5 * 60, // 5 minutes
};
