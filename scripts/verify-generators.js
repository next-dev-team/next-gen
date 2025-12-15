const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const generators = [
  { name: "RN Reusables (Expo Uniwind)", value: "rnr-expo-uniwind" },
];

const rootDir = path.resolve(__dirname, "..");

// Helper to run shell commands
function run(command) {
  try {
    console.log(`> ${command}`);
    execSync(command, { stdio: "inherit", cwd: rootDir });
    return true;
  } catch (e) {
    console.error(`Command failed: ${command}`);
    return false;
  }
}

// Cleanup function
function cleanup(paths) {
  console.log("\n🧹 Cleaning up...");
  paths.forEach((p) => {
    if (fs.existsSync(p)) {
      console.log(`Removing ${p}`);
      fs.rmSync(p, { recursive: true, force: true });
    }
  });
}

async function main() {
  const createdPaths = [];
  let hasErrors = false;

  console.log("🚀 Starting Generator Verification Script\n");

  for (const gen of generators) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing: ${gen.name} (${gen.value})`);
    console.log(`--------------------------------------------------`);

    // Test 1: Generate in 'apps' folder
    const appName = `test-${gen.value}-app`;
    const destDir = "apps";
    const fullPathApps = path.join(rootDir, destDir, appName);
    createdPaths.push(fullPathApps);

    console.log(`\n[Test 1] Generating in ./apps/${appName}...`);
    // Construct the turbo gen command with flags to bypass prompts
    // Note: Turbo gen prompts can be bypassed if all arguments are provided.
    // However, passing list/checkbox answers via CLI args can be tricky with Plop.
    // We rely on Plop's behavior: if we pass --frontend --ui --name --dest, it should work.
    // UI is a checkbox, we need to pass one or more values.
    // Using positional arguments via --args: frontend ui name dest

    const cmdApps = `npx turbo gen app-scaffold --args "${gen.value}" "tailwind" "${appName}" "${destDir}"`;

    if (run(cmdApps)) {
      if (fs.existsSync(path.join(fullPathApps, "package.json"))) {
        console.log(`✅ Success: App generated at ${fullPathApps}`);
      } else {
        console.error(
          `❌ Error: App directory created but package.json missing at ${fullPathApps}`
        );
        hasErrors = true;
      }
    } else {
      console.error(`❌ Error: Generator failed for ${gen.value} in apps`);
      hasErrors = true;
    }

    // Test 2: Generate in root '.'
    const rootAppName = `test-${gen.value}-root`;
    const destRoot = ".";
    const fullPathRoot = path.join(rootDir, rootAppName);
    createdPaths.push(fullPathRoot);

    console.log(`\n[Test 2] Generating in ./${rootAppName}...`);
    const cmdRoot = `npx turbo gen app-scaffold --args "${gen.value}" "tailwind" "${rootAppName}" "${destRoot}"`;

    if (run(cmdRoot)) {
      if (fs.existsSync(path.join(fullPathRoot, "package.json"))) {
        console.log(`✅ Success: App generated at ${fullPathRoot}`);
      } else {
        console.error(
          `❌ Error: App directory created but package.json missing at ${fullPathRoot}`
        );
        hasErrors = true;
      }
    } else {
      console.error(`❌ Error: Generator failed for ${gen.value} in root`);
      hasErrors = true;
    }
  }

  console.log("\n--------------------------------------------------");
  if (hasErrors) {
    console.log("❌ Verification completed with ERRORS.");
  } else {
    console.log("✅ Verification completed SUCCESSFULLY.");
  }

  // cleanup(createdPaths); // Uncomment to auto-cleanup, but user said "remove it all but verify it working first" - implying manual or separate cleanup?
  // "remove it all but verify it working first" -> generate -> verify -> remove.
  // So I should cleanup.
  cleanup(createdPaths);
}

main();
