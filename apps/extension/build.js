const fs = require('fs');
const { execSync } = require('child_process');

console.log("Running tsc...");
execSync("tsc", { stdio: 'inherit' });

console.log("Bundling content script...");
execSync(`esbuild src/content/index.ts --bundle --outfile=dist/content/index.js --format=iife --define:process.env.API_BASE="\\"${process.env.API_BASE || 'http://localhost:8000/api/v1'}\\""`, { stdio: 'inherit' });

console.log("Bundling popup script...");
execSync(`esbuild popup/index.ts --bundle --outfile=dist/popup/index.js --format=iife --define:process.env.API_BASE="\\"${process.env.API_BASE || 'http://localhost:8000/api/v1'}\\"" --define:process.env.FRONTEND_URL="\\"${process.env.FRONTEND_URL || 'http://localhost:3000'}\\""`, { stdio: 'inherit' });

console.log("Copying static files...");
fs.mkdirSync('dist/popup', { recursive: true });
fs.copyFileSync('popup/index.html', 'dist/popup/index.html');
fs.copyFileSync('popup/style.css', 'dist/popup/style.css');
fs.copyFileSync('manifest.json', 'dist/manifest.json');

console.log("Build complete!");
