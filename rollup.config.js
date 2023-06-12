/* eslint-disable @typescript-eslint/no-var-requires */
const typescript = require("rollup-plugin-typescript2");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
module.exports = {
  input: "src/BtcEthSwap.ts", // Path to your main TypeScript file
  output: {
    file: "src/javascript/BtcEthSwap.bundle.js", // Output bundle location
    format: "cjs", // Format of the output bundle (cjs = CommonJS, also: es, iife, etc.)
  },
  cache: false,
  external: ["ethers"],
  plugins: [
    //nodeResolve({ preferBuiltins: true }),
    commonjs(),
    typescript({
      tsconfigOverride: {
        compilerOptions: { module: "ESNext" },
        exclude: ["**/__tests__", "**/*.test.ts", "src/utils/btc.ts"],
      },
    }),
  ],
};
