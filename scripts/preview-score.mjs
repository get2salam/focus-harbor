import { priority, todayISO, normalize } from '../js/scoring.js';

const spec = {
  slug: 'focus-harbor',
  itemLabel: 'focus session',
  categories: ['Deep work', 'Admin', 'Learning', 'Recovery'],
  states: ['Planned', 'Anchored', 'Drifting', 'Logged'],
  completedStates: ['Logged'],
  stateWeights: { Planned: 2, Anchored: 10, Drifting: 7, Logged: 3 },
  metric: { label: 'Focus quality', min: 1, max: 10, default: 6 },
  textOne: { label: 'Goal', default: 'What this session must achieve' },
  textTwo: { label: 'Distraction', default: 'What will try to break focus' },
  date: { label: 'Session date' },
  defaults: { note: 'Capture the setup that makes this block easier to protect.' },
};

const sampleSessions = [
  {
    title: 'Proposal draft sprint',
    category: 'Deep work',
    state: 'Anchored',
    score: 9,
    effort: 3,
    metric: 8,
    textOne: 'Finish the decision-ready first draft',
    textTwo: 'Inbox checks between sections',
    date: todayISO(0),
  },
  {
    title: 'Course notes review',
    category: 'Learning',
    state: 'Planned',
    score: 6,
    effort: 4,
    metric: 6,
    textOne: 'Turn notes into three durable takeaways',
    textTwo: 'Passive rereading',
    date: todayISO(3),
  },
  {
    title: 'Admin cleanup window',
    category: 'Admin',
    state: 'Planned',
    score: 5,
    effort: 5,
    metric: 4,
    textOne: 'Clear only items blocking this week',
    textTwo: 'Low-value reply loops',
    date: todayISO(1),
  },
];

const ranked = sampleSessions
  .map((item, index) => normalize(item, spec, { idFor: () => `example-${index + 1}` }))
  .map((item) => ({ ...item, priority: priority(item, spec) }))
  .sort((a, b) => b.priority - a.priority);

console.log('Focus Harbor example ranking');
for (const [index, item] of ranked.entries()) {
  console.log(
    `${index + 1}. ${item.title} — ${item.state}, ${item.category}, focus ${item.metric}/10, due ${item.date}, priority ${item.priority}`,
  );
}
