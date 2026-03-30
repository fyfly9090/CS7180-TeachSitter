import { createRequire } from "module";

// eslint-config-next@16 exports flat config arrays via CJS module.exports.
// createRequire lets us import them from an ESM config file.
const require = createRequire(import.meta.url);

const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

const config = [
  { ignores: ["playwright-report/**", "test-results/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
