const players = [
  {
    id: "puka",
    name: "Puka Nacua",
    position: "WR",
    metrics: {
      opportunity: 94,
      production: 91,
      usage: 93,
      matchup: 84,
      redzone: 82,
      expert: 95,
      risk: 18
    }
  },

  {
    id: "watson",
    name: "Christian Watson",
    position: "WR",
    metrics: {
      opportunity: 78,
      production: 76,
      usage: 73,
      matchup: 88,
      redzone: 86,
      expert: 79,
      risk: 39
    }
  },

  {
    id: "parker",
    name: "Parker Washington",
    position: "WR",
    metrics: {
      opportunity: 71,
      production: 69,
      usage: 75,
      matchup: 83,
      redzone: 68,
      expert: 72,
      risk: 31
    }
  },

  {
    id: "brooks",
    name: "Jonathon Brooks",
    position: "RB",
    metrics: {
      opportunity: 67,
      production: 63,
      usage: 61,
      matchup: 79,
      redzone: 74,
      expert: 70,
      risk: 43
    }
  }
];


const baseWeights = {
  opportunity: 0.25,
  production: 0.20,
  usage: 0.15,
  matchup: 0.15,
  redzone: 0.10,
  expert: 0.10,
  risk: 0.05
};


const labels = {
  opportunity: "Opportunity",
  production: "Recent production",
  usage: "Usage",
  matchup: "Matchup",
  redzone: "Red-zone usage",
  expert: "Expert confidence",
  risk: "Risk adjustment"
};


const playerA =
  document.getElementById("playerA");

const playerB =
  document.getElementById("playerB");

const riskTolerance =
  document.getElementById("riskTolerance");

const result =
  document.getElementById("result");


function populatePlayers() {

  players.forEach(player => {

    playerA.add(
      new Option(
        `${player.name} (${player.position})`,
        player.id
      )
    );

    playerB.add(
      new Option(
        `${player.name} (${player.position})`,
        player.id
      )
    );

  });

  playerA.value = "puka";
  playerB.value = "watson";
}


function getWeights(tolerance) {

  const weights = {
    ...baseWeights
  };

  if (tolerance === "conservative") {

    weights.risk = 0.12;
    weights.opportunity = 0.23;
    weights.production = 0.20;

  }

  else if (tolerance === "aggressive") {

    weights.risk = 0.02;
    weights.opportunity = 0.28;
    weights.production = 0.22;

  }

  const total =
    Object.values(weights)
      .reduce((a, b) => a + b, 0);

  Object.keys(weights)
    .forEach(key => {
      weights[key] /= total;
    });

  return weights;
}


function scorePlayer(player, weights) {

  let score = 0;

  for (const key of Object.keys(weights)) {

    let value =
      player.metrics[key];

    if (key === "risk") {
      value = 100 - value;
    }

    score +=
      value * weights[key];
  }

  return Math.round(score * 10) / 10;
}


function recommendation(score, opponentScore) {

  const edge =
    score - opponentScore;

  if (
    score >= 82 ||
    edge >= 8
  ) {
    return {
      text: "START",
      cls: "good"
    };
  }

  if (
    score >= 72 ||
    edge >= 2
  ) {
    return {
      text: "FLEX",
      cls: "warn"
    };
  }

  return {
    text: "SIT",
    cls: "bad"
  };
}


function metricRows(player, weights) {

  return Object.keys(weights)
    .map(key => {

      const raw =
        player.metrics[key];

      const display =
        key === "risk"
          ? `${raw}% risk`
          : `${raw}/100`;

      const visual =
        key === "risk"
          ? 100 - raw
          : raw;

      return `
        <div class="metric-row">

          <div class="metric-top">

            <span>
              ${labels[key]}
            </span>

            <span>
              ${display}
            </span>

          </div>

          <div class="bar">

            <div
              class="fill"
              style="width:${visual}%">
            </div>

          </div>

        </div>
      `;

    })
    .join("");
}


function whyText(
  player,
  score,
  opponent,
  weights
) {

  const positives =
    Object.keys(weights)

      .map(key => ({

        key,

        value:
          key === "risk"
            ? 100 - player.metrics[key]
            : player.metrics[key]

      }))

      .sort(
        (a, b) =>
          b.value - a.value
      )

      .slice(0, 3)

      .map(
        item =>
          labels[item.key]
            .toLowerCase()
      );


  const edge =
    score - opponent;

  const direction =
    edge >= 0
      ? "ahead of the comparison player"
      : "behind the comparison player";


  return `
    <strong>${player.name}</strong>
    grades ${Math.abs(edge).toFixed(1)}
    points ${direction}.

    Its strongest model signals are
    <strong>${positives.join(", ")}</strong>.

    This is an illustrative decision trace,
    not a live fantasy projection.
  `;
}


function render() {

  const a =
    players.find(
      player =>
        player.id === playerA.value
    );

  const b =
    players.find(
      player =>
        player.id === playerB.value
    );


  const weights =
    getWeights(
      riskTolerance.value
    );


  const scoreA =
    scorePlayer(a, weights);

  const scoreB =
    scorePlayer(b, weights);


  const recA =
    recommendation(
      scoreA,
      scoreB
    );

  const recB =
    recommendation(
      scoreB,
      scoreA
    );


  const winner =
    scoreA >= scoreB
      ? a.id
      : b.id;


  result.innerHTML = `

    <div class="verdict">

      <article
        class="player-card
        ${winner === a.id ? "winner" : ""}">

        <div class="position">
          ${a.position}
        </div>

        <div class="player-name">
          ${a.name}
        </div>

        <div class="score">
          ${scoreA}
        </div>

        <div class="score-label">
          Decision score / 100
        </div>

        <span
          class="recommendation ${recA.cls}">
          ${recA.text}
        </span>

        <div class="metric-list">
          ${metricRows(a, weights)}
        </div>

        <div class="why">
          ${whyText(
            a,
            scoreA,
            scoreB,
            weights
          )}
        </div>

      </article>


      <div class="verdict-center">

        <div class="eyebrow">
          MODEL VERDICT
        </div>

        <h3>
          ${
            winner === a.id
              ? a.name
              : b.name
          }
        </h3>

        <p>
          wins this comparison under a
          <strong>
            ${riskTolerance.value}
          </strong>
          risk profile.
        </p>

        <div class="why">

          <strong>
            Decision rule
          </strong>

          <br>

          Weighted signals →
          explainable score →
          recommendation

        </div>

      </div>


      <article
        class="player-card
        ${winner === b.id ? "winner" : ""}">

        <div class="position">
          ${b.position}
        </div>

        <div class="player-name">
          ${b.name}
        </div>

        <div class="score">
          ${scoreB}
        </div>

        <div class="score-label">
          Decision score / 100
        </div>

        <span
          class="recommendation ${recB.cls}">
          ${recB.text}
        </span>

        <div class="metric-list">
          ${metricRows(b, weights)}
        </div>

        <div class="why">
          ${whyText(
            b,
            scoreB,
            scoreA,
            weights
          )}
        </div>

      </article>

    </div>

  `;
}


document
  .getElementById("compareBtn")
  .addEventListener(
    "click",
    render
  );


riskTolerance
  .addEventListener(
    "change",
    render
  );


playerA
  .addEventListener(
    "change",
    render
  );


playerB
  .addEventListener(
    "change",
    render
  );


populatePlayers();

render();
