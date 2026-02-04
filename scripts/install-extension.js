#!/usr/bin/env node

const { execSync } = require('child_process');
const { version } = require('../package.json');
const path = require('path');

const vsixFile = path.join(__dirname, '..', `tensorlens-${version}.vsix`);

try {
    console.log(`Installing TensorLens v${version}...`);
    execSync(`code --install-extension "${vsixFile}"`, { 
        stdio: 'inherit',
        shell: true 
    });
    console.log('✓ Extension installed successfully!');
} catch (error) {
    console.error('✗ Failed to install extension');
    process.exit(1);
}
