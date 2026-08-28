export const MUSEUM_TIMELINE_SCOPE = Object.freeze({ start: 1368, end: 1662 });

export const MUSEUM_BOUNDARIES = Object.freeze([
  Object.freeze({ year: 1368, label: '明朝建立' }),
  Object.freeze({ year: 1644, label: '北京明廷覆亡' }),
  Object.freeze({ year: 1662, label: '南明终局' }),
]);

export const clampMuseumYear = year => Math.min(
  MUSEUM_TIMELINE_SCOPE.end,
  Math.max(MUSEUM_TIMELINE_SCOPE.start, year)
);
