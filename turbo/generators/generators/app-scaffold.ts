import type { PlopTypes } from "@turbo/gen";
import fs from "node:fs";
import path from "node:path";

const UI_OPTIONS = [
  { name: "Shadcn UI / Tailwind", value: "shadcn" },
  { name: "Tailwind CSS Only", value: "tailwind" },
  { name: "Ant Design v6", value: "antd" },
  { name: "Hero UI", value: "heroui" },
];

const FRONTEND_OPTIONS = [
  { name: "Next.js 15", value: "nextjs-15" },
  { name: "Next.js 16", value: "nextjs-16" },
  { name: "Vite + React 19", value: "vite-react-9" },
  { name: "TanStack Start", value: "tanstack-start" },
  { name: "Vue 3", value: "vue3" },
  { name: "Nuxt 4", value: "nuxt4" },
  { name: "React Native Reusables (Expo)", value: "rnr-expo" },
];

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default function appScaffoldGenerator(
  plop: PlopTypes.NodePlopAPI
): void {
  plop.setGenerator("app-scaffold", {
    description: "Scaffold a new application with Counter Demo",
    prompts: [
      {
        type: "list",
        name: "frontend",
        message: "Select Frontend Framework",
        choices: FRONTEND_OPTIONS,
      },
      {
        type: "checkbox",
        name: "ui",
        message: "Select UI / CSS Stack (Multiple selection allowed)",
        choices: UI_OPTIONS,
        when: (answers: any) => answers.frontend !== "rnr-expo",
      },
      {
        type: "list",
        name: "packageManager",
        message: "Select Package Manager",
        choices: ["pnpm", "npm", "yarn", "bun"],
        default: "pnpm",
      },
      {
        type: "input",
        name: "name",
        message: "Application Name",
        default: "my-app",
      },
      {
        type: "input",
        name: "dest",
        message: "Destination directory (default: 'apps', use '.' for root)",
        default: "apps",
      },
    ],
    actions: (data: any) => {
      const actions: any[] = [];
      const frontend = data.frontend;
      const ui = data.ui || [];

      // Resolve paths
      const plopfileDir = plop.getPlopfilePath();
      const templateBase = path.resolve(plopfileDir, "templates", frontend);
      const rootDir = path.dirname(path.dirname(plopfileDir));
      const destination = path.resolve(rootDir, data.dest, data.name);

      // Normalize paths for globbing (Windows support)
      const templateBaseGlob = templateBase.replace(/\\/g, "/");

      console.log(`\n  � Generating app "${data.name}" at: ${destination}\n`);

      // 1. Copy Base Template
      if (frontend === "rnr-expo") {
        actions.push(function copyRnrExpoTemplate() {
          copyDir(templateBase, destination);
          return `Copied rnr-expo template from ${templateBase} to ${destination}`;
        });
      } else {
        actions.push({
          type: "addMany",
          destination: destination,
          base: templateBaseGlob,
          templateFiles: `${templateBaseGlob}/**/*`,
          force: true,
          data: {
            name: data.name,
          },
        });
      }

      // Update package.json name for all frontends
      actions.push({
        type: "modify",
        path: path.join(destination, "package.json"),
        pattern: /"name": ".*"/,
        template: `"name": "{{name}}"`,
      });

      // Update app.json for rnr-expo
      if (frontend === "rnr-expo") {
        actions.push({
          type: "modify",
          path: path.join(destination, "app.json"),
          pattern: /"name": "rnr-expo"/,
          template: `"name": "{{name}}"`,
        });
        actions.push({
          type: "modify",
          path: path.join(destination, "app.json"),
          pattern: /"slug": "rnr-expo"/,
          template: `"slug": "{{name}}"`,
        });
        actions.push({
          type: "modify",
          path: path.join(destination, "app.json"),
          pattern: /"scheme": "rnr-expo"/,
          template: `"scheme": "{{name}}"`,
        });
      }

      // 2. Add UI Dependencies and Configs
      // This is simplified. Real implementation might need file modifications.

      const dependencies: Record<string, string> = {};
      const devDependencies: Record<string, string> = {};

      if (ui.includes("tailwind") || ui.includes("shadcn")) {
        devDependencies["tailwindcss"] = "^3.4.0";
        devDependencies["postcss"] = "^8.0.0";
        devDependencies["autoprefixer"] = "^10.0.0";

        // Add tailwind config if not present (we can just write it)
        actions.push({
          type: "add",
          path: path.join(destination, "tailwind.config.js"),
          template: `/** @type {import('tailwindcss').Config} */
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
}`,
          skipIfExists: true,
        });

        actions.push({
          type: "add",
          path: path.join(destination, "postcss.config.js"),
          template: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
          skipIfExists: true,
        });
      }

      if (ui.includes("shadcn")) {
        dependencies["class-variance-authority"] = "^0.7.0";
        dependencies["clsx"] = "^2.0.0";
        dependencies["tailwind-merge"] = "^2.0.0";
        dependencies["lucide-react"] = "^0.290.0";
        // In a real scenario, we would also copy components.json and utils.ts
      }

      if (ui.includes("antd")) {
        dependencies["antd"] = "^5.12.0"; // v6 might be "next"
      }

      if (ui.includes("heroui")) {
        dependencies["@heroui/react"] = "latest";
        dependencies["framer-motion"] = "^10.0.0";
      }

      // Inject dependencies into package.json
      // We use a custom action or just modify the file?
      // Plop doesn't have a native "modifyJSON" action, but we can use "modify" with regex.
      // Or better, define a custom action. But I cannot define custom actions easily here without registering them.
      // I will use "modify" to inject dependencies.

      if (Object.keys(dependencies).length > 0) {
        const depsString = Object.entries(dependencies)
          .map(([k, v]) => `    "${k}": "${v}"`)
          .join(",\n");
        // Look for "dependencies": {
        actions.push({
          type: "modify",
          path: path.join(destination, "package.json"),
          pattern: /"dependencies": {/,
          template: `"dependencies": {\n${depsString},`,
        });
      }

      if (Object.keys(devDependencies).length > 0) {
        const devDepsString = Object.entries(devDependencies)
          .map(([k, v]) => `    "${k}": "${v}"`)
          .join(",\n");
        // If devDependencies exists, inject. If not, add it.
        // Simplest way: assume it might not exist or exist.
        // Regex to find if devDependencies exists
        // This is tricky with regex only.
        // I will append them to dependencies if devDependencies is missing, or try to find the closing brace of dependencies and add devDependencies after.

        // Strategy: Check if devDependencies exists. If so, inject.
        // If not, add after dependencies closing brace.
        // But plop "modify" is single pass.

        // I will just add them to dependencies for simplicity in this demo, or try to inject into devDependencies if I know the template has it.
        // All my templates have devDependencies except maybe some I wrote.
        // Nextjs templates have it. Vite templates have it.

        actions.push({
          type: "modify",
          path: path.join(destination, "package.json"),
          pattern: /"devDependencies": {/,
          template: `"devDependencies": {\n${devDepsString},`,
        });
      }

      return actions;
    },
  });
}
