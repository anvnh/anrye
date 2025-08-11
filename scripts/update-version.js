#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate a new version based on timestamp
const timestamp = Date.now();
const version = `v1.0.${timestamp}`;

// Read the service worker file
const swPath = path.join(__dirname, '../public/sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');

// Update the cache version
swContent = swContent.replace(
  /const CACHE_VERSION = ['"`][^'"`]*['"`];/,
  `const CACHE_VERSION = '${version}';`
);

// Write the updated content back
fs.writeFileSync(swPath, swContent);