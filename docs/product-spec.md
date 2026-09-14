# Product Specification — Fantasy AI Player Lab

## Product Goal

Help fantasy football managers make faster, more understandable lineup decisions by combining multiple fantasy signals into an explainable player-comparison model.

## User Story

As a fantasy football manager, I want to compare two NFL players using performance, usage, matchup, coaching and risk signals so that I can decide who to start and understand why the recommendation was made.

## Core User Problem

Fantasy managers have access to large amounts of information, but that information is fragmented across statistics, rankings, injuries, matchups and analysis.

The MVP focuses on one question:

> **I'm deciding between two players. Who should I start, and why?**

## P0 — Current MVP

### Player Selection

- User can search active NFL players.
- User can select Player A.
- User can select Player B.
- The same player cannot be meaningfully compared against himself.

### Comparison

- Product calculates a 0–100 decision score for each player.
- Product compares both players side by side.
- Product identifies the higher-scoring player.
- Product displays positional rank.
- Product assigns START/FLEX/SIT guidance based on positional rank.

### Risk Personalization

User can choose:

- Conservative
- Balanced
- Aggressive

The selected profile changes how model signals are weighted.

### Explainability

The product displays nine model signals:

1. Opportunity
2. Recent Production
3. Usage
4. Matchup
5. Red-Zone Usage
6. Play Caller Matchup
7. Player vs. Defensive Play Caller
8. Model Confidence
9. Risk Adjustment

Users can inspect individual metric explanations and see the strongest signals contributing to a recommendation.

## Balanced Model Weights

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

Total weight: **100%**

## Data Requirements

The current MVP uses structured NFL data for:

- Player identity and position
- Team
- Player status
- Injury status
- Practice participation
- Depth-chart position
- NFL experience
- Age
- Weekly fantasy production
- Passing attempts
- Rushing attempts
- Carries
- Targets
- Team target share
- Team rushing share
- Red-zone opportunities
- Opponent schedule
- Defensive fantasy points allowed by position
- Offensive play callers
- Defensive play callers
- Historical play-caller matchups

## Small-Sample Handling

Play-caller history can contain limited samples.

Historical scores are therefore regressed toward a neutral score of 50:

```text
Adjusted Score = 50 + (Raw Score - 50) × Sample Confidence
```

Sample confidence:

- 0 games → neutral score of 50
- 1 game → 40%
- 2 games → 60%
- 3 games → 80%
- 4+ games → 100%

This prevents a small historical sample from receiving the same confidence as a larger sample.

## Model Confidence

Model Confidence measures stability in the information supporting the recommendation.

It consists of:

- 35% Recent Production Consistency
- 30% Opportunity Stability
- 20% Usage Stability
- 15% Availability

## Positional Recommendation Logic

### Quarterback

- QB1–QB12 → START
- QB13+ → SIT

### Running Back

- RB1–RB24 → START
- RB25–RB36 → FLEX
- RB37+ → SIT

### Wide Receiver

- WR1–WR24 → START
- WR25–WR36 → FLEX
- WR37+ → SIT

### Tight End

- TE1–TE12 → START
- TE13+ → SIT

Head-to-head comparison and positional recommendation are treated as separate decisions.

## Acceptance Criteria

### Player Search

- User can search active NFL players by name.
- Search results display relevant player context.
- Selecting a search result assigns that player to the comparison.

### Comparison

- Given two different players, selecting Compare generates scores for both.
- Both players display the nine model signals.
- The higher-scoring player is identified as the head-to-head model winner.
- Both players receive positional START/FLEX/SIT guidance.
- Positional rank is visible.

### Personalization

- The active risk profile is visible.
- Changing risk profile can change player scores.
- Risk weighting is applied consistently.

### Explainability

- Model signals are visible.
- Metric explanations describe what each signal represents.
- Strongest signals are surfaced in the decision trace.
- Small coaching-history samples are adjusted toward neutral.
- Unknown matchup history is not presented as strong evidence.

### Data Quality

- Missing core production data does not artificially benefit a player.
- Missing matchup history defaults to neutral where appropriate.
- Player and team identifiers are normalized where necessary.
- The interface remains functional when individual data fields are unavailable.

## P1 — Next Product Iterations

### League Integration

