# Fantasy AI Player Lab — Model V1 Methodology Freeze

## Model Freeze

**Season:** 2026  
**Initial Validation Target:** Week 1  
**Model Version:** Model V1  
**Status:** Scoring methodology frozen for validation

This document preserves the Model V1 scoring methodology, weights and validation assumptions used during the initial 2026 evaluation process.

## Validation Integrity Note

The original goal was to preserve a prospective pre-Week 1 prediction snapshot. During validation, a temporal-data issue was discovered in the snapshot workflow.

The live product dynamically selects each team's next opponent. Because the original export was generated after some Week 1 games had already been completed, teams that had already played had advanced to Week 2 matchup context while teams that had not yet played remained on Week 1.

As a result, the original export is **not considered a valid prospective Week 1 prediction snapshot**.

Rather than retroactively treating that file as valid, the data pipeline was updated to support explicit target-week snapshots. A consistent Week 1 dataset was then generated using Week 1 opponents and play-caller context.

That corrected Week 1 output is classified as a **retrospective reconstructed benchmark** because it was generated after Week 1 had begun.

The Model V1 scoring methodology documented below remains frozen so Week 1 results can be evaluated without changing the model's weights after seeing the outcomes.

**Week 2 is designated as the first true prospective out-of-sample validation**, with its prediction snapshot preserved before any Week 2 games are played.
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

**Total: 100%**

## Small-Sample Regression

Play-caller history is adjusted toward a neutral score of 50 when historical samples are limited.

```text
Adjusted Score = 50 + (Raw Score - 50) × Sample Confidence
