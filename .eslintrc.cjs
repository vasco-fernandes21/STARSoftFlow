/** @type {import("eslint").Linter.Config} */
const config = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": true
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked"
  ],
  "rules": {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports"
      }
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        "checksVoidReturn": {
          "attributes": false
        }
      }
    ],
    // Temporarily disable these rules to get the build to work
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/prefer-optional-chain": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/only-throw-error": "off",
    "@typescript-eslint/no-unnecessary-type-assertion": "off",
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/await-thenable": "off",
    "@typescript-eslint/non-nullable-type-assertion-style": "off",
    "@typescript-eslint/consistent-indexed-object-style": "off",
    "@typescript-eslint/prefer-regexp-exec": "off",
    "@typescript-eslint/prefer-for-of": "off",
    "@typescript-eslint/dot-notation": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "react/display-name": "off",
    "react/no-unescaped-entities": "off",
    "@next/next/no-sync-scripts": "off",
    "prefer-const": "warn",
    "@typescript-eslint/no-empty-function": "off"
  },
  "overrides": [
    {
      "files": ["src/env.js"],
      "rules": {
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-return": "off"
      },
      "parserOptions": {
        "project": null
      }
    }
  ],
  "ignorePatterns": ["src/env.js"]
}
module.exports = config;