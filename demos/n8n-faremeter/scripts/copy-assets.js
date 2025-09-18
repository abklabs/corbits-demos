const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'icons');
const distIconsDir = path.join(__dirname, '..', 'dist', 'icons');
if (fs.existsSync(iconsDir)) {
  fs.mkdirSync(distIconsDir, { recursive: true });
  const iconFiles = fs
    .readdirSync(iconsDir)
    .filter((file) => file.endsWith('.svg') || file.endsWith('.png'));
  iconFiles.forEach((file) => {
    fs.copyFileSync(path.join(iconsDir, file), path.join(distIconsDir, file));
    console.log(`Copied icon ${file} to dist/icons/`);
  });
}

const dirs = ['nodes', 'credentials'];

dirs.forEach((dir) => {
  const srcDir = path.join(__dirname, '..', dir);
  const distDir = path.join(__dirname, '..', 'dist', dir);

  fs.mkdirSync(distDir, { recursive: true });

  if (fs.existsSync(srcDir)) {
    const subdirs = fs
      .readdirSync(srcDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory());

    subdirs.forEach((subdir) => {
      const srcSubdir = path.join(srcDir, subdir.name);
      const distSubdir = path.join(distDir, subdir.name);

      fs.mkdirSync(distSubdir, { recursive: true });

      const jsonFiles = fs.readdirSync(srcSubdir).filter((file) => file.endsWith('.json'));

      jsonFiles.forEach((file) => {
        const srcFile = path.join(srcSubdir, file);
        const distFile = path.join(distSubdir, file);
        fs.copyFileSync(srcFile, distFile);
        console.log(`Copied ${srcFile} to ${distFile}`);
      });
    });
  }
});

console.log('Asset copy complete!');
