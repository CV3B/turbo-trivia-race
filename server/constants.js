module.exports = {
  // Room settings
  ROOM_CODE_LENGTH: 4,
  MAX_PLAYERS_PER_ROOM: 20,
  MIN_TEAMS: 1,
  MAX_TEAMS: 8,

  // Game phases
  PHASE: {
    LOBBY: 'lobby',
    RACING: 'racing',
    FINISHED: 'finished'
  },

  // Round types
  ROUND_TYPE: {
    TRIVIA: 'trivia',
    MINI_GAME: 'mini_game',
    POWER_UP: 'power_up'
  },

  // Trivia settings
  TRIVIA_TIME_LIMIT: 15000,       // 15 seconds per question
  TRIVIA_BASE_SCORE: 100,
  TRIVIA_SPEED_BONUS_MAX: 50,
  TRIVIA_SHOW_RESULTS_TIME: 4000, // 4 seconds to show results

  // Race settings
  TRACK_PROGRESS_WIN: 1.0,
  MAX_ADVANCE_PER_ROUND: 0.05,    // 5% max per round
  MIN_ADVANCE_PER_ROUND: 0.01,    // 1% min for participating

  // Power-up settings
  POWER_UP_PHASE_TIME: 5000,      // 5 seconds for power-up phase
  MAX_POWER_UPS_PER_PLAYER: 2,
  POWER_UPS: {
    NITRO_BOOST: { id: 'nitro', name: 'Nitro Boost', effect: 0.05, description: '+5% track progress' },
    OIL_SLICK: { id: 'oil', name: 'Oil Slick', effect: -0.03, description: '-3% to opponent' },
    TIRE_POP: { id: 'tire_pop', name: 'Tire Pop', effect: 0, description: 'Opponent skips advancement' },
    SHIELD: { id: 'shield', name: 'Shield', effect: 0, description: 'Blocks one attack' }
  },

  // Rubber-banding spawn chances (by position: 1st through 8th)
  POWER_UP_SPAWN_CHANCE: [0.15, 0.25, 0.35, 0.50, 0.55, 0.60, 0.65, 0.70],

  // Mini-game settings
  MINI_GAME_CHANCE: 0.4,  // 40% chance of mini-game vs trivia

  // Team colors
  TEAM_COLORS: ['#ff4444', '#4488ff', '#44ff44', '#ffaa00', '#ff44ff', '#00ffcc', '#ff8844', '#aaff00'],
  TEAM_NAMES: ['Red Rockets', 'Blue Blazers', 'Green Machines', 'Gold Gears', 'Purple Panthers', 'Cyan Comets', 'Orange Outlaws', 'Lime Legends'],

  // Reconnect
  RECONNECT_TIMEOUT: 30000,  // 30 seconds to reconnect
};
