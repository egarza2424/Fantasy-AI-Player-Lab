const BASE_WEIGHTS = {
  opportunity: 0.18,
  production: 0.22,
  usage: 0.15,
  playCallerMatchup: 0.07,
  playerVsDefensiveCaller: 0.07,
  redzone: 0.10,
  matchup: 0.10,
  expert: 0.06,
  risk: 0.05
};

const riskProfiles = {
  conservative: {
    opportunity: 0.15,
    production: 0.13,
    usage: 0.12,
    playCallerMatchup: 0.10,
    playerVsDefensiveCaller: 0.10,
    redzone: 0.10,
    matchup: 0.08,
    expert: 0.10,
    risk: 0.12
  },

  balanced: BASE_WEIGHTS,

  aggressive: {
    opportunity: 0.17,
    production: 0.17,
    usage: 0.12,
    playCallerMatchup: 0.13,
    playerVsDefensiveCaller: 0.13,
    redzone: 0.12,
    matchup: 0.08,
    expert: 0.05,
    risk: 0.03
  }
};
const metricDescriptions = {
  Opportunity: {
    weight: "18%",
    description:
      "Measures how often a player has the chance to produce compared with others at the same position. QB: pass attempts + carries. RB: carries + targets. WR/TE: targets + carries."
  },

  "Recent Production": {
  weight: "22%",
  description:
    "Measures average PPR fantasy production over the player's four most recent games compared with other players at the same position. The highest-scoring player at each position receives 100, with all other players scored proportionally."
},
  
  Usage: {
    weight: "15%",
    description:
      "Measures how heavily a player is involved in the offense. WR/TE uses team target share, RB uses team rushing-attempt share, and QB uses passing + rushing attempts."
  },

  Matchup: {
    weight: "10%",
    description:
      "Evaluates the player's next opponent using PPR fantasy points that defense allowed to the player's position last season. Easier matchups receive higher scores."
  },

  "Red-Zone Usage": {
    weight: "10%",
    description:
      "Measures involvement inside the opponent's 20-yard line. QB uses red-zone pass attempts + carries. RB/WR/TE use their share of team red-zone carries + targets."
  },

  "Model Confidence": {
    weight: "6%",
    description:
      "Measures how dependable the player's projection appears based on recent production consistency, opportunity stability, usage stability and availability."
  },
  
  "Play Caller Matchup": {
    weight: "7%",
    description:
      "Measures how the player's current offensive play caller has historically produced at this position against the upcoming opponent's defensive play caller. Uses up to the four most recent applicable meetings. No direct history receives a neutral score of 50."
  },
  
  "Player vs Defensive Play Caller": {
    weight: "7%",
    description:
      "Measures how this individual player has historically performed in PPR scoring against defenses called by the upcoming opponent's current defensive play caller. Uses up to the four most recent applicable games. No direct history receives a neutral score of 50."
},  
  
  "Risk Adjustment": {
    weight: "5%",
    description:
      "Measures player reliability using injury status, practice participation, roster status, depth-chart role, experience and age. A higher score means lower risk."
  }
};
let players = [];
let weeklyStats = [];
let defensePositionAllowed = {};
let teamNextOpponent = {};
let currentPlayCallerSignals = {};
let currentPlayerVsDefensiveCaller = {};
const playerASelect = document.getElementById("playerA");
const playerBSelect = document.getElementById("playerB");
const riskSelect = document.getElementById("riskTolerance");
const compareButton = document.getElementById("compareBtn");
const resultsContainer = document.getElementById("result");
const playerASearch = document.getElementById("playerASearch");
const playerBSearch = document.getElementById("playerBSearch");
const playerAResults = document.getElementById("playerAResults");
const playerBResults = document.getElementById("playerBResults");

async function loadWeeklyStats() {
  try {
const response = await fetch(
  "./nfl-stats.json?v=11",
  { cache: "no-store" }
);

    if (!response.ok) {
      throw new Error(
        `Could not load nfl-stats.json: ${response.status}`
      );
    }

    const data = await response.json();

    weeklyStats = data.players || [];
    defensePositionAllowed =
      data.defense_position_allowed || {};
    teamNextOpponent =
      data.team_next_opponent || {};
    currentPlayCallerSignals =
      data.current_play_caller_signals || {};

    currentPlayerVsDefensiveCaller =
      data.current_player_vs_defensive_caller || {};

  console.log(
  `NFL stats loaded: ${data.season}, ${weeklyStats.length} rows`
);

console.log(
  "Defensive matchup teams:",
  Object.keys(defensePositionAllowed).length
);

console.log(
  "Next-opponent teams:",
  Object.keys(teamNextOpponent).length
);

console.log(
  "Current play-caller signal teams:",
  Object.keys(currentPlayCallerSignals).length
);

console.log(
  "Current player-vs-defensive-caller signals:",
  Object.keys(currentPlayerVsDefensiveCaller).length
);

} catch (error) {
  console.error("Local NFL stats error:", error);
  weeklyStats = [];
}
}
function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[.'’-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlayerWeeklyStats(player) {
  if (!player || !Array.isArray(weeklyStats) || weeklyStats.length === 0) {
    return [];
  }

  const playerName = normalizeName(player.name);

  const matches = weeklyStats.filter((row) => {
    const fullName = normalizeName(row.player_display_name);
    const shortName = normalizeName(row.player_name);

    return (
      fullName === playerName ||
      fullName.includes(playerName) ||
      playerName.includes(fullName) ||
      shortName === playerName
    );
  });


  return matches;
}

