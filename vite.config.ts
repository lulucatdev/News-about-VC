import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  environments: {
    rsc: {
      build: {
        rollupOptions: {
          external: ["blake3-wasm"],
        },
      },
    },
  },
});
