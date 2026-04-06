export default {
  displayName: "agent-experiments",
  preset: "../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }]
  },
  transformIgnorePatterns: ["node_modules/(?!unpdf)"],
  moduleFileExtensions: ["ts", "js", "mjs", "html"],
  coverageDirectory: "../../coverage/packages/agent-experiments"
};
