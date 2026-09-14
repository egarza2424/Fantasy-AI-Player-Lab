# Fantasy AI Player Lab — Pre-Week 1 Model Snapshot

## Model Freeze

**Season:** 2026  
**Validation Week:** Week 1  
**Model Status:** Frozen before Week 1 results are incorporated

This snapshot documents the Fantasy AI Player Lab scoring methodology before 2026 Week 1 outcomes are added to the model.

The purpose of freezing the model is to preserve an out-of-sample benchmark. Week 1 results will be evaluated against these pregame assumptions rather than used to retroactively improve the original predictions.

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
