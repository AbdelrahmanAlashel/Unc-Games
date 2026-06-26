# Unc Games

Live website: [https://abdelrahmanalashel.github.io/Unc-Games/](https://abdelrahmanalashel.github.io/Unc-Games/)

Unc Games is a browser-based collection of calm, classic games made for quick brain breaks. It brings familiar "uncle games" into one place, so anyone can open the site, pick a table, and chill for a few minutes.

## Games

- Sudoku with keyboard input, difficulties, timer stats, and fresh puzzles.
- Minesweeper with three difficulties and colorful revealed cells.
- Solitaire with Easy and Hard draw modes, drag-and-drop, auto-finish, and win animation.
- 2048 with score tracking and merge animation.
- Chess against AI with Beginner, Intermediate, and Stockfish-powered Expert difficulty.
- Snake with wraparound walls, growing speed, score tracking, and bonus food.
- Word Search with difficulties and click-or-drag selection.
- Memory Match with preview flash and Easy/Hard modes.

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- chess.js
- Stockfish 18 Lite (Expert chess engine)
- GitHub Pages


## Development

Install dependencies.

```powershell
npm install
```

Start the local development website.

```powershell
npm run dev
```

Build the production website.

```powershell
npm run build
```

Preview the production build locally.

```powershell
npm run preview
```

## Deployment

The site is deployed with GitHub Pages. When changes are pushed to `main`, GitHub Actions builds the Vite app and publishes the latest version.

## Third-Party Notices

Expert Chess uses the bundled Stockfish 18 Lite engine, licensed under GPL-3.0. Its license is included at `public/stockfish/COPYING.txt`.
