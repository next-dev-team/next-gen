import type { PlopTypes } from "@turbo/gen";
import path from "node:path";

export default function electronFloatGenerator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("electron-float", {
    description: "Scaffold an Electron app with Float DevTools",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Application name",
        default: "float-devtools-app",
      },
      {
        type: "input",
        name: "destination",
        message: "Destination path",
        default: ".",
      },
    ],
    actions: [
      function setPaths(answers: any) {
        const plopfileDir = plop.getPlopfilePath();
        const base = path.resolve(plopfileDir, "templates", "electron-float");
        // expose to handlebars via answers
        (answers as any).templateBase = base.replace(/\\/g, "/");
        return `Templates: ${base}`;
      },
      {
        type: "addMany",
        destination: "{{destination}}/{{dashCase name}}",
        base: "{{templateBase}}",
        templateFiles: "{{templateBase}}/**/*",
      },
    ],
  });
}