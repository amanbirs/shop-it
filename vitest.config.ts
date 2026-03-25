import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "supabase/functions"],
    coverage: {
      provider: "v8",
      include: [
        "lib/actions/**",
        "lib/validators/**",
        "lib/ai/**",
        "lib/utils.ts",
        "lib/constants.ts",
        "app/api/**",
        "hooks/**",
      ],
      exclude: [
        "lib/supabase/**",
        "components/ui/**",
        "**/*.test.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
