// Additive merge: official data wins when available; conflicting levels stop the update.
export function mergeSupplements(master: any, supplements: any) {
  const result = structuredClone(master);
  result.sources = [...new Set([...(master.sources ?? []), ...(supplements.sources ?? [])])];
  for (const song of supplements.songs ?? []) {
    const existing = result.songs.find((s:any) => s.id === song.id);
    if (!existing) result.songs.push(song);
    else {
      if (song.artist && !existing.artist) existing.artist = song.artist;
      if (!existing.category && song.category) { existing.category= song.category; existing.categorySource=song.categorySource; }
    }
  }
  const songIds = new Set(result.songs.map((s:any) => s.id));
  for (const chart of supplements.charts ?? []) {
    if (!songIds.has(chart.songId)) throw Error(`追補の曲がありません: ${chart.id}`);
    const existing = result.charts.find((c:any) => c.id === chart.id);
    if (!existing) result.charts.push(chart);
    else if (existing.songId !== chart.songId || existing.difficulty !== chart.difficulty || existing.level !== chart.level) throw Error(`譜面情報が競合しています: ${chart.id}`);
  }
  // Distinguish original recordings and covers which share a title.
  for (const song of result.songs) {
    if (result.songs.filter((s:any) => s.title === song.title).length > 1) song.displayTitle = `${song.title} / ${song.artist || song.version || song.id}`;
  }
  return result;
}
