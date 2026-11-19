import { readFile, rename, writeFile } from 'node:fs/promises';

const output = new URL('../dist-pages/', import.meta.url);
const masterFile = new URL('master.json', output);
const master = JSON.parse(await readFile(masterFile, 'utf8'));
const publishedJackets = new Map();

for (const { jacket } of master.songs) {
  if (!jacket.endsWith('.img') || publishedJackets.has(jacket)) continue;
  if (!/^\/jackets\/[a-zA-Z0-9_.-]+\.img$/.test(jacket)) {
    throw Error(`ジャケット画像のパスが不正です。 ${jacket}`);
  }

  const source = new URL(jacket.slice(1), output);
  const bytes = await readFile(source);
  const extension = imageExtension(bytes);
  if (!extension) throw Error(`ジャケット画像の形式が不明です。 ${jacket}`);

  const publishedJacket = jacket.replace(/\.img$/, extension);
  await rename(source, new URL(publishedJacket.slice(1), output));
  publishedJackets.set(jacket, publishedJacket);
}

for (const song of master.songs) {
  song.jacket = publishedJackets.get(song.jacket) ?? song.jacket;
}
await writeFile(masterFile, JSON.stringify(master));

function imageExtension(bytes) {
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return '.jpg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return '.png';
  if (['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return '.gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return '.webp';
}