function calculateProductionScore(player) {
  const games = getPlayerWeeklyStats(player);

  if (games.length === 0) {
    return 20;
  }

  function getFantasyPoints(game) {
    const passingYards =
      Number(game.passing_yards || 0);

    const passingTDs =
      Number(game.passing_tds || 0);

    const interceptions =
      Number(game.interceptions || 0);

    const rushingYards =
      Number(game.rushing_yards || 0);

    const rushingTDs =
      Number(game.rushing_tds || 0);

    const receptions =
      Number(game.receptions || 0);

    const receivingYards =
      Number(game.receiving_yards || 0);

    const receivingTDs =
      Number(game.receiving_tds || 0);

    return (
      passingYards / 25 +
      passingTDs * 4 -
      interceptions * 2 +
      rushingYards / 10 +
      rushingTDs * 6 +
      receptions +
      receivingYards / 10 +
      receivingTDs * 6
    );
  }

  function getRecentAverage(playerGames) {
    const recentGames =
      [...playerGames]
        .sort(
          (a, b) =>
            Number(b.week || 0) -
            Number(a.week || 0)
        )
        .slice(0, 4);

    if (recentGames.length === 0) {
      return 0;
    }

    const total =
      recentGames.reduce(
        (sum, game) =>
          sum + getFantasyPoints(game),
        0
      );

    return total / recentGames.length;
  }

  const playerAverage =
    getRecentAverage(games);

  const positionPlayers = {};

  weeklyStats.forEach((game) => {
    if (game.position !== player.position) {
      return;
    }

    const name = normalizeName(
      game.player_display_name ||
      game.player_name ||
      game.name
    );

    if (!name) {
      return;
    }

    if (!positionPlayers[name]) {
      positionPlayers[name] = [];
    }

    positionPlayers[name].push(game);
  });

  const positionAverages =
    Object.values(positionPlayers)
      .map((playerGames) =>
        getRecentAverage(playerGames)
      )
      .filter((average) =>
        Number.isFinite(average) &&
        average > 0
      );

  if (positionAverages.length === 0) {
    return 50;
  }

  const leagueHigh =
    Math.max(...positionAverages);

  if (leagueHigh <= 0) {
    return 50;
  }

  const score =
    (playerAverage / leagueHigh) * 100;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

function calculateUsageScore(player) {
  const games = getPlayerWeeklyStats(player);

  if (games.length === 0) {
    return 20;
  }

  // QB usage:
  // Pass attempts + rush attempts per game,
  // compared with every other QB in the league.
  if (player.position === "QB") {
    const qbTotals = {};

    weeklyStats.forEach((game) => {
      if (game.position !== "QB") return;

      const name = normalizeName(
        game.player_display_name ||
        game.player_name ||
        game.name
      );

      if (!name) return;

      if (!qbTotals[name]) {
        qbTotals[name] = {
          opportunities: 0,
          games: 0
        };
      }

      const passAttempts = Number(
        game.attempts ||
        game.passing_attempts ||
        0
      );

      const rushAttempts = Number(
        game.carries ||
        game.rushing_attempts ||
        0
      );

      qbTotals[name].opportunities +=
        passAttempts + rushAttempts;

      qbTotals[name].games += 1;
    });

    const qbAverages = Object.values(qbTotals)
      .filter((qb) => qb.games > 0)
      .map(
        (qb) =>
          qb.opportunities / qb.games
      );

    const leagueHigh =
      qbAverages.length > 0
        ? Math.max(...qbAverages)
        : 1;

    const playerName = normalizeName(player.name);
    const playerData = qbTotals[playerName];

    if (!playerData || playerData.games === 0) {
      return 50;
    }

    const playerAverage =
      playerData.opportunities /
      playerData.games;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (playerAverage / leagueHigh) * 100
        )
      )
    );
  }

  let totalShare = 0;
  let validGames = 0;

  games.forEach((game) => {
    const week = Number(game.week);
    const team = game.team;

    if (!team || !week) {
      return;
    }

    // Find everyone from the same team
    // in the same game.
    const teamGameRows = weeklyStats.filter(
      (row) =>
        row.team === team &&
        Number(row.week) === week
    );

    // WR and TE:
    // Player targets / total team targets.
    if (
      player.position === "WR" ||
      player.position === "TE"
    ) {
      const playerTargets =
        Number(game.targets || 0);

      const teamTargets = teamGameRows.reduce(
        (total, row) =>
          total + Number(row.targets || 0),
        0
      );

      if (teamTargets > 0) {
        totalShare +=
          playerTargets / teamTargets;

        validGames += 1;
      }
    }

    // RB:
    // Player rush attempts / total team rush attempts.
    if (player.position === "RB") {
      const playerCarries = Number(
        game.carries ||
        game.rushing_attempts ||
        0
      );

      const teamCarries = teamGameRows.reduce(
        (total, row) =>
          total +
          Number(
            row.carries ||
            row.rushing_attempts ||
            0
          ),
        0
      );

      if (teamCarries > 0) {
        totalShare +=
          playerCarries / teamCarries;

        validGames += 1;
      }
    }
  });

  if (validGames === 0) {
    return 50;
  }

  const averageShare =
    totalShare / validGames;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(averageShare * 100)
    )
  );
}

