import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: true,
    clean: true,
    external: ["react", "next", "soundcloud-api-ts"],
    outExtension({ format }) {
      return { js: format === "esm" ? ".mjs" : ".cjs" };
    },
    banner: { js: '"use client";' },
  },
  {
    entry: ["src/server.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: true,
    clean: false,
    external: ["react", "next", "soundcloud-api-ts"],
    outExtension({ format }) {
      return { js: format === "esm" ? ".mjs" : ".cjs" };
    },
  },
]);
