"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Defaults_1 = require("../Defaults");
const registration_1 = require("./registration");
// export the last socket layer
const makeWASocket = (config) => {
  const newConfig = {
    ...Defaults_1.DEFAULT_CONNECTION_CONFIG,
    ...config,
  };
  // If the user hasn't provided their own history sync function,
  // let's create a default one that respects the syncFullHistory flag.
  // TODO: Change
  if (config.shouldSyncHistoryMessage === undefined) {
    newConfig.shouldSyncHistoryMessage = () => !!newConfig.syncFullHistory;
  }
  return (0, registration_1.makeRegistrationSocket)(newConfig);
};
exports.default = makeWASocket;