function calculateOpportunityScore(player) {
  const games = getPlayerWeeklyStats(player);

  if (games.length === 0) {
    return 20;
  }

  const position = player.position;
  const playerTotals = {};

  weeklyStats.forEach((game) => {
    if (game.position !== position) {
      return;
    }

    const name = normalizeName(
      game.player_display_name ||
      game.player_name ||
      game.name
    );

    if (!name) {
      return;
    }

    if (!playerTotals[name]) {
      playerTotals[name] = {
        opportunities: 0,
        games: 0
      };
    }

    const carries = Number(
      game.carries ||
      game.rushing_attempts ||
      0
    );

    const targets = Number(game.targets || 0);

    const passAttempts = Number(
      game.attempts ||
      game.passing_attempts ||
      0
    );

    let opportunities = 0;

    if (position === "QB") {
      opportunities =
        passAttempts + carries;
    }

    if (position === "RB") {
      opportunities =
        carries + targets;
    }

    if (
      position === "WR" ||
      position === "TE"
    ) {
      opportunities =
        targets + carries;
    }

    playerTotals[name].opportunities +=
      opportunities;

    playerTotals[name].games += 1;
  });

  const playerAverages = Object.values(playerTotals)
    .filter((data) => data.games > 0)
    .map(
      (data) =>
        data.opportunities / data.games
    );

  if (playerAverages.length === 0) {
    return 50;
  }

  const leagueHigh =
    Math.max(...playerAverages);

  const playerName = normalizeName(player.name);
  const playerData = playerTotals[playerName];

  if (!playerData || playerData.games === 0) {
    return 50;
  }

  const playerAverage =
    playerData.opportunities /
    playerData.games;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (playerAverage / leagueHigh) * 100
      )
    )
  );
}
function calculateRedZoneScore(player) {
  const games = getPlayerWeeklyStats(player);

  if (games.length === 0) {
    return 50;
  }

  if (player.position === "QB") {
    const qbTotals = {};

    weeklyStats.forEach((game) => {
      if (game.position !== "QB") {
        return;
      }

      const name = normalizeName(
        game.player_display_name ||
        game.player_name ||
        game.name
      );

      if (!name) {
        return;
      }

      if (!qbTotals[name]) {
        qbTotals[name] = {
          redZoneOpportunities: 0,
          games: 0
        };
      }

      const rzPassAttempts = Number(
        game.red_zone_pass_attempts || 0
      );

      const rzCarries = Number(
        game.red_zone_carries || 0
      );

      qbTotals[name].redZoneOpportunities +=
        rzPassAttempts + rzCarries;

      qbTotals[name].games += 1;
    });

    const qbAverages = Object.values(qbTotals)
      .filter((qb) => qb.games > 0)
      .map(
        (qb) =>
          qb.redZoneOpportunities / qb.games
      );

    if (qbAverages.length === 0) {
      return 50;
    }

    const leagueHigh = Math.max(...qbAverages);

    if (leagueHigh <= 0) {
      return 50;
    }

    const playerName = normalizeName(player.name);
    const playerData = qbTotals[playerName];

    if (!playerData || playerData.games === 0) {
      return 50;
    }

    const playerAverage =
      playerData.redZoneOpportunities /
      playerData.games;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (playerAverage / leagueHigh) * 100
        )
      )
    );
  }

  let playerRedZoneOpportunities = 0;
  let teamRedZoneOpportunities = 0;

  games.forEach((game) => {
    const week = Number(game.week);
    const team = game.team;

    if (!team || !week) {
      return;
    }

    const playerCarries = Number(
      game.red_zone_carries || 0
    );

    const playerTargets = Number(
      game.red_zone_targets || 0
    );

    playerRedZoneOpportunities +=
      playerCarries + playerTargets;

    const teamGameRows = weeklyStats.filter(
      (row) =>
        row.team === team &&
        Number(row.week) === week
    );

    const teamGameRedZoneOpportunities =
      teamGameRows.reduce(
        (total, row) =>
          total +
          Number(row.red_zone_carries || 0) +
          Number(row.red_zone_targets || 0),
        0
      );

    teamRedZoneOpportunities +=
      teamGameRedZoneOpportunities;
  });

  if (teamRedZoneOpportunities <= 0) {
    return 50;
  }

  const share =
    playerRedZoneOpportunities /
    teamRedZoneOpportunities;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(share * 100)
    )
  );
}
function calculateMatchupScore(player) {
  if (
    !player ||
    !player.team ||
    !player.position
  ) {
    return 50;
  }

  const teamCode =
    player.team === "LAR" ? "LA" : player.team;

  const nextGame =
    teamNextOpponent[teamCode];
  if (
    !nextGame ||
    !nextGame.opponent
  ) {
    return 50;
  }

  const opponent =
    nextGame.opponent;

  const opponentDefense =
    defensePositionAllowed[opponent];

  if (
    !opponentDefense ||
    opponentDefense[player.position] === undefined
  ) {
    return 50;
  }

  const opponentPointsAllowed =
    Number(
      opponentDefense[player.position]
    );

  const positionValues = Object.values(
    defensePositionAllowed
  )
    .map((defense) =>
      Number(defense[player.position])
    )
    .filter((value) =>
      Number.isFinite(value)
    );

  if (positionValues.length < 2) {
    return 50;
  }

  const leagueHigh =
    Math.max(...positionValues);

  const leagueLow =
    Math.min(...positionValues);

  if (leagueHigh === leagueLow) {
    return 50;
  }
  
  const normalized =
    (
      (opponentPointsAllowed - leagueLow) /
      (leagueHigh - leagueLow)
    );

  const score =
    20 + normalized * 60;

  return Math.max(
    20,
    Math.min(
      80,
      Math.round(score)
    )
  );
}
function calculatePlayCallerMatchupScore(player) {
  if (
    !player ||
    !player.team ||
    !player.position
  ) {
    return 50;
  }

  const teamCode =
    player.team === "LA"
      ? "LAR"
      : player.team;

  const teamSignal =
    currentPlayCallerSignals[teamCode];

  if (
    !teamSignal ||
    !teamSignal.positions
  ) {
    return 50;
  }

  const positionSignal =
    teamSignal.positions[player.position];

  if (!positionSignal) {
    return 50;
  }

const rawScore = Number(
  positionSignal.score
);

if (!Number.isFinite(rawScore)) {
  return 50;
}

const sampleSize =
  Number(positionSignal.sample_size || 0);

let sampleConfidence = 0;

if (sampleSize >= 4) {
  sampleConfidence = 1;
} else if (sampleSize === 3) {
  sampleConfidence = 0.8;
} else if (sampleSize === 2) {
  sampleConfidence = 0.6;
} else if (sampleSize === 1) {
  sampleConfidence = 0.4;
}

const adjustedScore =
  50 +
  (rawScore - 50) *
  sampleConfidence;

return Math.max(
  0,
  Math.min(
    100,
    Math.round(adjustedScore)
  )
);
}
function calculatePlayerVsDefensiveCallerScore(player) {
  if (!player || !player.name) {
    return 50;
  }

  const playerName =
    normalizeName(player.name);

  const matchingEntry =
    Object.values(
      currentPlayerVsDefensiveCaller
    ).find((signal) => {
      const signalName =
        normalizeName(
          signal.player_name ||
          signal.name ||
          ""
        );

      return signalName === playerName;
    });

  if (!matchingEntry) {
    return 50;
  }

  const rawScore =
  Number(matchingEntry.score);

if (!Number.isFinite(rawScore)) {
  return 50;
}

const sampleSize =
  Number(matchingEntry.sample_size || 0);

let sampleConfidence = 0;

if (sampleSize >= 4) {
  sampleConfidence = 1;
} else if (sampleSize === 3) {
  sampleConfidence = 0.8;
} else if (sampleSize === 2) {
  sampleConfidence = 0.6;
} else if (sampleSize === 1) {
  sampleConfidence = 0.4;
}

const adjustedScore =
  50 +
  (rawScore - 50) *
  sampleConfidence;

return Math.max(
  0,
  Math.min(
    100,
    Math.round(adjustedScore)
  )
);
}
function getPlayCallerMatchupDetails(player) {
  if (
    !player ||
    !player.team ||
    !player.position
  ) {
    return null;
  }

  const teamCode =
    player.team === "LA"
      ? "LAR"
      : player.team;

  const teamSignal =
    currentPlayCallerSignals[teamCode];

  if (
    !teamSignal ||
    !teamSignal.positions
  ) {
    return null;
  }

  const positionSignal =
    teamSignal.positions[player.position];

  if (!positionSignal) {
    return null;
  }

  return {
    offensivePlayCaller:
      teamSignal.offensive_play_caller ||
      "Unknown",

    defensivePlayCaller:
      teamSignal.opponent_defensive_play_caller ||
      "Unknown",

    opponent:
      teamSignal.opponent ||
      "Unknown",

    averagePpr:
      positionSignal.average_ppr,

    sampleSize:
      Number(positionSignal.sample_size || 0)
  };
}


