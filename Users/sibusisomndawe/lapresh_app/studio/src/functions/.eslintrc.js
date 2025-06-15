
const path = require('path'); // Added for path resolution

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
    project: ["functions/tsconfig.json", "functions/tsconfig.dev.json"], // Paths relative to the new tsconfigRootDir
    tsconfigRootDir: path.resolve(__dirname, '..'), // Changed to point to src/
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files from src/functions/lib
    "/generated/**/*", // Ignore generated files
    "index.js", // Ignore the JS entry point in src/functions if it exists
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

  },
};
