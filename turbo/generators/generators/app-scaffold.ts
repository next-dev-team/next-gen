import path from "node:path";
import type { PlopTypes } from "@turbo/gen";
import {
  EXPO_FRONTENDS,
  FRONTEND_OPTIONS,
  FRONTEND_TEMPLATE_MAP,
  POSTCSS_CONFIG_TEMPLATE,
  TAILWIND_CONFIG_TEMPLATE,
  UI_OPTIONS,
} from "./app-scaffold.constants";
import { copyDir, getUiDependencies } from "./app-scaffold.utils";

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
        when: (answers: any) => !EXPO_FRONTENDS.has(answers.frontend),
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

      const plopfileDir = plop.getPlopfilePath();
      const frontendTemplate = FRONTEND_TEMPLATE_MAP[frontend] || frontend;
      const templateBase = path.resolve(
        plopfileDir,
        "templates",
        frontendTemplate
      );
      const rootDir = path.dirname(path.dirname(plopfileDir));
      const destination = path.resolve(rootDir, data.dest, data.name);
      const templateBaseGlob = templateBase.replace(/\\/g, "/");

      console.log(`\n  🚀 Generating app "${data.name}" at: ${destination}\n`);

      const isExpoFrontend = EXPO_FRONTENDS.has(frontend);

      if (isExpoFrontend) {
        actions.push(function copyRnrExpoTemplate() {
          copyDir(templateBase, destination);
          return `Copied ${frontendTemplate} template from ${templateBase} to ${destination}`;
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

      // Update package.json name
      actions.push({
        type: "modify",
        path: path.join(destination, "package.json"),
        pattern: /"name": ".*"/,
        template: `"name": "{{name}}"`,
      });

      // Update app.json for Expo projects (except turbo-uniwind which doesn't have it)
      if (isExpoFrontend && frontend !== "turbo-uniwind") {
        ["name", "slug", "scheme"].forEach((key) => {
          actions.push({
            type: "modify",
            path: path.join(destination, "app.json"),
            pattern: new RegExp(`"${key}": "[^"]*"`),
            template: `"${key}": "{{name}}"`,
          });
        });
      }

      // Add UI Dependencies and Configs
      const { dependencies, devDependencies } = getUiDependencies(ui);

      if (ui.includes("tailwind") || ui.includes("shadcn")) {
        actions.push({
          type: "add",
          path: path.join(destination, "tailwind.config.js"),
          template: TAILWIND_CONFIG_TEMPLATE,
          skipIfExists: true,
        });

        actions.push({
          type: "add",
          path: path.join(destination, "postcss.config.js"),
          template: POSTCSS_CONFIG_TEMPLATE,
          skipIfExists: true,
        });
      }

      if (Object.keys(dependencies).length > 0) {
        const depsString = Object.entries(dependencies)
          .map(([k, v]) => `    "${k}": "${v}"`)
          .join(",\n");
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
