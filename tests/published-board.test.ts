import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { publishedEntries } from '../src/published-board.ts';

test('公開データの譜面・目標・現在ランクが復元される', async () => {
  const [board, master] = await Promise.all(
    ['src/published-board.json', 'public/master.json'].map(async file =>
      JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8')),
    ),
  );
  for (const chart of board) assert.deepEqual(Object.keys(chart).sort(), ['chartId', 'current', 'target']);

  const entries = publishedEntries(board, master);
  assert.deepEqual(entries.map(({ chartId, target, current }) => ({ chartId, target, current })), board);

  const firstChart = board[0];
  if (firstChart) {
    entries[0].current = entries[0].current === 'NONE' ? 'FLEX' : 'NONE';
    assert.equal(publishedEntries(board, master)[0].current, firstChart.current);
    const { chartId, target } = firstChart;
    assert.equal(publishedEntries([{ chartId, target }], master)[0].current, 'NONE');
    // @ts-expect-error 公開JSONに不正なランクが混入した場合を検証する。
    assert.throws(() => publishedEntries([{ chartId, target, current: 'FL8' }], master), /現在ランク/);
    assert.throws(() => publishedEntries([...board, firstChart], master), /重複/);
  }
});
