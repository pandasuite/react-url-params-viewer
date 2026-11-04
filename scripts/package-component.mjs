import { createWriteStream } from 'node:fs';
import { access, readFile, readdir, rm } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const { version } = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
const zipPath = path.join(rootDir, `react-url-params-viewer-v${version}.zip`);

async function ensureDistExists() {
  try {
    await access(distDir, fsConstants.R_OK);
  } catch {
    throw new Error('Build output not found. Run "npm run build:app" before packaging.');
  }
}

async function packageComponent() {
  await ensureDistExists();
  for (const filename of await readdir(rootDir)) {
    if (filename === 'pandasuite-component.zip' || /^react-url-params-viewer-v.*\.zip$/.test(filename)) {
      await rm(path.join(rootDir, filename), { force: true });
    }
  }

  const output = createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);
  archive.directory(distDir, false);
  await archive.finalize();
  await done;

  process.stdout.write(`Created ${zipPath}\n`);
}

packageComponent().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
