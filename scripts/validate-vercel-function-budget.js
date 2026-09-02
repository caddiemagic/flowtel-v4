#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'api');
const HOBBY_FUNCTION_LIMIT = 12;

const functions = fs.readdirSync(apiDir)
  .filter((name) => name.endsWith('.js'))
  .sort();

if (functions.length > HOBBY_FUNCTION_LIMIT) {
  console.error(`Vercel Hobby function budget exceeded: ${functions.length}/${HOBBY_FUNCTION_LIMIT}`);
  console.error(functions.join('\n'));
  process.exit(1);
}

if (functions.includes('beta-request.js')) {
  console.error('Retired api/beta-request.js is still present and consumes a Vercel Serverless Function slot.');
  process.exit(1);
}

console.log(`Vercel Hobby function budget OK: ${functions.length}/${HOBBY_FUNCTION_LIMIT}`);