function getPlayerVsDefensiveCallerDetails(player) {
  if (!player || !player.name) {
    return null;
  }

  const playerName =
    normalizeName(player.name);

  const matchingEntry =
    Object.values(
      currentPlayerVsDefensiveCaller
    ).find((signal) => {
      const signalName =
        normalizeName(
          signal.player_name ||
          signal.name ||
          ""
        );

      return signalName === playerName;
    });

  if (!matchingEntry) {
    return null;
  }

  return {
    defensivePlayCaller:
      matchingEntry.defensive_play_caller ||
      "Unknown",

    opponent:
      matchingEntry.opponent ||
      "Unknown",

    averagePpr:
      matchingEntry.average_ppr,

    sampleSize:
      Number(matchingEntry.sample_size || 0)
  };
}

function calculateModelConfidence(player) {
  const games = getPlayerWeeklyStats(player);

  if (games.length === 0) {
    return 50;
  }

  const recentGames = [...games]
    .sort(
      (a, b) =>
        Number(b.week || 0) -
        Number(a.week || 0)
    )
    .slice(0, 4);

  if (recentGames.length < 2) {
    return 50;
  }

  function stabilityScore(values) {
    const validValues = values.filter(
      (value) => Number.isFinite(value)
    );

    if (validValues.length < 2) {
      return 50;
    }

    const average =
      validValues.reduce(
        (total, value) => total + value,
        0
      ) / validValues.length;

    if (average <= 0) {
      return 50;
    }

    const variance =
      validValues.reduce(
        (total, value) =>
          total +
          Math.pow(value - average, 2),
        0
      ) / validValues.length;

    const standardDeviation =
      Math.sqrt(variance);

    const coefficientOfVariation =
      standardDeviation / average;

    const score =
      100 - coefficientOfVariation * 100;

    return Math.max(
      20,
      Math.min(
        100,
        Math.round(score)
      )
    );
  }

  const fantasyPoints = recentGames.map(
    (game) => {
      const passingYards =
        Number(game.passing_yards || 0);

      const passingTDs =
        Number(game.passing_tds || 0);

      const interceptions =
        Number(game.interceptions || 0);

      const rushingYards =
        Number(game.rushing_yards || 0);

      const rushingTDs =
        Number(game.rushing_tds || 0);

      const receptions =
        Number(game.receptions || 0);

      const receivingYards =
        Number(game.receiving_yards || 0);

      const receivingTDs =
        Number(game.receiving_tds || 0);

      return (
        passingYards / 25 +
        passingTDs * 4 -
        interceptions * 2 +
        rushingYards / 10 +
        rushingTDs * 6 +
        receptions +
        receivingYards / 10 +
        receivingTDs * 6
      );
    }
  );

  const opportunityValues =
    recentGames.map((game) => {
      const carries =
        Number(game.carries || 0);

      const targets =
        Number(game.targets || 0);

      const passAttempts =
        Number(game.attempts || 0);

      if (player.position === "QB") {
        return passAttempts + carries;
      }

      if (player.position === "RB") {
        return carries + targets;
      }

      return targets + carries;
    });

  const usageValues =
    recentGames.map((game) => {
      const week = Number(game.week);
      const team = game.team;

      if (!team || !week) {
        return 0;
      }

      const teamGameRows =
        weeklyStats.filter(
          (row) =>
            row.team === team &&
            Number(row.week) === week
        );

      if (player.position === "QB") {
        return (
          Number(game.attempts || 0) +
          Number(game.carries || 0)
        );
      }

      if (
        player.position === "WR" ||
        player.position === "TE"
      ) {
        const teamTargets =
          teamGameRows.reduce(
            (total, row) =>
              total +
              Number(row.targets || 0),
            0
          );

        if (teamTargets <= 0) {
          return 0;
        }

        return (
          Number(game.targets || 0) /
          teamTargets
        );
      }

      const teamCarries =
        teamGameRows.reduce(
          (total, row) =>
            total +
            Number(row.carries || 0),
          0
        );

      if (teamCarries <= 0) {
        return 0;
      }

      return (
        Number(game.carries || 0) /
        teamCarries
      );
    });

  const productionConsistency =
    stabilityScore(fantasyPoints);

  const opportunityStability =
    stabilityScore(opportunityValues);

  const usageStability =
    stabilityScore(usageValues);

  const availability =
    100 - calculatePlayerRisk(player);

  const confidence =
    productionConsistency * 0.35 +
    opportunityStability * 0.30 +
    usageStability * 0.20 +
    availability * 0.15;

  return Math.max(
    20,
    Math.min(
      100,
      Math.round(confidence)
    )
  );
}
function getModelConfidenceBreakdown(player) {
  const games = getPlayerWeeklyStats(player);

  if (games.length < 2) {
    return null;
  }

  const recentGames = [...games]
    .sort(
      (a, b) =>
        Number(b.week || 0) -
        Number(a.week || 0)
    )
    .slice(0, 4);

  function stabilityScore(values) {
    const validValues = values.filter(
      (value) => Number.isFinite(value)
    );

    if (validValues.length < 2) {
      return 50;
    }

    const average =
      validValues.reduce(
        (total, value) => total + value,
        0
      ) / validValues.length;

    if (average <= 0) {
      return 50;
    }

    const variance =
      validValues.reduce(
        (total, value) =>
          total +
          Math.pow(value - average, 2),
        0
      ) / validValues.length;

    const standardDeviation =
      Math.sqrt(variance);

    const coefficientOfVariation =
      standardDeviation / average;

    return Math.max(
      20,
      Math.min(
        100,
        Math.round(
          100 -
          coefficientOfVariation * 100
        )
      )
    );
  }

  const fantasyPoints =
    recentGames.map((game) => (
      Number(game.passing_yards || 0) / 25 +
      Number(game.passing_tds || 0) * 4 -
      Number(game.interceptions || 0) * 2 +
      Number(game.rushing_yards || 0) / 10 +
      Number(game.rushing_tds || 0) * 6 +
      Number(game.receptions || 0) +
      Number(game.receiving_yards || 0) / 10 +
      Number(game.receiving_tds || 0) * 6
    ));

  const opportunityValues =
    recentGames.map((game) => {
      const carries =
        Number(game.carries || 0);

      const targets =
        Number(game.targets || 0);

      const passAttempts =
        Number(game.attempts || 0);

      if (player.position === "QB") {
        return passAttempts + carries;
      }

      if (player.position === "RB") {
        return carries + targets;
      }

      return targets + carries;
    });

  const usageValues =
    recentGames.map((game) => {
      const week = Number(game.week);
      const team = game.team;

      const teamGameRows =
        weeklyStats.filter(
          (row) =>
            row.team === team &&
            Number(row.week) === week
        );

      if (player.position === "QB") {
        return (
          Number(game.attempts || 0) +
          Number(game.carries || 0)
        );
      }

      if (
        player.position === "WR" ||
        player.position === "TE"
      ) {
        const teamTargets =
          teamGameRows.reduce(
            (total, row) =>
              total +
              Number(row.targets || 0),
            0
          );

        return teamTargets > 0
          ? Number(game.targets || 0) /
            teamTargets
          : 0;
      }

      const teamCarries =
        teamGameRows.reduce(
          (total, row) =>
            total +
            Number(row.carries || 0),
          0
        );

      return teamCarries > 0
        ? Number(game.carries || 0) /
          teamCarries
        : 0;
    });

  return {
    productionConsistency:
      stabilityScore(fantasyPoints),

    opportunityStability:
      stabilityScore(opportunityValues),

    usageStability:
      stabilityScore(usageValues),

    availability:
      100 - calculatePlayerRisk(player)
  };
}
function setupPlayerSearch(input, resultsBox, selectElement) {
  if (!input || !resultsBox || !selectElement) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    resultsBox.innerHTML = "";

    if (!query) {
      resultsBox.classList.remove("active");
      return;
    }

    const matches = players
      .filter((player) =>
        `${player.name} ${player.position} ${player.team}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 8);

    if (matches.length === 0) {
      resultsBox.innerHTML =
        '<div class="player-search-empty">No players found</div>';
      resultsBox.classList.add("active");
      return;
    }

    matches.forEach((player) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "player-search-option";
      option.innerHTML = `
        <strong>${player.name}</strong>
        <span>${player.position} • ${player.team}</span>
      `;

      option.addEventListener("click", () => {
        selectElement.value = player.id;
        input.value = `${player.name} — ${player.position} — ${player.team}`;
        resultsBox.innerHTML = "";
        resultsBox.classList.remove("active");
      });

      resultsBox.appendChild(option);
    });

    resultsBox.classList.add("active");
  });

  input.addEventListener("focus", () => {
    if (input.value.length > 0) {
      input.dispatchEvent(new Event("input"));
    }
  });
}

async function loadPlayers() {
  try {
    const positions = ["QB", "RB", "WR", "TE"];

    const requests = positions.map((position) =>
      fetch(`https://api.sleeper.app/v1/players/nfl?position=${position}&active=true`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Could not load ${position} players`);
          }
          return response.json();
        })
    );

    const responses = await Promise.all(requests);
    const sleeperPlayers = responses.flatMap((playerMap) =>
      Object.values(playerMap)
    );

    const uniquePlayers = new Map();

    sleeperPlayers.forEach((player) => {
      if (
        player.player_id &&
        player.first_name &&
        player.last_name &&
        player.team &&
        ["QB", "RB", "WR", "TE"].includes(player.position)
      ) {
        uniquePlayers.set(player.player_id, {
          id: player.player_id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          team: player.team,
          status: player.status || "Unknown",
          injuryStatus: player.injury_status || null,
          injuryStartDate: player.injury_start_date || null,
          practiceParticipation: player.practice_participation || null,
          depthChartPosition: player.depth_chart_position ?? null,
          depthChartOrder: player.depth_chart_order ?? null,
          age: player.age ?? null,
          yearsExp: player.years_exp ?? null,
          number: player.number ?? null
        });
      }
    });

    const positionOrder = { QB: 1, RB: 2, WR: 3, TE: 4 };

    players = Array.from(uniquePlayers.values()).sort((a, b) => {
      if (a.position !== b.position) {
        return positionOrder[a.position] - positionOrder[b.position];
      }
      return a.name.localeCompare(b.name);
    });

    populatePlayerSelectors();

    setupPlayerSearch(playerASearch, playerAResults, playerASelect);
    setupPlayerSearch(playerBSearch, playerBResults, playerBSelect);

    if (players.length >= 2) {
      playerASelect.value =
        players.find((player) => player.name === "Puka Nacua")?.id ||
        players[0].id;

      playerBSelect.value =
        players.find((player) => player.name === "Christian Watson")?.id ||
        players[1].id;

      const defaultA = getPlayer(playerASelect.value);
      const defaultB = getPlayer(playerBSelect.value);

      if (defaultA) {
        playerASearch.value =
          `${defaultA.name} — ${defaultA.position} — ${defaultA.team}`;
      }

      if (defaultB) {
        playerBSearch.value =
          `${defaultB.name} — ${defaultB.position} — ${defaultB.team}`;
      }


    }
  } catch (error) {
    console.error("NFL player loading error:", error);

    resultsContainer.innerHTML = `
      <div class="result-card">
        <h3>Unable to load NFL players</h3>
        <p>The live NFL player database could not be reached.</p>
      </div>
    `;
  }
}

