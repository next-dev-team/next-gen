import fs from "node:fs";
import path from "node:path";

export function copyDir(src: string, dest: string) {
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

export function getUiDependencies(ui: string[]) {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};

  if (ui.includes("tailwind") || ui.includes("shadcn")) {
    devDependencies["tailwindcss"] = "^3.4.0";
    devDependencies["postcss"] = "^8.0.0";
    devDependencies["autoprefixer"] = "^10.0.0";
  }

  if (ui.includes("shadcn")) {
    dependencies["class-variance-authority"] = "^0.7.0";
    dependencies["clsx"] = "^2.0.0";
    dependencies["tailwind-merge"] = "^2.0.0";
    dependencies["lucide-react"] = "^0.290.0";
  }

  if (ui.includes("antd")) {
    dependencies["antd"] = "^5.12.0";
  }

  if (ui.includes("heroui")) {
    dependencies["@heroui/react"] = "latest";
    dependencies["framer-motion"] = "^10.0.0";
  }

  return { dependencies, devDependencies };
}
