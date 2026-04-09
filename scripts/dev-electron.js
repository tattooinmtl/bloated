/**
 * Dev entry: sets VITE_DEV_SERVER_URL and launches Electron pointing at the Vite dev server.
 */
const { spawn } = require('child_process');
const path = require('path');

process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';

const electron = require('electron');
const child = spawn(String(electron), [path.join(__dirname, '..')], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5173' },
});

child.on('close', () => process.exit());