function populatePlayerSelectors() {
  playerASelect.innerHTML = "";
  playerBSelect.innerHTML = "";

  players.forEach((player) => {
    const label = `${player.name} — ${player.position} — ${player.team}`;

    const optionA = document.createElement("option");
    optionA.value = player.id;
    optionA.textContent = label;

    const optionB = document.createElement("option");
    optionB.value = player.id;
    optionB.textContent = label;

    playerASelect.appendChild(optionA);
    playerBSelect.appendChild(optionB);
  });

  if (players.length > 1) {
    playerASelect.value = players[0].id;
    playerBSelect.value = players[1].id;
  }
}

function getPlayer(id) {
  return players.find((player) => player.id === id);
}

function calculatePlayerRisk(player) {
  let risk = 5;

  const injury = (player.injuryStatus || "").toLowerCase();
  const practice = (player.practiceParticipation || "").toLowerCase();
  const status = (player.status || "").toLowerCase();

  // Injury designation
  if (injury.includes("out")) {
    risk += 75;
  } else if (injury.includes("doubtful")) {
    risk += 60;
  } else if (injury.includes("questionable")) {
    risk += 30;
  } else if (injury.includes("probable")) {
    risk += 8;
  }

  // Practice participation
  if (
    practice.includes("did not participate") ||
    practice.includes("dnp")
  ) {
    risk += 25;
  } else if (practice.includes("limited")) {
    risk += 12;
  } else if (practice.includes("full")) {
    risk -= 3;
  }

  // Active roster status
  if (
    status.includes("inactive") ||
    status.includes("reserve") ||
    status.includes("suspended")
  ) {
    risk += 35;
  }

  // Depth-chart role
  if (player.depthChartOrder) {
    if (player.depthChartOrder >= 4) {
      risk += 25;
    } else if (player.depthChartOrder === 3) {
      risk += 16;
    } else if (player.depthChartOrder === 2) {
      risk += 8;
    } else if (player.depthChartOrder === 1) {
      risk -= 3;
    }
  }

  // Experience uncertainty
  if (player.yearsExp !== null && player.yearsExp !== undefined) {
    if (player.yearsExp === 0) {
      risk += 8;
    } else if (player.yearsExp === 1) {
      risk += 4;
    }
  }

  // Age-based availability risk
  if (player.age) {
    if (player.age >= 33) {
      risk += 8;
    } else if (player.age >= 30) {
      risk += 4;
    }
  }

  return Math.max(0, Math.min(100, Math.round(risk)));
}

