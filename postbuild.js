const fs = require('fs/promises');
const path = require('path');

// Define paths
const outDir = path.join(__dirname, 'out');
const extensionDir = path.join(__dirname, 'extension');
const oldNextDir = path.join(outDir, '_next');
const newNextDir = path.join(outDir, 'next');

/**
 * Recursively finds and replaces text in files within a directory.
 * @param {string} directory - The directory to start searching from.
 */
async function findAndReplace(directory) {
  try {
    const files = await fs.readdir(directory, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(directory, file.name);
      if (file.isDirectory()) {
        await findAndReplace(fullPath);
      } else if (/\.(html|css|js)$/.test(file.name)) {
        console.log(`Updating asset paths in: ${fullPath}`);
        let content = await fs.readFile(fullPath, 'utf8');
        // Replace all occurrences of `/_next/` with `./next/` to make paths relative
        const result = content.replace(/\/_next\//g, './next/');
        await fs.writeFile(fullPath, result, 'utf8');
      }
    }
  } catch (error) {
    // Ignore if the directory doesn't exist, as it might be the first run
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function postBuild() {
  try {
    console.log('--- Starting post-build process for Chrome Extension ---');

    // 1. Rename 'out/_next' to 'out/next' to comply with extension policies
    console.log(`Renaming directory: ${oldNextDir} -> ${newNextDir}`);
    try {
        await fs.rename(oldNextDir, newNextDir);
        console.log('Directory renamed successfully.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`${oldNextDir} does not exist, skipping rename.`);
        } else {
            throw error;
        }
    }

    // 2. Update asset paths in all built files to point to the new 'next' directory
    console.log('Updating asset paths in HTML/CSS/JS files...');
    await findAndReplace(outDir);
    console.log('Asset paths updated successfully.');

    // 3. Copy static extension files (manifest, icons, background script) to 'out'
    console.log(`Copying extension files from ${extensionDir} to ${outDir}`);
    await fs.cp(extensionDir, outDir, { recursive: true });
    console.log('Extension files copied successfully.');

    console.log('--- Post-build process finished successfully ---');
  } catch (error) {
    console.error('Error during post-build process:', error);
    process.exit(1); // Exit with an error code to stop the build
  }
}

postBuild();