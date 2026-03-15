/**
 * Generate native app icons for iOS and Android from the existing /api/icons endpoint.
 * Usage: npx tsx scripts/generate-native-assets.ts
 */
import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_URL = 'https://www.play-o-graph.com/api/icons';

function fetchIcon(size: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(`${BASE_URL}/${size}`, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location!, (res2) => {
          const chunks: Buffer[] = [];
          res2.on('data', (chunk) => chunks.push(chunk));
          res2.on('end', () => resolve(Buffer.concat(chunks)));
          res2.on('error', reject);
        }).on('error', reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateiOSIcons() {
  console.log('Generating iOS icons...');
  const iosIconDir = path.join('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  ensureDir(iosIconDir);

  // iOS requires a 1024x1024 icon for the App Store
  const sizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

  for (const size of sizes) {
    console.log(`  Fetching ${size}x${size}...`);
    const buf = await fetchIcon(size);
    fs.writeFileSync(path.join(iosIconDir, `icon-${size}.png`), buf);
  }

  // Write Contents.json for Xcode
  const contents = {
    images: [
      { size: '20x20', idiom: 'iphone', scale: '2x', filename: 'icon-40.png' },
      { size: '20x20', idiom: 'iphone', scale: '3x', filename: 'icon-60.png' },
      { size: '29x29', idiom: 'iphone', scale: '2x', filename: 'icon-58.png' },
      { size: '29x29', idiom: 'iphone', scale: '3x', filename: 'icon-87.png' },
      { size: '40x40', idiom: 'iphone', scale: '2x', filename: 'icon-80.png' },
      { size: '40x40', idiom: 'iphone', scale: '3x', filename: 'icon-120.png' },
      { size: '60x60', idiom: 'iphone', scale: '2x', filename: 'icon-120.png' },
      { size: '60x60', idiom: 'iphone', scale: '3x', filename: 'icon-180.png' },
      { size: '20x20', idiom: 'ipad', scale: '1x', filename: 'icon-20.png' },
      { size: '20x20', idiom: 'ipad', scale: '2x', filename: 'icon-40.png' },
      { size: '29x29', idiom: 'ipad', scale: '1x', filename: 'icon-29.png' },
      { size: '29x29', idiom: 'ipad', scale: '2x', filename: 'icon-58.png' },
      { size: '40x40', idiom: 'ipad', scale: '1x', filename: 'icon-40.png' },
      { size: '40x40', idiom: 'ipad', scale: '2x', filename: 'icon-80.png' },
      { size: '76x76', idiom: 'ipad', scale: '1x', filename: 'icon-76.png' },
      { size: '76x76', idiom: 'ipad', scale: '2x', filename: 'icon-152.png' },
      { size: '83.5x83.5', idiom: 'ipad', scale: '2x', filename: 'icon-167.png' },
      { size: '1024x1024', idiom: 'ios-marketing', scale: '1x', filename: 'icon-1024.png' },
    ],
    info: { version: 1, author: 'generate-native-assets' },
  };
  fs.writeFileSync(path.join(iosIconDir, 'Contents.json'), JSON.stringify(contents, null, 2));
  console.log('iOS icons done.');
}

async function generateAndroidIcons() {
  console.log('Generating Android icons...');

  const densities: { name: string; size: number }[] = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
  ];

  const androidResDir = path.join('android', 'app', 'src', 'main', 'res');

  for (const { name, size } of densities) {
    const dir = path.join(androidResDir, name);
    ensureDir(dir);
    console.log(`  Fetching ${size}x${size} for ${name}...`);
    const buf = await fetchIcon(size);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), buf);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), buf);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), buf);
  }

  // Play Store icon (512x512)
  console.log('  Fetching 512x512 for Play Store...');
  const playStoreIcon = await fetchIcon(512);
  fs.writeFileSync(path.join('android', 'app', 'src', 'main', 'playstore-icon.png'), playStoreIcon);

  console.log('Android icons done.');
}

async function main() {
  console.log('Generating native assets from Play-O-Graph icon API...\n');
  await generateiOSIcons();
  console.log('');
  await generateAndroidIcons();
  console.log('\nAll native assets generated!');
}

main().catch((err) => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
