#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting YouTubeFit...');
console.log('📦 Backend server on http://localhost:3001');
console.log('🌐 Frontend server on http://localhost:3000');
console.log('Press Ctrl+C to stop both servers\n');

// Spawn backend server
const backend = spawn('node', ['server/index.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// Spawn frontend server
const frontend = spawn('npx', ['vite'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// Add prefixes to output for clarity
backend.stdout.on('data', (data) => {
  console.log(`[BACKEND] ${data.toString().trimEnd()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[BACKEND ERROR] ${data.toString().trimEnd()}`);
});

frontend.stdout.on('data', (data) => {
  console.log(`[FRONTEND] ${data.toString().trimEnd()}`);
});

frontend.stderr.on('data', (data) => {
  console.error(`[FRONTEND ERROR] ${data.toString().trimEnd()}`);
});

// Cleanup function to kill both processes
const cleanup = () => {
  console.log('\n🛑 Stopping servers...');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  
  // Force kill if they don't exit gracefully
  setTimeout(() => {
    backend.kill('SIGKILL');
    frontend.kill('SIGKILL');
    process.exit(0);
  }, 2000);
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle process errors
backend.on('error', (err) => {
  console.error('[BACKEND] Failed to start:', err);
  cleanup();
});

frontend.on('error', (err) => {
  console.error('[FRONTEND] Failed to start:', err);
  cleanup();
});

// Handle process exits
backend.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[BACKEND] Process exited with code ${code}`);
    cleanup();
  }
});

frontend.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[FRONTEND] Process exited with code ${code}`);
    cleanup();
  }
});
