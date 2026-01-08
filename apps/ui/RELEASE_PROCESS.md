# Release Process - next-gen-tools

This document outlines the steps to release a new version of the **next-gen-tools** Electron application and how to manage mandatory updates.

## 1. Prerequisites

- Ensure you have a `GH_TOKEN` (GitHub Personal Access Token) with `repo` permissions set in your environment variables.
- All changes must be committed and pushed to the `main` branch.

## 2. Versioning

1. Open `apps/ui/package.json`.
2. Increment the `version` field following [Semantic Versioning](https://semver.org/) (e.g., `1.0.1` -> `1.0.2`).

## 3. Mandatory Updates (Owner Controlled)

The app supports two ways to force a mandatory update that blocks usage until installed:

### A. Release Notes Keyword (Easiest)

When creating the release on GitHub, include the keyword `[MANDATORY]` anywhere in the **Release Notes** (body).

- **Example**: `[MANDATORY] Critical security patch and UI improvements.`

### B. Remote Policy (Advanced)

If you have a remote configuration server, you can set a global policy. The app checks for this during the update check (see `main/index.js`).

## 4. Automated Release (Recommended)

The project is configured with a GitHub Action that automatically builds and publishes the app when you push a version tag.

1. Commit all your changes.
2. Create and push a new tag:
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```
3. The GitHub Action will trigger, build for Windows, macOS, and Linux, and upload the artifacts to a new **Draft Release** on GitHub.

## 5. Manual Build and Publish (Fallback)

Run the following commands from the `apps/ui` directory to build and upload the release artifacts to GitHub.

### Windows

```bash
pnpm run build:win
```

### macOS

```bash
pnpm run build:mac
```

### Linux

```bash
pnpm run build:linux
```

_Note: `electron-builder` will automatically create a "Draft" release on GitHub if it doesn't exist, or upload to an existing draft with the same version._

## 6. Finalizing the Release

1. Go to the [GitHub Releases page](https://github.com/next-dev-team/next-gen/releases).
2. Find the draft release created by the build command or GitHub Action.
3. Edit the release:
   - Add a Title (e.g., `v1.0.2`).
   - Add Release Notes. **Remember to add `[MANDATORY]` if this is a forced update.**
4. Click **Publish release**.

## 7. How Updates Work for Users

- **Standard Update**: Users receive a system notification and a non-intrusive dialog. They can choose to "Update Now" (one-click) or "Later".
- **Mandatory Update**: If detected (via keyword or policy), the app shows a persistent gate. The user **cannot close the window** or use the app until the update is downloaded and installed.
- **Auto-Install**: Once a mandatory update is downloaded, the app will automatically restart and install it.
