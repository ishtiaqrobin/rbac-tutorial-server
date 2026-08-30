import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "api",
  external: ["pg-native"],
  shims: true,
  banner: {
    js: `import { createRequire } from 'module';
const require = createRequire(import.meta.url);`,
  },
});
