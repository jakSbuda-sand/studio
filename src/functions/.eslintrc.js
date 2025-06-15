
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
      path.join(functionsDir, "tsconfig.json"), // Equivalent to "./tsconfig.json" if tsconfigRootDir is __dirname
      path.join(functionsDir, "tsconfig.dev.json"), // Equivalent to "./tsconfig.dev.json"
    ],
    tsconfigRootDir: functionsDir, // src/functions/
    sourceType: "module",
  },
  ignorePatterns: [
    "lib/**/*",        // Ignores 'src/functions/lib/**/*'
    "generated/**/*",  // Ignores 'src/functions/generated/**/*'
    "index.js",        // Ignores 'src/functions/index.js'
    ".eslintrc.js",    // Ignore this file itself from TS linting
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
