
const path = require("path");

const functionsDir = __dirname; // Should resolve to src/functions/
const projectSrcDir = path.resolve(functionsDir, ".."); // src/

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [
      path.join(functionsDir, "tsconfig.json"), // Path relative to projectSrcDir if tsconfigRootDir is projectSrcDir
      path.join(functionsDir, "tsconfig.dev.json"),// Path relative to projectSrcDir
    ],
    tsconfigRootDir: projectSrcDir, // src/
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    // "plugin:@typescript-eslint/recommended-requiring-type-checking", // Keep this commented out for now
  ],
  plugins: ["@typescript-eslint", "import"],
  ignorePatterns: [
    "lib/**", // Ignores 'src/functions/lib/**/*'
    "node_modules/",
    ".eslintrc.js",
    "index.js", // Ignore the JS entry point if present
    "*.js" // Broadly ignore JS files if only TS is linted by the functions-specific script
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
    "@typescript-eslint/no-var-requires": "warn", // Keep as warn, it's a .js file
  },
};
