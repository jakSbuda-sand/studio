
const path = require("path");

const functionsDir = __dirname; // Should resolve to src/functions
// const projectSrcDir = path.resolve(functionsDir, ".."); // src/

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [
      "./tsconfig.json", // Relative to tsconfigRootDir
      "./tsconfig.dev.json", // Relative to tsconfigRootDir
    ],
    tsconfigRootDir: functionsDir, // src/functions/
    sourceType: "module",
  },
  ignorePatterns: [
    "lib/**",        // Explicitly ignore the 'lib' directory in src/functions/
    "generated/",    // If you have this directory
    "index.js",      // Ignore src/functions/index.js (the non-TS entry point if it exists)
    ".eslintrc.js",  // Ignore this ESLint config file itself
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "max-len": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "object-curly-spacing": ["error", "never"],
    "no-trailing-spaces": "error",
    "comma-dangle": ["error", "always-multiline"],
    "padded-blocks": ["error", "never"],
    "@typescript-eslint/no-var-requires": "warn",
  },
};
