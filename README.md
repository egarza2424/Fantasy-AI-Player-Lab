# Fantasy AI Player Lab

> An explainable fantasy-football decision-support prototype built as a personal product project.

## Overview

Fantasy managers have access to enormous amounts of information, but the hard part is turning conflicting signals into a confident lineup decision.

**Fantasy AI Player Lab** explores that product problem with a transparent scoring model that compares two players and produces:

* A decision score from 0–100
* Start / Flex / Sit guidance
* Side-by-side signal breakdowns
* A "Why this player?" decision trace
* Risk-tolerance personalization
* A roadmap toward live data and AI-generated explanations

The current version is intentionally lightweight: it is a static front-end prototype with illustrative data. It does **not** claim to provide live projections.

## Product hypothesis

> If fantasy managers can see both the recommendation and the signals behind it, they will make decisions faster and trust the product more than a black-box recommendation.

## MVP scoring model

| Signal            | Weight |
| ----------------- | -----: |
| Opportunity       |    25% |
| Recent production |    20% |
| Usage             |    15% |
| Matchup           |    15% |
| Red-zone usage    |    10% |
| Expert confidence |    10% |
| Risk adjustment   |     5% |

## Risk profiles

**Conservative:** places greater emphasis on reducing volatility.

**Balanced:** uses the baseline weighting.

**Aggressive:** places greater emphasis on opportunity and upside.

## Product decisions demonstrated

### 1. Make the model explainable

Instead of returning only "Start Player A," the interface shows the signals contributing to the decision.

### 2. Personalize the decision

Different fantasy managers accept different levels of volatility. Risk tolerance gives the user control over that tradeoff.

### 3. Design for iteration

The scoring layer is separated from the UI so future versions can replace illustrative values with live APIs, league-specific scoring, expert consensus and historical outcomes.

## Future roadmap

### Phase 2 — Live data

* Player/stat APIs
* Injury status
* Opponent and schedule context
* Snap share / route participation / target share
* Red-zone opportunities

### Phase 3 — Fantasy ecosystem integration

* Expert consensus
* Rankings and projections
* Player comparison
* Start/sit context
* Historical analyst accuracy

### Phase 4 — AI decision layer

* Natural-language questions
* Weekly explanations grounded in structured data
* "Why should I start X over Y?"
* League-specific recommendations
* Roster and matchup context

### Phase 5 — Learning loop

Track recommendations against actual outcomes and evaluate:

* Recommendation accuracy
* User engagement
* Comparison completion rate
* Repeat usage
* User feedback
* Calibration by position and scoring format

## Tech stack

* HTML5
* CSS3
* Vanilla JavaScript
* Responsive design
* No backend required for the MVP

## Project structure

```text
fantasy-ai-player-lab/
├── index.html
├── styles.css
├── app.js
├── README.md
├── LICENSE
├── .gitignore
└── docs/
    ├── case-study.md
    └── product-spec.md
```

## Why this is a product project

This project is intentionally more than a UI mockup. It documents:

* The user problem
* A product hypothesis
* MVP scope
* Decision logic
* Personalization
* Product metrics
* Tradeoffs
* Future architecture
* Iteration opportunities

## Disclaimer

Player values in the prototype are illustrative and are not current fantasy projections, rankings or betting advice. A production version would require licensed/authorized data sources and appropriate validation.

## Author

Personal product project by a fantasy football enthusiast exploring AI-assisted consumer product development.
