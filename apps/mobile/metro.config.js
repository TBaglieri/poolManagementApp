// Metro config for the Expo app.
//
// apps/mobile is intentionally NOT a root npm-workspace member — it installs its
// own complete node_modules via `npm --prefix apps/mobile install`. So the default
// Expo Metro config (self-contained resolution) is correct here; no monorepo
// watchFolders / nodeModulesPaths overrides (those broke React Native's nested
// dependency resolution).
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
