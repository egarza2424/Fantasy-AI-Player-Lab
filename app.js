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

const playerASelect = document.getElementById("playerA");
const playerBSelect = document.getElementById("playerB");
const riskSelect = document.getElementById("riskTolerance");
const compareButton = document.getElementById("compareBtn");
const resultsContainer = document.getElementById("result");

async function loadPlayers() {
  try {
    const response = await fetch("./players.json");

    if (!response.ok) {
      throw new Error("Could not load players.json");
    }

    players = await response.json();
    populatePlayerSelectors();

    if (players.length >= 2) {
      comparePlayers();
    }
  } catch (error) {
    console.error("Player database error:", error);

    resultsContainer.innerHTML = `
      <div class="result-card">
        <h3>Unable to load player database</h3>
        <p>Please confirm that players.json is in the root of the repository.</p>
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

function getMetrics(player) {
  const knownMetrics = {
    "puka-nacua": {
      opportunity: 94,
      production: 91,
      usage: 93,
      matchup: 84,
      redzone: 82,
      expert: 95,
      risk: 18
    },

    "christian-watson": {
      opportunity: 78,
      production: 76,
      usage: 73,
      matchup: 88,
      redzone: 86,
      expert: 79,
      risk: 39
    },

    "parker-washington": {
      opportunity: 71,
      production: 69,
      usage: 75,
      matchup: 83,
      redzone: 68,
      expert: 72,
      risk: 31
    },

    "jonathon-brooks": {
      opportunity: 67,
      production: 63,
      usage: 61,
      matchup: 79,
      redzone: 74,
      expert: 70,
      risk: 43
    }
  };

  return knownMetrics[player.id] || {
    opportunity: 50,
    production: 50,
    usage: 50,
    matchup: 50,
    redzone: 50,
    expert: 50,
    risk: 50
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
          <p class="player-meta">${player.position} • ${player.team}</p>
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

compareButton.addEventListener("click", comparePlayers);

loadPlayers();
