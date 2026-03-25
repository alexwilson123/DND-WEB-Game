# Stoneward Depths

Stoneward Depths is a browser-based dungeon crawler inspired by classic first-person RPGs like Eye of the Beholder. The current build uses Babylon.js for a 3D dungeon scene, imported props and enemy models, party-based combat, class abilities, animated doors, attack particles, themed dungeon layers, and a minimap-driven exploration loop.

## Features

- First-person 3D dungeon exploration in the browser
- Smooth tile-based movement and turning
- Four-character party with portraits, health, and role abilities
- Enemy encounters, melee strikes, healing, and spell attacks
- Imported monster and prop models with Babylon.js rendering
- Texture-mapped dungeon materials and atmospheric lighting
- Treasure, potions, a Moon Key objective, and exit progression

## Run Locally

Because the project imports `.glb` assets, it is best served over HTTP instead of being opened directly as `file://`.

Simple options:

1. Use a lightweight local web server in this folder.
2. Open the project from a static host such as GitHub Pages after upload.

Then load `index.html` in the browser.

## Deploy To GitHub Pages

This project is configured for GitHub Pages with a GitHub Actions workflow in `.github/workflows/deploy-pages.yml`.

After pushing the repository to GitHub:

1. Open the repository on GitHub.
2. Go to `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or run the workflow manually from the `Actions` tab.

Your site will then be published at:

`https://YOUR-USERNAME.github.io/YOUR-REPO/`

If the repository name changes, the Pages URL changes with it.

## Project Structure

- `index.html`: page shell and Babylon.js script includes
- `styles.css`: UI styling for the game shell and party interface
- `app.js`: game logic, Babylon scene setup, input, combat, and rendering
- `assets/models/`: imported 3D models
- `assets/textures/`: wall and floor textures
- `assets/portraits/`: party portrait artwork
- `assets/CREDITS.md`: asset credits and attribution notes

## Credits

See `assets/CREDITS.md` for imported asset credits and license notes.