function getMetrics(player) {
  const production =
    calculateProductionScore(player);

  const usage =
    calculateUsageScore(player);

  const opportunity =
    calculateOpportunityScore(player);

  const matchup =
    calculateMatchupScore(player);

  const playCallerMatchup =
    calculatePlayCallerMatchupScore(player);

  const playerVsDefensiveCaller =
    calculatePlayerVsDefensiveCallerScore(player);

  const redzone =
    calculateRedZoneScore(player);

  const expert =
    calculateModelConfidence(player);

  const risk =
    calculatePlayerRisk(player);

  return {
    opportunity,
    production,
    usage,
    matchup,
    playCallerMatchup,
    playerVsDefensiveCaller,
    redzone,
    expert,
    risk
  };
}
function calculateScore(player, profile) {
  const metrics = getMetrics(player);
  const weights = riskProfiles[profile] || BASE_WEIGHTS;

  const score =
  metrics.opportunity * weights.opportunity +
  metrics.production * weights.production +
  metrics.usage * weights.usage +
  metrics.playCallerMatchup *
    weights.playCallerMatchup +
  metrics.playerVsDefensiveCaller *
    weights.playerVsDefensiveCaller +
  metrics.redzone * weights.redzone +
  metrics.matchup * weights.matchup +
  metrics.expert * weights.expert +
  (100 - metrics.risk) * weights.risk;

  return Number(score.toFixed(1));
}
const rankingCache = {};

