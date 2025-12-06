import nodePlop from "node-plop";
import path from "path";
import fs from "fs";

async function run() {
  const generatorName = process.argv[2];
  let answersJson = process.argv[3];

  if (!generatorName || !answersJson) {
    console.error("Usage: tsx run-generator.ts <generatorName> <answersJson>");
    process.exit(1);
  }

  let answers;
  try {
    // Try parsing as is first
    answers = JSON.parse(answersJson);
  } catch (e) {
    // If failed, try base64 decode
    try {
      const decoded = Buffer.from(answersJson, "base64").toString("utf-8");
      answers = JSON.parse(decoded);
    } catch (e2) {
      console.error("Failed to parse answers JSON:", e.message);
      process.exit(1);
    }
  }

  // The plopfile is in turbo/generators/config.ts relative to project root
  // This script is in scripts/ relative to project root
  const plopfilePath = path.resolve(__dirname, "../turbo/generators/config.ts");

  console.log(`Loading generator ${generatorName} from ${plopfilePath}`);

  try {
    const plop = await nodePlop(plopfilePath);
    const generator = plop.getGenerator(generatorName);

    console.log("Running actions...");
    const result = await generator.runActions(answers);

    if (result.failures && result.failures.length > 0) {
      console.error("Failures:", result.failures);
      process.exit(1);
    }

    console.log("Success:", result.changes);
  } catch (error) {
    console.error("Error running generator:", error);
    process.exit(1);
  }
}

run();
