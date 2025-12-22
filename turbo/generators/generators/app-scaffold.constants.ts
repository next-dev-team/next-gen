export const UI_OPTIONS = [
  { name: "Shadcn UI / Tailwind", value: "shadcn" },
  { name: "Tailwind CSS Only", value: "tailwind" },
  { name: "Ant Design v6", value: "antd" },
  { name: "Hero UI", value: "heroui" },
];

export const FRONTEND_OPTIONS = [
  { name: "Next.js 15", value: "nextjs-15" },
  { name: "Next.js 16", value: "nextjs-16" },
  { name: "Vite + React 19", value: "vite-react-9" },
  { name: "TanStack Start", value: "tanstack-start" },
  { name: "Vue 3", value: "vue3" },
  { name: "Nuxt 4", value: "nuxt4" },
  { name: "RN Reusables (Expo Nativewind)", value: "rnr-expo" },
  { name: "RN Reusables (Expo Uniwind)", value: "rnr-expo-uniwind" },
  { name: "Turbo Uniwind", value: "turbo-uniwind" },
  {
    name: "Antd Mobile + Tailwind (Vite)",
    value: "antd-mobile-tailwind-vite-7",
  },
];

export const EXPO_FRONTENDS = new Set([
  "rnr-expo",
  "rnr-expo-uniwind",
  "turbo-uniwind",
]);

export const FRONTEND_TEMPLATE_MAP: Record<string, string> = {
  "nextjs-15": "nextjs-15",
  "nextjs-16": "nextjs-16",
  "vite-react-9": "vite-react-9",
  "tanstack-start": "tanstack-start",
  vue3: "vue3",
  nuxt4: "nuxt4",
  "rnr-expo": "rnr-expo",
  "rnr-expo-uniwind": "rnr-uniwind",
  "turbo-uniwind": "turbo-uniwind",
  "antd-mobile-tailwind-vite-7": "antd-mobile-tailwind-vite-7",
};

export const TAILWIND_CONFIG_TEMPLATE = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

export const POSTCSS_CONFIG_TEMPLATE = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
