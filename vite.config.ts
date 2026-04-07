import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const githubPagesBase = "/APP-LOTEAMIENTO/";
const base = process.env.GITHUB_ACTIONS === "true" ? githubPagesBase : "/";

export default defineConfig({
  base,
  plugins: [react()],
});
