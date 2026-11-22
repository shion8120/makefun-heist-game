// How a heist ends and how it is judged: the ending (crown, lesser exit, caught, sealed in), the
// numbers on the score screen, and the rank (Cat Burglar / Professional / Smash and Grab).

export const ENDINGS = {
  crown: { title: 'THE CROWN IS YOURS', line: 'The van pulls away from the dock. Somewhere behind you, the Clockwork Crown has stopped ticking for its old owners.' },
  lesser: { title: 'A QUIET EXIT', line: 'You slip out through the dock with pockets full, but the Clockwork Crown still ticks away in its vault.' },
  caught: { title: 'BUSTED', line: 'A hand on your shoulder and a torch in your eyes. The night shift takes you in.' },
  sealed: { title: 'SEALED IN', line: 'Steel shutters slam across every door. The lockdown ran out before you did.' },
};

export const RANKS = {
  cat: { name: 'CAT BURGLAR', colour: '#45e6c8', blurb: 'In, out, and barely a shadow on the tape.' },
  pro: { name: 'PROFESSIONAL', colour: '#ffd45c', blurb: 'The crown is gone and so are you. A little noisy.' },
  smash: { name: 'SMASH AND GRAB', colour: '#ff7a4d', blurb: 'Loud, messy, and the papers will love it.' },
  none: { name: 'NO RANK', colour: '#8d97ad', blurb: 'Every heist is practice for the next.' },
};

/** Picks the rank: the crown with little seen and a low alarm is a Cat Burglar's work. */
export function rankFor(stats) {
  if (!stats.escaped) return 'none';
  if (stats.crown && stats.timesSeen <= 2 && stats.maxAlarm <= 1) return 'cat';
  if (stats.crown && (stats.maxAlarm <= 2 || stats.timesSeen <= 4)) return 'pro';
  return 'smash';
}

/** Freezes the end-of-heist numbers for the score screen. */
export function finishHeist(state, kind) {
  const p = state.player;
  const stats = {
    kind,
    escaped: kind === 'crown' || kind === 'lesser',
    crown: p.hasCrown,
    loot: p.take,
    pieces: p.lootCount,
    time: state.time,
    timesSeen: state.timesSeen,
    maxAlarm: state.alarm.maxLevel,
    toolsUsed: state.toolsUsed,
  };
  stats.rank = rankFor(stats);
  return stats;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatMoney(value) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}
