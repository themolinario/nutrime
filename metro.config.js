const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The offline PDF reader ships as a single HTML asset that the app reads as text.
config.resolver.assetExts.push('html');

module.exports = config;
