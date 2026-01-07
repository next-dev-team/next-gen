/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/unit/**/*.test.js"],
  verbose: true,
  collectCoverage: false,
  moduleFileExtensions: ["js", "json", "node"],
  testPathIgnorePatterns: ["/node_modules/", "/out/", "/dist/"],
  transform: {},
};