- League-specific scoring settings
- User roster
- Starting lineup
- Bench
- Positional scarcity
- Personalized lineup recommendations

### Expert Consensus

- External rankings
- Expert consensus
- Projection context
- Additional explainable model signal

### Model Validation

- Generate explicit target-week model snapshots
- Store pregame model scores
- Store pregame positional rankings
- Preserve opponent and play-caller context
- Preserve model version and scoring weights
- Compare predictions with actual weekly PPR results
- Measure positional ranking error
- Measure START/FLEX/SIT accuracy
- Measure model-score correlation with actual production
- Identify largest hits and misses
- Evaluate individual signal performance
- Prevent postgame data from altering frozen prospective snapshots

## 2026 Week 1 Reconstruction and Validation

During Week 1 validation, a temporal-data issue was identified in the original snapshot process.

The live product determines each team's next opponent dynamically. After some Week 1 games had been completed, teams that had already played advanced to Week 2 matchup context while teams that had not yet played remained on Week 1.

Because this created a mixed-week snapshot, the original export is not treated as a valid Week 1 pregame prediction set.

The data pipeline was updated to support an explicit target week. This allows schedule, opponent and play-caller context to be locked to a specific NFL week.

A reconstructed Week 1 benchmark was generated using the frozen Model V1 methodology with consistent Week 1 matchup context.

The reconstructed benchmark includes:

- Player model score
- Predicted positional rank
- START/FLEX/SIT recommendation
- Week 1 opponent
- Offensive play caller
- Defensive play caller
- Play Caller Matchup score and historical sample
- Player vs. Defensive Play Caller score and historical sample

Because the benchmark was reconstructed after Week 1 began, it is classified as a **retrospective validation benchmark**, not a prospective pregame prediction set.

Week 1 validation will measure:

- Predicted positional rank vs. actual positional finish
- START/FLEX/SIT accuracy
- Model score vs. actual PPR points
- Average ranking error
- Performance by position
- Largest prediction hits
- Largest prediction misses
- Signal-level predictive performance

Model V1 should remain unchanged until this evaluation is complete so the results can be used to diagnose strengths and weaknesses without retroactively optimizing the benchmark.

## 2026 Week 2 Prospective Validation

Week 2 will serve as the model's first true prospective out-of-sample validation.

Before any Week 2 games are played, the target-week pipeline will be used to generate and preserve a Week 2 model snapshot.

That snapshot will remain unchanged after games begin and will later be compared with actual Week 2 PPR outcomes using the same validation metrics established for Week 1.

## P2 — Future

### AI Explanation Layer

- Natural-language comparison explanations
- "Why should I start X over Y?"
- Structured-data-grounded responses
- League-aware explanations

### User Feedback Loop

- Recommendation feedback
- User decision tracking
- Outcome tracking
- Model-performance history

### Expanded Personalization

- League format
- Roster construction
- Opponent context
- User risk preferences
- Playoff/week-specific strategy

## Analytics Events for Production

Potential events include:

- `player_search_started`
- `player_selected`
- `comparison_started`
- `comparison_completed`
- `risk_profile_changed`
- `recommendation_viewed`
- `metric_explanation_expanded`
- `case_study_viewed`
- `feedback_submitted`

## Edge Cases

- Same player selected twice
- Player missing recent statistics
- Injury status unknown
- Practice status unavailable
- Player changes teams
- Player role changes during season
- Bye week
- Upcoming opponent unavailable
- Coaching change
- New play caller with no historical sample
- Rookie with limited NFL history
- Conflicting data sources
- No meaningful statistical difference between players
- Different league scoring formats

## Non-Goals for Current MVP

- Automated lineup submission
- Betting recommendations
- Claims of guaranteed predictive accuracy
- Full fantasy-league management
- Replacing human judgment

## Definition of Done

The current MVP is complete when a user can:

1. Search for two active NFL players.
2. Compare them using real NFL data.
3. View an explainable 0–100 model score.
4. Receive positional START/FLEX/SIT guidance.
5. Change risk tolerance.
6. Inspect the nine signals behind the recommendation.
7. Understand why one player received an advantage over another.

The next major definition of success is **validation**: determining how well the frozen model performs against actual 2026 weekly outcomes.
