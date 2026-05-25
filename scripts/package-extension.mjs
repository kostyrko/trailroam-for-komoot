import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const browserOutputPath = join('dist', 'trailroam-for-strava', 'browser');
const rootIndexPath = join(browserOutputPath, 'index.html');
const appOutputPath = join(browserOutputPath, 'app');
const appIndexPath = join(appOutputPath, 'index.html');

await mkdir(appOutputPath, { recursive: true });

const rootIndex = await readFile(rootIndexPath, 'utf8');
const nestedAppIndex = rootIndex
  .replaceAll('href="favicon.ico"', 'href="../favicon.ico"')
  .replaceAll('href="styles-', 'href="../styles-')
  .replaceAll('href="chunk-', 'href="../chunk-')
  .replaceAll('src="main-', 'src="../main-');

await writeFile(appIndexPath, nestedAppIndex);

console.log(`Packaged extension app page: ${appIndexPath}`);
