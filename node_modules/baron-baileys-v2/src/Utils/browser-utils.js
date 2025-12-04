"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformId = exports.Browsers = void 0;
const os_1 = require("os");
const index_js_1 = require("../../WAProto/index.js");
const COMPANION_PLATFORM_MAP = {
  Chrome: "49",
  Edge: "50",
  Firefox: "51",
  Opera: "53",
  Safari: "54",
  Brave: "1.79.112",
  Vivaldi: "6.2.3105.58",
  Tor: "12.5.3",
  Yandex: "23.7.1",
  Falkon: "22.08.3",
  Epiphany: "44.2",
};
const PLATFORM_MAP = {
  aix: "AIX",
  darwin: "Mac OS",
  win32: "Windows",
  android: "Android",
  freebsd: "FreeBSD",
  openbsd: "OpenBSD",
  sunos: "Solaris",
  linux: "Linux",
  ubuntu: "Ubuntu",
  ios: "iOS",
  baileys: "Baileys",
  chromeos: "Chrome OS",
  tizen: "Tizen",
  watchos: "watchOS",
  wearos: "Wear OS",
  harmonyos: "HarmonyOS",
  kaios: "KaiOS",
  smarttv: "Smart TV",
  raspberrypi: "Raspberry Pi OS",
  symbian: "Symbian",
  blackberry: "Blackberry OS",
  windowsphone: "Windows Phone",
  safari: "Safari",
};

const PLATFORM_VERSIONS = {
  ubuntu: "22.04.4",
  darwin: "18.5",
  win32: "10.0.22631",
  android: "14.0.0",
  freebsd: "13.2",
  openbsd: "7.3",
  sunos: "11",
  linux: "6.5",
  ios: "18.2",
  baileys: "6.5.0",
  chromeos: "117.0.5938.132",
  tizen: "6.5",
  watchos: "10.1",
  wearos: "4.1",
  harmonyos: "4.0.0",
  kaios: "3.1",
  smarttv: "23.3.1",
  raspberrypi: "11 (Bullseye)",
  symbian: "3",
  blackberry: "10.3.3",
  windowsphone: "8.1",
};

exports.Browsers = {
  ubuntu: (browser) => {
    return [PLATFORM_MAP["ubuntu"], browser, PLATFORM_VERSIONS["ubuntu"]];
  },
  macOS: (browser) => {
    return [PLATFORM_MAP["darwin"], browser, PLATFORM_VERSIONS["darwin"]];
  },
  windows: (browser) => {
    return [PLATFORM_MAP["win32"], browser, PLATFORM_VERSIONS["win32"]];
  },
  linux: (browser) => {
    return [PLATFORM_MAP["linux"], browser, PLATFORM_VERSIONS["linux"]];
  },
  solaris: (browser) => {
    return [PLATFORM_MAP["sunos"], browser, PLATFORM_VERSIONS["sunos"]];
  },
  baileys: (browser) => {
    return [PLATFORM_MAP["baileys"], browser, PLATFORM_VERSIONS["baileys"]];
  },
  android: (browser) => {
    return [PLATFORM_MAP["android"], browser, PLATFORM_VERSIONS["android"]];
  },
  iOS: (browser) => {
    return [PLATFORM_MAP["ios"], browser, PLATFORM_VERSIONS["ios"]];
  },
  kaiOS: (browser) => {
    return [PLATFORM_MAP["kaios"], browser, PLATFORM_VERSIONS["kaios"]];
  },
  chromeOS: (browser) => {
    return [PLATFORM_MAP["chromeos"], browser, PLATFORM_VERSIONS["chromeos"]];
  },
  appropriate: (browser) => {
    const platform = os_1.platform();
    const platformName = PLATFORM_MAP[platform] || "Unknown OS";
    return [platformName, browser, PLATFORM_VERSIONS[platform] || "latest"];
  },
  custom: (platform, browser, version) => {
    const platformName = PLATFORM_MAP[platform.toLowerCase()] || platform;
    return [
      platformName,
      browser,
      version || PLATFORM_VERSIONS[platform] || "latest",
    ];
  },
};
const getPlatformId = (browser) => {
  const platformType =
    index_js_1.proto.DeviceProps.PlatformType[browser.toUpperCase()];
  return platformType ? platformType.toString() : "1"; //chrome
};
exports.getPlatformId = getPlatformId;
