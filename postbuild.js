const fs = require('fs/promises');
const path = require('path');

// Define paths
const outDir = path.join(__dirname, 'out');
const extensionDir = path.join(__dirname, 'extension');
const oldNextDir = path.join(outDir, '_next');
const newNextDir = path.join(outDir, 'next');

async function postBuild() {
  try {
    console.log('--- Starting post-build process ---');

    // 1. Rename 'out/_next' to 'out/next'
    console.log(`Renaming directory: ${oldNextDir} -> ${newNextDir}`);
    await fs.rename(oldNextDir, newNextDir);
    console.log('Directory renamed successfully.');

    // 2. Copy contents from 'extension' to 'out'
    console.log(`Copying extension files from ${extensionDir} to ${outDir}`);
    await fs.cp(extensionDir, outDir, { recursive: true });
    console.log('Extension files copied successfully.');

    console.log('--- Post-build process finished ---');
  } catch (error) {
    console.error('Error during post-build process:', error);
    process.exit(1); // Exit with an error code to stop the build
  }
}

postBuild();