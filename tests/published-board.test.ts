import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { publishedEntries } from '../src/published-board.ts';

test('コミット済みの公開データは譜面と目標だけを持ち、マスターで解決できる', async () => {
  const [board, master] = await Promise.all(
    ['src/published-board.json', 'public/master.json'].map(async file =>
      JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8')),
    ),
  );
  for (const chart of board) assert.deepEqual(Object.keys(chart).sort(), ['chartId', 'target']);

  const entries = publishedEntries(board, master);
  assert.deepEqual(entries.map(({ chartId, target }) => ({ chartId, target })), board);
  assert(entries.every(entry => entry.current === 'NONE'));

  const edited = entries.pop();
  assert.deepEqual(publishedEntries(board, master).map(entry => entry.chartId), board.map(chart => chart.chartId));
  if (edited) assert.throws(() => publishedEntries([...board, board.at(-1)], master), /重複/);
});
