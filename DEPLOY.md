# GitHub Pages

This game has its own repository, separate from One Life in Sect. Suggested repository name: `after-zero-zombie`.

1. Create the new repository on GitHub and push this project's `main` branch.
2. In Settings → Pages → Build and deployment, choose **GitHub Actions**.
3. Run the **Publish AFTER ZERO** workflow (or push a new commit).
4. Open the URL reported by the deployment on a phone.

The workflow tests the engine and publishes only the game's runtime files. It does not publish local saves, screenshots, test output, or development tools. No server backend or account is required to play. Relative asset paths support a GitHub Pages project URL.

Mobile saves remain in the browser used to play. Use the in-game export/import menu to transfer a save from a computer to a phone.
