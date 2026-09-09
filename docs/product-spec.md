# Product Specification — Player Comparison MVP

## User story

As a fantasy football manager, I want to compare two players using multiple signals so that I can make a lineup decision quickly and understand why the recommendation was made.

## MVP requirements

### P0 — Required

* User can select Player A.
* User can select Player B.
* User can choose a risk profile.
* Product calculates a score for each player.
* Product displays a recommendation.
* Product displays the underlying signals.
* Product displays a decision explanation.

### P1 — Next

* Position-aware scoring.
* League scoring settings.
* Live injury status.
* Expert consensus.
* Player news.

### P2 — Future

* Natural-language AI questions.
* Personalized roster recommendations.
* Historical recommendation accuracy.
* User feedback loop.

## Acceptance criteria

### Comparison

* Given two different players, when the user selects Compare, both players receive a score.
* The higher-scoring player is identified as the model winner.
* Both players receive a Start/Flex/Sit recommendation.

### Personalization

* When the risk profile changes, scores can change.
* The interface clearly identifies the active risk profile.

### Explainability

* Each player displays all model signals.
* The product identifies the strongest signals.
* The product states that prototype data is illustrative.

## Analytics events for production

* `comparison_started`
* `comparison_completed`
* `risk_profile_changed`
* `recommendation_viewed`
* `explanation_expanded`
* `feedback_submitted`

## Edge cases

* Same player selected twice.
* Player missing data.
* Injury status unknown.
* Conflicting data sources.
* No meaningful statistical difference.
* Different scoring formats.
* Bye week.
* Player role changes during the season.

## Non-goals for MVP

* Live projections
* Betting advice
* Automated lineup submission
* League account integrations
* Claims of predictive accuracy

## Definition of done

The MVP is complete when a user can compare two players, understand the model's recommendation, change risk tolerance, and inspect the signals behind the result without needing external documentation.
