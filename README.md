# Fantasy AI Player Lab

> An explainable fantasy-football decision-support MVP that combines real NFL data, matchup context and coaching signals to help managers make Start/Flex/Sit decisions.

## Live Demo

**Fantasy AI Player Lab:**  
https://egarza2424.github.io/Fantasy-AI-Player-Lab/

## Overview

Fantasy managers have access to enormous amounts of information. The harder problem is turning conflicting signals into a lineup decision they can understand and trust.

**Fantasy AI Player Lab** explores that product problem with a transparent comparison model that allows users to search active NFL players, compare two players and understand the signals driving the recommendation.

The current MVP includes:

- Real NFL performance and usage data
- Active NFL player search
- 0–100 player decision scores
- Positional START/FLEX/SIT guidance
- Nine weighted model signals
- Upcoming defensive matchup context
- Offensive and defensive play-caller analysis
- Player history against defensive play callers
- Injury, practice and depth-chart risk signals
- Conservative, Balanced and Aggressive risk profiles
- Model Confidence scoring
- Explainable metric breakdowns
- "Why this player?" decision traces

The goal is not simply to produce another fantasy ranking.

The goal is to make the reasoning behind the recommendation visible.

## Product Hypothesis

> If fantasy managers can see both the recommendation and the signals behind it, they can make decisions faster and better understand the tradeoffs behind the recommendation.

## Balanced Scoring Model

| Signal | Weight |
| --- | ---: |
| Opportunity | 18% |
| Recent Production | 22% |
| Usage | 15% |
| Matchup | 10% |
| Red-Zone Usage | 10% |
| Play Caller Matchup | 7% |
| Player vs. Defensive Play Caller | 7% |
| Model Confidence | 6% |
| Risk Adjustment | 5% |

Weights are intentionally visible so the model can be evaluated and iterated rather than treated as a black box.

## What Makes the Model Different

### Coaching and Play-Caller Context

Traditional fantasy matchup analysis often focuses on team defense or defense-versus-position statistics.

Fantasy AI Player Lab adds two additional signals:

**Play Caller Matchup** evaluates historical fantasy production associated with the current offensive play caller against the upcoming opponent's defensive play caller.

**Player vs. Defensive Play Caller** evaluates an individual player's historical fantasy production against the upcoming opponent's current defensive play caller.

These signals add coaching context to the traditional player and matchup data.

### Small-Sample Regression

Coaching-history samples can be limited.

Instead of treating one historical game as equally reliable as four games, small samples are pulled toward a neutral score of 50:

```text
Adjusted Score = 50 + (Raw Score - 50) × Sample Confidence
```

Sample confidence:

- 0 games → neutral 50
- 1 game → 40%
- 2 games → 60%
- 3 games → 80%
- 4+ games → 100%

This prevents one historical matchup from disproportionately influencing the recommendation.

## Model Confidence

Model Confidence evaluates the stability of the information supporting a recommendation.

It combines:

- 35% Recent Production Consistency
- 30% Opportunity Stability
- 20% Usage Stability
- 15% Availability

This separates the strength of a player's projection from confidence in the underlying inputs.

## Risk Profiles

**Conservative** — places greater emphasis on reducing volatility and player risk.

**Balanced** — uses the baseline model weighting.

**Aggressive** — places greater emphasis on opportunity and upside.

This allows the same underlying player data to support different decision styles.

## Positional START/FLEX/SIT Logic

Lineup guidance is based on model rank within the player's position rather than simply which player wins a head-to-head comparison.

- QB 1–12 → START
- QB 13+ → SIT
- RB 1–24 → START
- RB 25–36 → FLEX
- RB 37+ → SIT
- WR 1–24 → START
- WR 25–36 → FLEX
- WR 37+ → SIT
- TE 1–12 → START
- TE 13+ → SIT

This separates **"Which of these two players is better?"** from **"Where does this player rank at his position?"**

## Product Decisions Demonstrated

### 1. Make the Model Explainable

Instead of returning only "Start Player A," the interface exposes the metrics contributing to the recommendation.

### 2. Personalize the Decision

Fantasy managers have different tolerances for volatility. Risk profiles allow the recommendation to respond to that preference.

### 3. Handle Uncertainty Explicitly

Missing data and small samples are handled intentionally rather than silently treated as equally reliable information.

### 4. Separate Relative and Positional Decisions

Head-to-head comparison and START/FLEX/SIT guidance answer different user questions and therefore use separate logic.

### 5. Build for Iteration

The project has evolved through repeated testing of real player outputs, API limitations, data-quality issues and model behavior.

## Model Validation — Next Milestone

The current model is being intentionally **frozen before 2026 Week 1 results are incorporated**.

Once Week 1 is complete, the pregame model will be evaluated against actual PPR outcomes.

Planned analysis includes:

- Predicted positional rank vs. actual positional finish
- START/FLEX/SIT accuracy
- Model score vs. actual PPR points
- Average ranking error
- Biggest hits and misses
- Performance by position
- Performance of individual model signals

The objective is to test the model against outcomes it has not already seen rather than retroactively tuning the model to fit Week 1 results.

Those findings will guide the next scoring iteration.

## Product Roadmap

### League Integration

- League scoring settings
- User rosters
- Lineup context
- Positional scarcity
- Personalized recommendations

### Expert Consensus

- External rankings
- Expert consensus data
- Additional explainable model signal

### AI Explanation Layer

- Natural-language weekly reasoning
- "Why should I start X over Y?"
- Explanations grounded in structured model outputs
- League-specific decision context

### Model Validation

- Weekly prediction tracking
- Actual outcome comparison
- Ranking-error analysis
- Signal-performance analysis
- Continuous model improvement

## Data / Decision Architecture

```text
NFL performance + usage data
            ↓
Schedule + matchup context
            ↓
Injury + availability context
            ↓
Coaching / play-caller history
            ↓
Data validation + normalization
            ↓
Nine explainable model signals
            ↓
Risk-profile weighting
            ↓
0–100 decision score
            ↓
Positional START / FLEX / SIT
            ↓
User-facing explanation
```

A future AI layer would explain these structured signals rather than invent the underlying statistics.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- GitHub Pages
- GitHub Actions
- JSON
- CSV data processing
- Sleeper public NFL player data
- nflverse NFL statistics and play-by-play data

## Project Structure

```text
Fantasy-AI-Player-Lab/
├── .github/
│   └── workflows/
│       ├── static.yml
│       └── update-nfl-stats.yml
├── docs/
│   ├── case-study.md
│   └── product-spec.md
├── app.js
├── coordinators.json
├── index.html
├── nfl-stats.json
├── players.json
├── styles.css
├── README.md
├── LICENSE
└── .gitignore
```

## Product Case Study

The full case study documents the product problem, model design, scoring logic, major iterations, tradeoffs and validation strategy.

[Read the full product case study](docs/case-study.md)

## Why This Is a Product Project

This project is intentionally more than a UI mockup.

It demonstrates:

- Problem identification
- MVP scoping
- Product hypothesis development
- Data-driven decision design
- Explainability
- Personalization
- Data-quality handling
- Model iteration
- Product tradeoffs
- Success metrics
- Experiment design
- Roadmap prioritization
- Outcome validation

The project evolved from a simple player-comparison concept into a working decision-support system as real data and model behavior exposed new product problems to solve.

## Disclaimer

Fantasy AI Player Lab is a personal product prototype and decision-support experiment. Model outputs are not guaranteed predictions and should not be interpreted as betting advice.

## Author

Personal product project created to explore the intersection of fantasy sports, product management, analytics and explainable AI-assisted decision support.
