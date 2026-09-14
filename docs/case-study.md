# Fantasy AI Player Lab — Product Case Study

## Problem

Fantasy football managers are surrounded by rankings, projections, matchup data, injury news, expert opinions and community discussion.

The problem is not simply information retrieval.

The problem is **decision compression**:

> How do I turn many competing signals into one lineup decision I can understand and defend?

## Target User

A fantasy football manager making a weekly:

- Start/sit decision
- Flex decision
- Player comparison
- Risk/reward decision

## Product Hypothesis

If a fantasy decision-support product exposes the reasoning behind its recommendation, users will be more likely to trust the recommendation, understand the tradeoffs and return for future decisions.

## MVP

The MVP intentionally focuses on one core problem:

**I'm deciding between two fantasy football players. Who should I start, and why?**

The user can:

1. Search active NFL players.
2. Select two players to compare.
3. Choose a Conservative, Balanced or Aggressive risk profile.
4. Compare nine weighted signals.
5. Review each player's 0–100 model score.
6. See positional START/FLEX/SIT guidance.
7. Review the strongest signals behind the recommendation.
8. Inspect how individual metrics were calculated.

The goal is not simply to output a ranking. The goal is to make the decision process understandable.

## The Nine-Signal Model

The current Balanced model combines nine signals:

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

The weights are intentionally visible so the model can be evaluated, challenged and improved rather than treated as an unquestionable black box.

## Data and Feature Design

The prototype uses real NFL data to create structured fantasy-football signals.

### Opportunity

Opportunity measures how frequently a player has access to fantasy-relevant opportunities.

- QB: pass attempts + rush attempts per game
- RB: carries + targets per game
- WR/TE: targets + carries per game

Players are normalized against others at the same position.

### Recent Production

Recent Production measures PPR fantasy output across the player's most recent four games.

Players are compared with others at the same position, with the highest recent average establishing the top score.

### Usage

Usage attempts to capture a player's role within his own offense rather than simply counting raw statistics.

- WR/TE: share of team targets
- RB: share of team rushing attempts
- QB: passing + rushing involvement relative to other quarterbacks

### Red-Zone Usage

Red-Zone Usage measures access to higher-value scoring opportunities.

The calculation changes by position to better represent how quarterbacks, running backs, wide receivers and tight ends generate fantasy value near the goal line.

### Matchup

The model identifies the player's upcoming opponent and evaluates how many PPR fantasy points that defense allowed to the player's position.

Matchup scores are normalized so difficult defenses reduce the score while favorable defenses increase it.

## Coaching Context

One of the more differentiated iterations of the project was adding coaching and play-calling history.

### Play Caller Matchup

This signal evaluates historical fantasy production associated with the current offensive play caller against the upcoming opponent's defensive play caller.

Rather than treating every matchup as purely team-vs-team, the model introduces coaching context into the comparison.

### Player vs. Defensive Play Caller

This signal evaluates an individual player's historical PPR production against the upcoming opponent's current defensive play caller.

This creates a second layer of matchup context beyond traditional defense-versus-position statistics.

## Handling Small Samples

Historical coaching matchups can produce very small samples.

Rather than treating a one-game result as equally reliable as a four-game sample, the model regresses small samples toward a neutral score of 50.

The adjustment is:

**Adjusted Score = 50 + (Raw Score - 50) × Sample Confidence**

Sample confidence:

- 0 games → neutral score of 50
- 1 game → 40% confidence
- 2 games → 60% confidence
- 3 games → 80% confidence
- 4+ games → 100% confidence

For example, a raw score of 100 based on only one historical game becomes 70 rather than remaining 100.

This prevents a small historical sample from dominating a recommendation.

## Model Confidence

Model Confidence is separate from outside expert opinion.

It evaluates the stability and reliability of the model's underlying player information using:

- 35% Recent Production Consistency
- 30% Opportunity Stability
- 20% Usage Stability
- 15% Availability

This allows the model to distinguish between a strong projection supported by stable inputs and one built on more volatile information.

## Risk Adjustment

Risk incorporates current player context including:

- Injury designation
- Practice participation
- Roster status
- Depth-chart position
- NFL experience
- Age

Users can select Conservative, Balanced or Aggressive profiles so the recommendation can respond to different levels of risk tolerance.

## Positional Decision Logic

The model separates the head-to-head comparison from positional lineup guidance.

START/FLEX/SIT is based on the player's model rank within his position:

- QB: ranks 1–12 START; 13+ SIT
- RB: ranks 1–24 START; 25–36 FLEX; 37+ SIT
- WR: ranks 1–24 START; 25–36 FLEX; 37+ SIT
- TE: ranks 1–12 START; 13+ SIT

This prevents the recommendation from depending only on whether Player A happened to score higher than Player B.