function getPositionRankings(position, profile) {
  const cacheKey = `${profile}-${position}`;

  if (rankingCache[cacheKey]) {
    return rankingCache[cacheKey];
  }

  const relevantPlayers = players.filter((player) => {
    if (player.position !== position) {
      return false;
    }

    const hasStats =
      getPlayerWeeklyStats(player).length > 0;

    const depthOrder =
      Number(player.depthChartOrder || 0);

    if (position === "QB") {
      return depthOrder === 1 || hasStats;
    }

    if (position === "RB") {
      return (
        (depthOrder >= 1 && depthOrder <= 3) ||
        hasStats
      );
    }

    if (position === "WR") {
  return (
    (depthOrder >= 1 && depthOrder <= 3) ||
    hasStats
  );
}
    if (position === "TE") {
      return (
        (depthOrder >= 1 && depthOrder <= 2) ||
        hasStats
      );
    }

    return false;
  });

  const rankings = relevantPlayers
    .map((player) => ({
      player,
      score: calculateScore(player, profile)
    }))
    .sort((a, b) =>
      b.score - a.score ||
      a.player.name.localeCompare(b.player.name)
    );

  rankingCache[cacheKey] = rankings;

  console.log(
  `${position} rankings`,
  rankings.map((entry, index) => ({
    rank: index + 1,
    player: entry.player.name,
    team: entry.player.team,
    score: entry.score
  }))
);
  
  return rankings;
}

function getPlayerPositionRank(player, profile) {
  if (!player || !player.position) {
    return null;
  }

  const rankings =
    getPositionRankings(player.position, profile);

  const index = rankings.findIndex(
    (entry) => entry.player.id === player.id
  );

  return index >= 0 ? index + 1 : null;
}

