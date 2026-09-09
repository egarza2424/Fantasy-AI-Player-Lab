const WEIGHTS = {
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
  balanced: WEIGHTS,
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
const compareButton = document.getElementById("compareButton");
const resultsContainer = document.getElementById("result");

async function loadPlayers() {
  try {
    const response = await fetch("players.json");

    if (!response.ok) {
      throw new Error("Unable to load players.json");
    }

    players = await response.json();

    populatePlayerSelectors();

  } catch (error) {
    console.error(error);

    resultsContainer.innerHTML = `
      <div class="result-card">
        <h3>Unable to load player database</h3>
        <p>Please check that <strong>players.json</strong> exists in the repository.</p>
      </div>
    `;
  }
}

function populatePlayerSelectors() {
  playerASelect.innerHTML = "";
  playerBSelect.innerHTML = "";

  players.forEach(player => {
    const optionA = document.createElement("option");
    optionA.value = player.id;
    optionA.textContent = `${player.name} — ${player.position} — ${player.team}`;

    const optionB = optionA.cloneNode(true);

    playerASelect.appendChild(optionA);
    playerBSelect.appendChild(optionB);
  });

  // Default selections
  if (players.length > 1) {
    playerASelect.value = players[0].id;
    playerBSelect.value = players[1].id;
  }
}

function getPlayer(id) {
  return players.find(player => player.id === id);
}

function generateIllustrativeMetrics(player) {
  /*
    These values are temporary.
    They allow the product experience to work while we
    build the real statistical data layer.
  */

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

  if (knownMetrics[player.id]) {
    return knownMetrics[player.id];
  }

  // Temporary neutral values for newly added players.
  return {
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
  const metrics = generateIllustrativeMetrics(player);
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

function getRecommendation(score, edge) {
  if (score >= 82 || edge >= 8) {
    return {
      label: "START",
      className: "start"
    };
  }

  if (score >= 72 || edge >= 2) {
    return {
      label: "FLEX",
      className: "flex"
    };
  }

  return {
    label: "SIT",
    className: "sit"
  };
}

function getStrongestSignals(player) {
  const metrics = generateIllustrativeMetrics(player);

  return Object.entries(metrics)
    .filter(([key]) => key !== "risk")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function formatSignalName(signal) {
  const names = {
    opportunity: "Opportunity",
    production: "Recent Production",
    usage: "Usage",
    matchup: "Matchup",
    redzone: "Red-Zone Usage",
    expert: "Expert Confidence"
  };

  return names[signal] || signal;
}

function renderPlayerCard(player, score, recommendation) {
  const metrics = generateIllustrativeMetrics(player);
  const signals = getStrongestSignals(player);

  return `
    <div class="result-card">
      <div class="result-header">
        <div>
          <h3>${player.name}</h3>
          <p>${player.position} • ${player.team}</p>
        </div>

        <div class="recommendation ${recommendation.className}">
          ${recommendation.label}
        </div>
      </div>

      <div class="score">
        ${score}
        <span>/100</span>
      </div>

      <h4>Why this player?</h4>

      <ul class="signal-list">
        ${signals.map(([key, value]) => `
          <li>
            <strong>${formatSignalName(key)}</strong>
            <span>${value}/100</span>
          </li>
        `).join("")}
      </ul>

      <div class="metric-grid">
        <div>
          <span>Opportunity</span>
          <strong>${metrics.opportunity}</strong>
        </div>

        <div>
          <span>Production</span>
          <strong>${metrics.production}</strong>
        </div>

        <div>
          <span>Usage</span>
          <strong>${metrics.usage}</strong>
        </div>

        <div>
          <span>Matchup</span>
          <strong>${metrics.matchup}</strong>
        </div>

        <div>
          <span>Red Zone</span>
          <strong>${metrics.redzone}</strong>
        </div>

        <div>
          <span>Expert</span>
          <strong>${metrics.expert}</strong>
        </div>
      </div>
    </div>
  `;
}

function comparePlayers() {
  const playerA = getPlayer(playerASelect.value);
  const playerB = getPlayer(playerBSelect.value);
  const profile = riskSelect.value;

  if (!playerA || !playerB) {
    return;
  }

  const scoreA = calculateScore(playerA, profile);
  const scoreB = calculateScore(playerB, profile);

  const edge = Math.abs(scoreA - scoreB);

  const recommendationA = getRecommendation(scoreA, scoreA - scoreB);
  const recommendationB = getRecommendation(scoreB, scoreB - scoreA);

  resultsContainer.innerHTML = `
    <div class="results-summary">
      <h2>${playerA.name} vs. ${playerB.name}</h2>
      <p>
        ${profile.charAt(0).toUpperCase() + profile.slice(1)}
        risk profile
      </p>
    </div>

    <div class="comparison-grid">
      ${renderPlayerCard(playerA, scoreA, recommendationA)}
      ${renderPlayerCard(playerB, scoreB, recommendationB)}
    </div>

    <div class="model-note">
      <strong>Model note:</strong>
      This prototype currently uses illustrative player metrics.
      The next product iteration will connect real NFL statistics
      and weekly fantasy data.
    </div>
  `;
}

document.getElementById("compareBtn").addEventListener("click", comparePlayers);

loadPlayers();
