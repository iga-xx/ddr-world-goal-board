import { assertCapacity, makeEntry, type Current, type Entry, type Master, type Target } from './domain.ts';

export interface PublishedChart {
  chartId: string;
  target: Target;
  current?: Current;
}

export function publishedEntries(board: readonly PublishedChart[], master: Master): Entry[] {
  const charts = new Map(master.charts.map(chart => [chart.id, chart]));
  const songs = new Map(master.songs.map(song => [song.id, song]));

  const entries = board.map(({ chartId, target, current = 'NONE' }) => {
    const chart = charts.get(chartId);
    const song = chart && songs.get(chart.songId);
    if (!chart || !song) throw Error(`公開データの譜面がマスターにありません。 ${chartId}`);
    if (target !== 'FL9' && target !== 'FLEX') throw Error(`公開データの目標ランクが不正です。 ${chartId}`);
    if (current !== 'NONE' && current !== 'FL9' && current !== 'FLEX') {
      throw Error(`公開データの現在ランクが不正です。 ${chartId}`);
    }
    return { ...makeEntry(chart, song, target), current };
  });

  assertCapacity(entries, master);
  return entries;
}
