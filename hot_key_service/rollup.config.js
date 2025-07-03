import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import terser from "@rollup/plugin-terser";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

const packageJson = require('./package.json');

// Define external dependencies - anything in peerDependencies and dependencies should be external
const external = Object.keys({
  ...packageJson.peerDependencies,
  ...packageJson.dependencies
}).filter(Boolean);

export default [
  // Main bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        // Add banner for better debugging
        banner: `/**\n * ${packageJson.name} v${packageJson.version}\n */`,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        // Add banner for better debugging
        banner: `/**\n * ${packageJson.name} v${packageJson.version}\n */`,
      }
    ],
    plugins: [
      // Extract peer dependencies
      peerDepsExternal(),
      
      // Resolve node_modules
      resolve({
        extensions: ['.ts', '.tsx'],
        preferBuiltins: true,
      }),
      
      // Convert CommonJS modules to ES6
      commonjs({
        include: 'node_modules/**',
        // Optimize: skip CommonJS transformation when possible
        transformMixedEsModules: true,
      }),
      
      // Compile TypeScript
      typescript({ 
        tsconfig: "./tsconfig.json",
        // Faster builds by using incremental compilation
        incremental: true,
        // Exclude declaration files - they're handled in the second config
        declaration: false,
      }),
      
      // Minify the output
      terser({
        format: {
          comments: false,
        },
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
        }
      }),
    ],
    // Mark all dependencies as external
    external,
  },
  
  // Type definitions
  {
    input: "src/index.ts",
    output: [{ file: packageJson.types }],
    plugins: [dts.default()],
    // This build is much faster if we exclude external types
    external,
  }
]