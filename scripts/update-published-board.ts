import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { parseBackup, type Master } from '../src/domain.ts';
import { publishedEntries } from '../src/published-board.ts';

const [backupPath, ...extraArgs] = process.argv.slice(2);
if (!backupPath || extraArgs.length) {
  console.error('Usage: pnpm board:snapshot <backup.json>');
  process.exit(1);
}

const [backupText, masterText] = await Promise.all([
  readFile(backupPath, 'utf8'),
  readFile(new URL('../public/master.json', import.meta.url), 'utf8'),
]);
const master: Master = JSON.parse(masterText);
const board = parseBackup(JSON.parse(backupText), master)
  .map(({ chartId, target, current }) => ({ chartId, target, current }));
publishedEntries(board, master);

const output = new URL('../src/published-board.json', import.meta.url);
const temporary = new URL(`published-board.${randomUUID()}.tmp`, output);
const json = `[\n${board.map(chart => `  ${JSON.stringify(chart)}`).join(',\n')}\n]\n`;
try {
  await writeFile(temporary, json, { flag: 'wx' });
  await rename(temporary, output);
} finally {
  await rm(temporary, { force: true });
}
console.log(`公開用スナップショットを更新しました。${board.length}譜面`);