function getRecommendation(player, positionRank) {
  if (!player || !positionRank) {
    return "SIT";
  }

  if (player.position === "QB") {
    return positionRank <= 12
      ? "START"
      : "SIT";
  }

  if (player.position === "RB") {
    if (positionRank <= 24) {
      return "START";
    }

    if (positionRank <= 36) {
      return "FLEX";
    }

    return "SIT";
  }

  if (player.position === "WR") {
    if (positionRank <= 24) {
      return "START";
    }

    if (positionRank <= 36) {
      return "FLEX";
    }

    return "SIT";
  }

  if (player.position === "TE") {
    return positionRank <= 12
      ? "START"
      : "SIT";
  }

  return "SIT";
}
function getTopSignals(player) {
  const metrics = getMetrics(player);

 const positiveSignals = [
  ["Recent Production", metrics.production],
  ["Opportunity", metrics.opportunity],
  ["Usage", metrics.usage],
  ["Red-Zone Usage", metrics.redzone],
  ["Matchup", metrics.matchup],
  ["Play Caller Matchup", metrics.playCallerMatchup],
  [
    "Player vs Defensive Play Caller",
    metrics.playerVsDefensiveCaller
  ],
  ["Model Confidence", metrics.expert],
  ["Risk Adjustment", 100 - metrics.risk]
];

  return positiveSignals
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function metricRow(
  label,
  value,
  isRisk = false,
  breakdown = null,
  signalDetails = null
) {
  const info =
    metricDescriptions[label];

  const description = info
    ? info.description
    : "";

  const weight = info
    ? info.weight
    : "";

  const breakdownHtml =
    label === "Model Confidence" &&
    breakdown
      ? `
        <div class="confidence-breakdown">
          <strong>Confidence breakdown</strong>

          <div>
            Production Consistency
            <span>
              ${breakdown.productionConsistency}/100
              · 35%
            </span>
          </div>

          <div>
            Opportunity Stability
            <span>
              ${breakdown.opportunityStability}/100
              · 30%
            </span>
          </div>

          <div>
            Usage Stability
            <span>
              ${breakdown.usageStability}/100
              · 20%
            </span>
          </div>

          <div>
            Availability
            <span>
              ${breakdown.availability}/100
              · 15%
            </span>
          </div>
        </div>
      `
      : "";
const signalDetailsHtml =
  signalDetails
    ? `
      <div class="confidence-breakdown">

        ${
          signalDetails.offensivePlayCaller
            ? `
              <div>
                Offensive Play Caller
                <span>
                  ${signalDetails.offensivePlayCaller}
                </span>
              </div>
            `
            : ""
        }

        <div>
          Defensive Play Caller
          <span>
            ${signalDetails.defensivePlayCaller}
          </span>
        </div>

        <div>
          Upcoming Opponent
          <span>
            ${signalDetails.opponent}
          </span>
        </div>

        <div>
          Historical PPR Average
          <span>
            ${
              signalDetails.averagePpr !== null &&
              signalDetails.averagePpr !== undefined
                ? Number(
                    signalDetails.averagePpr
                  ).toFixed(1)
                : "No history"
            }
          </span>
        </div>

        <div>
          Historical Sample
          <span>
            ${
              signalDetails.sampleSize === 1
                ? "1 game"
                : `${signalDetails.sampleSize} games`
            }
          </span>
        </div>

      </div>
    `
    : "";
  return `
    <div class="metric-row">
      <div class="metric-label-row">

        <span class="metric-name">
          ${label}

          <button
            type="button"
            class="metric-info-button"
            aria-label="Explain ${label}"
            onclick="
              this.closest('.metric-row')
                .querySelector('.metric-explanation')
                .classList.toggle('active')
            "
          >
            i
          </button>
        </span>

        <strong>${value}/100</strong>
      </div>

      <div class="metric-track">
        <div
          class="metric-fill"
          style="width:${value}%"
        ></div>
      </div>

      <div class="metric-explanation">
        <div class="metric-explanation-heading">
          <strong>${label}</strong>
      <span>
        ${
          weight === "Testing"
            ? "Testing — not yet included in score"
            : `${weight} of Balanced score`
        }
      </span>
        </div>

        <p>${description}</p>

        ${breakdownHtml}
        
        ${signalDetailsHtml}
      </div>
    </div>
  `;
}

function renderPlayerCard(
  player,
  score,
  recommendation,
  positionRank
) {
  const metrics = getMetrics(player);
  const topSignals = getTopSignals(player);
  const riskAdjustment = 100 - metrics.risk;
  const confidenceBreakdown =
  getModelConfidenceBreakdown(player);
  const playCallerDetails =
  getPlayCallerMatchupDetails(player);
  const playerVsCallerDetails =
  getPlayerVsDefensiveCallerDetails(player);

  return `
    <article class="player-result-card">
      <div class="player-result-top">
        <div>
          <h3 class="player-name">${player.name}</h3>
 <p class="player-meta">
  ${player.position} • ${player.team}
  ${
    positionRank
      ? ` • ${player.position}${positionRank}`
      : ""
  }
</p>

<div class="player-status">
  <span>
    Injury:
    <strong>
      ${player.injuryStatus || "None"}
    </strong>
  </span>

  <span>
    Practice:
    <strong>
      ${player.practiceParticipation || "No designation"}
    </strong>
  </span>

  ${
    player.depthChartOrder
      ? `
        <span>
          Depth chart:
          <strong>#${player.depthChartOrder}</strong>
        </span>
      `
      : ""
  }
</div>
        </div>

        <div class="recommendation-badge">
          ${recommendation}
        </div>
      </div>

      <div class="player-score">
        ${score}<span>/100</span>
      </div>

      <div class="why-section">
        <h4>Why this player?</h4>
        <ul>
          ${topSignals.map(([label, value]) => `
            <li>
              <strong>${label}</strong> ${value}/100
            </li>
          `).join("")}
        </ul>
      </div>

      <div class="metrics-section">
        ${metricRow("Opportunity", metrics.opportunity)}
        ${metricRow("Recent Production", metrics.production)}
        ${metricRow("Usage", metrics.usage)}
        ${metricRow("Matchup", metrics.matchup)}
        ${metricRow(
          "Play Caller Matchup",
          metrics.playCallerMatchup,
          false,
          null,
          playCallerDetails
        )}
        ${metricRow(
          "Player vs Defensive Play Caller",
          metrics.playerVsDefensiveCaller,
          false,
          null,
          playerVsCallerDetails
        )}
        ${metricRow("Red-Zone Usage", metrics.redzone)}
        ${metricRow(
          "Model Confidence",
          metrics.expert,
          false,
          confidenceBreakdown
        )}
        ${metricRow("Risk Adjustment", riskAdjustment, true)}
      </div>
    </article>
  `;
} 

function comparePlayers() {
  const playerA = getPlayer(playerASelect.value);
  const playerB = getPlayer(playerBSelect.value);

  if (!playerA || !playerB) {
    return;
  }

  const profile = riskSelect.value;

const scoreA =
  calculateScore(playerA, profile);

const scoreB =
  calculateScore(playerB, profile);

const positionRankA =
  getPlayerPositionRank(playerA, profile);

const positionRankB =
  getPlayerPositionRank(playerB, profile);

const recommendationA =
  getRecommendation(
    playerA,
    positionRankA
  );

const recommendationB =
  getRecommendation(
    playerB,
    positionRankB
  );

  const profileName =
    profile.charAt(0).toUpperCase() + profile.slice(1);

  resultsContainer.innerHTML = `
  <section class="comparison-results">
    <div class="comparison-heading">
      <p class="eyebrow">PLAYER COMPARISON</p>
      <h2>${playerA.name} vs. ${playerB.name}</h2>
      <p>${profileName} risk profile</p>
    </div>

    <div class="player-results-grid">
      ${renderPlayerCard(
        playerA,
        scoreA,
        recommendationA,
        positionRankA
      )}

      ${renderPlayerCard(
        playerB,
        scoreB,
        recommendationB,
        positionRankB
      )}
    </div>

    <div class="verdict-card">
      <p class="eyebrow">VERDICT</p>

      <h3>
        ${
          scoreA > scoreB
            ? `${playerA.name} gets the edge`
            : scoreB > scoreA
            ? `${playerB.name} gets the edge`
            : `This matchup is essentially even`
        }
      </h3>

      <p>
        ${
          scoreA > scoreB
            ? `${playerA.name} leads by ${(scoreA - scoreB).toFixed(1)} points in the current ${profileName.toLowerCase()} model.`
            : scoreB > scoreA
            ? `${playerB.name} leads by ${(scoreB - scoreA).toFixed(1)} points in the current ${profileName.toLowerCase()} model.`
            : `Both players currently score the same in the ${profileName.toLowerCase()} model.`
        }
      </p>

      <div class="verdict-scores">
        <div>
          <span>${playerA.name}</span>
          <strong>${scoreA}</strong>
        </div>

        <div>
          <span>${playerB.name}</span>
          <strong>${scoreB}</strong>
        </div>
      </div>
    </div>

    <div class="model-note">
      <strong>Model note:</strong>
      This MVP currently uses illustrative player metrics.
      The next product iteration will connect real NFL statistics,
      weekly matchup data, injuries, and expert consensus.
    </div>
  </section>
`;
}

compareButton.addEventListener("click", comparePlayers);

async function initializeApp() {
  // Load players first so search works immediately
  await loadPlayers();

  // Load weekly stats separately
  await loadWeeklyStats();

  // Do not auto-run the full positional ranking calculation.
  // Wait until the user chooses players.
}

initializeApp();