## Product Iteration

The current model was not produced in one pass.

Development exposed several issues that required product and modeling decisions, including:

- Browser/API limitations
- Sparse or incomplete seasonal datasets
- Missing-data bias
- Fantasy-relevant ranking-pool selection
- Coaching-team abbreviation mismatches
- Small historical samples
- Search performance
- Explainability of model outputs

Each issue created an opportunity to improve the system rather than hide the limitation.

For example, missing core performance data originally behaved too neutrally and could artificially support players without meaningful production. Core missing-data defaults were recalibrated to penalize insufficient performance information while genuinely unknown matchup information remains neutral.

## Key Product Tradeoff

A highly complex model can appear sophisticated while becoming difficult for users to understand.

For this MVP, **explainability wins over unnecessary complexity**.

Users should be able to see what influenced the recommendation, how much each signal matters and where uncertainty exists.

## Week 1 Reconstruction and Validation

During the Week 1 validation process, I identified an important temporal-data issue in the original snapshot workflow.

The live product was designed to use each team's next opponent. That behavior is correct for a weekly decision-support tool, but it created a problem when attempting to reconstruct a historical Week 1 benchmark after some Week 1 games had already been played. Teams that had completed their first game had already advanced to Week 2 matchup context, while teams that had not yet played were still showing Week 1.

Rather than treating that mixed-week output as a valid pregame benchmark, I updated the data pipeline to support an explicit target week.

The revised workflow can lock schedule and coaching-context data to a specific week, allowing the model to generate a consistent Week 1 reconstruction using:

- 2025 historical player performance and usage
- 2026 Week 1 opponents
- 2026 offensive and defensive play callers
- Historical play-caller matchup data
- The frozen Model V1 scoring methodology

The reconstructed Week 1 file is therefore treated as a **retrospective benchmark**, not as a true pregame prediction set.

After Week 1 is complete, actual fantasy results will be compared with this reconstructed benchmark.

Planned evaluation includes:

- Predicted positional rank vs. actual positional finish
- START/FLEX/SIT accuracy
- Model score vs. actual PPR production
- Average ranking error
- Largest model hits
- Largest model misses
- Performance by position
- Performance of individual signals

The purpose is not to tune the model until Week 1 looks successful. The purpose is to identify where Model V1 was strong, where it failed and which assumptions should be tested next.

Week 2 will serve as the first true prospective out-of-sample validation because its model snapshot can be frozen before any Week 2 games are played.
## Success Metrics

If this became a production feature, I would evaluate both product behavior and model performance.

### Product Metrics

- Comparison completion rate
- Recommendation engagement
- Repeat comparison rate
- Time to decision
- Weekly active users
- User-reported decision confidence

### Model Metrics

- Positional ranking accuracy
- START/FLEX/SIT accuracy
- Correlation between model score and fantasy production
- Average ranking error
- Performance by position
- Error rate on high-confidence recommendations

## Experiment Ideas

### Experiment A — Explainability

Compare:

- Recommendation only
- Recommendation + top reasons and metric explanations

**Hypothesis:** explanations improve trust and repeat usage.

### Experiment B — Personalization

Compare:

- Universal scoring profile
- Risk-adjusted scoring profiles

**Hypothesis:** personalization improves perceived usefulness.

### Experiment C — Comparison Workflow

Compare:

- Search-first player comparison
- Guided "Who should I start?" workflow

**Hypothesis:** reducing decision friction increases comparison completion.

## Future AI Architecture

The AI layer should not be responsible for inventing the underlying facts.

A production architecture could follow:

```text
Licensed / authorized data
        ↓
Data validation + normalization
        ↓
Deterministic scoring / feature generation
        ↓
Structured decision context
        ↓
LLM explanation layer
        ↓
User-facing explanation
```

The AI should explain grounded signals rather than manufacture statistics.

## Product Roadmap

The next major product opportunities are:

1. **League integration** — connect scoring settings, rosters and lineup context.
2. **Expert consensus** — incorporate external rankings as an additional explainable signal.
3. **AI explanations** — generate natural-language reasoning grounded in structured model outputs.
4. **Model validation** — evaluate weekly predictions against actual outcomes and create a continuous learning loop.

## Reflection

Fantasy AI Player Lab started as a simple player-comparison concept and evolved into a working decision-support MVP using real NFL data, nine weighted signals, positional ranking, risk personalization and coaching-context analysis.

The project demonstrates the product process I wanted to explore: identify a real user problem, narrow the initial scope, build the smallest useful experience, test the underlying assumptions, identify weaknesses, improve the data and model, make uncertainty visible and measure performance against real outcomes.

The next milestone is not adding complexity for its own sake. It is determining whether the model actually helps users make better fantasy football decisions.
