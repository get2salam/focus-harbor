// Pure scoring and normalization helpers for Focus Harbor.
// Kept side-effect free so the browser app and node:test suites can share them.

export function clamp(value, min, max, fallback = min) {
  const candidate = value === null || value === undefined ? fallback : value;
  const n = Number(candidate);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function todayISO(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function daysFromToday(value, today = todayISO()) {
  if (!value) return Infinity;
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return Infinity;
  const anchor = new Date(`${today}T00:00:00`);
  return Math.round((target - anchor) / 86400000);
}

export function bumpDate(value, days) {
  const seed = value || todayISO();
  const date = new Date(`${seed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return todayISO(days);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isCompleted(state, spec) {
  return (spec.completedStates || []).includes(state);
}

export function stateWeight(state, spec) {
  return (spec.stateWeights || {})[state] ?? 0;
}

export function priority(item, spec) {
  const completed = isCompleted(item.state, spec);
  const days = daysFromToday(item.date);
  // Overdue work earns a *bigger* boost than work due today; finite-days guard
  // keeps malformed dates from poisoning the score with NaN.
  const dueBoost = completed || !Number.isFinite(days) ? 0 : Math.max(0, 4 - days) * 4;
  return item.score * 6 + item.metric * 5 + dueBoost + stateWeight(item.state, spec) - item.effort * 4;
}

function safeDate(value, fallback) {
  if (!value) return fallback;
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return fallback;
  return value;
}

export function normalize(item = {}, spec, { idFor = randomId } = {}) {
  const metricDefault = spec.metric.default ?? spec.metric.min;
  return {
    id: item.id || idFor(spec),
    title: item.title || `New ${spec.itemLabel}`,
    note: item.note || spec.defaults.note,
    category: spec.categories.includes(item.category) ? item.category : spec.categories[0],
    state: spec.states.includes(item.state) ? item.state : spec.states[0],
    score: clamp(item.score, 1, 10, 7),
    effort: clamp(item.effort, 1, 10, 3),
    metric: clamp(item.metric, spec.metric.min, spec.metric.max, metricDefault),
    textOne: item.textOne || spec.textOne.default,
    textTwo: item.textTwo || spec.textTwo.default,
    date: safeDate(item.date, todayISO(3)),
  };
}

function randomId(spec) {
  return `${spec.slug}_${Math.random().toString(36).slice(2, 10)}`;
}
