import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/styles/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [require("tailwindcss-animate")],
};
export default config;