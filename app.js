const BASE_WEIGHTS = {
  opportunity: 0.25,
  production: 0.20,
  usage: 0.15,
  matchup: 0.15,
  redzone: 0.10,
  expert: 0.10,
  risk: 0.05
};

const riskProfiles = {
  conservative: {
    opportunity: 0.23,
    production: 0.20,
    usage: 0.15,
    matchup: 0.12,
    redzone: 0.08,
    expert: 0.10,
    risk: 0.12
  },
  balanced: BASE_WEIGHTS,
  aggressive: {
    opportunity: 0.28,
    production: 0.22,
    usage: 0.15,
    matchup: 0.15,
    redzone: 0.10,
    expert: 0.08,
    risk: 0.02
  }
};

let players = [];
let weeklyStats = [];
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
    const response = await fetch("./nfl-stats.json?v=4");

    if (!response.ok) {
      throw new Error(
        `Could not load nfl-stats.json: ${response.status}`
      );
    }

    const data = await response.json();

    weeklyStats = data.players || [];

    alert(
      `NFL stats loaded successfully.\n` +
      `Season: ${data.season}\n` +
      `Stat rows: ${weeklyStats.length}`
    );

  } catch (error) {
    weeklyStats = [];

    alert(
      `NFL STATS FAILED TO LOAD:\n${error.message}`
    );
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

  console.log(
    "Stats match:",
    player.name,
    matches.length,
    matches.slice(0, 2)
  );

  return matches;
}

function calculateProductionScore(player) {
  const games = getPlayerWeeklyStats(player);
  if (games.length === 0) return 50;

  const recentGames = [...games]
    .sort((a, b) => Number(b.week || 0) - Number(a.week || 0))
    .slice(0, 4);

  let totalFantasyPoints = 0;

  recentGames.forEach((game) => {
    const passingYards = Number(game.passing_yards || 0);
    const passingTDs = Number(game.passing_tds || 0);
    const interceptions = Number(game.interceptions || 0);
    const rushingYards = Number(game.rushing_yards || 0);
    const rushingTDs = Number(game.rushing_tds || 0);
    const receptions = Number(game.receptions || 0);
    const receivingYards = Number(game.receiving_yards || 0);
    const receivingTDs = Number(game.receiving_tds || 0);

    const fantasyPoints =
      passingYards / 25 +
      passingTDs * 4 -
      interceptions * 2 +
      rushingYards / 10 +
      rushingTDs * 6 +
      receptions +
      receivingYards / 10 +
      receivingTDs * 6;

    totalFantasyPoints += fantasyPoints;
  });

  const average = totalFantasyPoints / recentGames.length;
  const score = (average / 25) * 100;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateUsageScore(player) {
  const games = getPlayerWeeklyStats(player);

  if (games.length === 0) {
    return 50;
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
    return 50;
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
        comparePlayers();
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
  const production = calculateProductionScore(player);
const usage = calculateUsageScore(player);
const opportunity = calculateOpportunityScore(player);
const risk = calculatePlayerRisk(player);
  
  return {
    opportunity,
    production,
    usage,
    matchup: 50,
    redzone: 50,
    expert: 50,
    risk
  };
}

function calculateScore(player, profile) {
  const metrics = getMetrics(player);
  const weights = riskProfiles[profile];

  const score =
    metrics.opportunity * weights.opportunity +
    metrics.production * weights.production +
    metrics.usage * weights.usage +
    metrics.matchup * weights.matchup +
    metrics.redzone * weights.redzone +
    metrics.expert * weights.expert +
    (100 - metrics.risk) * weights.risk;

  return Math.round(score * 10) / 10;
}

function getRecommendation(score, advantage) {
  if (score >= 82 || advantage >= 8) {
    return "START";
  }

  if (score >= 72 || advantage >= 2) {
    return "FLEX";
  }

  return "SIT";
}

function getTopSignals(player) {
  const metrics = getMetrics(player);

  const positiveSignals = [
    ["Expert Confidence", metrics.expert],
    ["Opportunity", metrics.opportunity],
    ["Recent Production", metrics.production],
    ["Usage", metrics.usage],
    ["Matchup", metrics.matchup],
    ["Red-Zone Usage", metrics.redzone],
    ["Risk Adjustment", 100 - metrics.risk]
  ];

  return positiveSignals
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function metricRow(label, value, isRisk = false) {
  const displayValue = isRisk ? `${value}/100` : `${value}/100`;

  return `
    <div class="metric-row">
      <div class="metric-label-row">
        <span>${label}</span>
        <strong>${displayValue}</strong>
      </div>
      <div class="metric-track">
        <div class="metric-fill" style="width:${value}%"></div>
      </div>
    </div>
  `;
}

function renderPlayerCard(player, score, recommendation) {
  const metrics = getMetrics(player);
  const topSignals = getTopSignals(player);
  const riskAdjustment = 100 - metrics.risk;

  return `
    <article class="player-result-card">
      <div class="player-result-top">
        <div>
          <h3 class="player-name">${player.name}</h3>
          <p class="player-meta">
  ${player.position} • ${player.team}
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
        ${metricRow("Red-Zone Usage", metrics.redzone)}
        ${metricRow("Expert Confidence", metrics.expert)}
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

  const scoreA = calculateScore(playerA, profile);
  const scoreB = calculateScore(playerB, profile);

  const recommendationA = getRecommendation(
    scoreA,
    scoreA - scoreB
  );

  const recommendationB = getRecommendation(
    scoreB,
    scoreB - scoreA
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
        recommendationA
      )}

      ${renderPlayerCard(
        playerB,
        scoreB,
        recommendationB
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

  // Refresh comparison once real stats are available
  comparePlayers();
}

initializeApp();
