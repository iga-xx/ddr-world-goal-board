import { assertCapacity, makeEntry, type Entry, type Master, type Target } from './domain.ts';

export interface PublishedChart {
  chartId: string;
  target: Target;
}

export function publishedEntries(board: readonly PublishedChart[], master: Master): Entry[] {
  const charts = new Map(master.charts.map(chart => [chart.id, chart]));
  const songs = new Map(master.songs.map(song => [song.id, song]));

  const entries = board.map(({ chartId, target }) => {
    const chart = charts.get(chartId);
    const song = chart && songs.get(chart.songId);
    if (!chart || !song) throw Error(`公開データの譜面がマスターにありません。 ${chartId}`);
    if (target !== 'FL9' && target !== 'FLEX') throw Error(`公開データの目標ランクが不正です。 ${chartId}`);
    return makeEntry(chart, song, target);
  });

  assertCapacity(entries, master);
  return entries;
}
