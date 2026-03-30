import { createRequire } from "module";
import security from "eslint-plugin-security";

// eslint-config-next@16 exports flat config arrays via CJS module.exports.
// createRequire lets us import them from an ESM config file.
const require = createRequire(import.meta.url);

const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

const config = [
  { ignores: ["playwright-report/**", "test-results/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Security rules — catch XSS, injection, and unsafe patterns before CI
  {
    plugins: { security },
    rules: {
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-object-injection": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-unsafe-regex": "error",
    },
  },
];

export default config;
