# Fantasy AI Player Lab — Product Case Study

## Problem

Fantasy football managers are surrounded by rankings, projections, matchup data, injury news, expert opinions and community discussion.

The problem is not simply information retrieval.

The problem is **decision compression**:

> How do I turn many signals into one lineup decision I can understand and defend?

## Target user

A fantasy football manager making a weekly:

* Start/sit decision
* Flex decision
* Player comparison
* Risk/reward decision

## Product hypothesis

If the product exposes the reasoning behind a recommendation, users will be more likely to trust the recommendation, understand the tradeoffs and return for future decisions.

## MVP

The MVP intentionally solves one narrow problem:

**Compare Player A vs. Player B.**

The user can:

1. Select two players.
2. Choose a risk profile.
3. Compare weighted signals.
4. Review the model score.
5. See a recommendation.
6. Read the decision trace.

## Why these signals?

The model uses seven conceptual inputs:

* Opportunity
* Recent production
* Usage
* Matchup
* Red-zone usage
* Expert confidence
* Risk

The weights are intentionally visible so the product can be debated and iterated rather than treated as an unquestionable black box.

## Key product tradeoff

A highly complex model can appear sophisticated while becoming difficult for users to understand.

For the MVP, explainability wins over model complexity.

The goal is to prove the interaction and decision workflow first.

## Success metrics

If this became a production feature, I would evaluate:

### Primary

* Comparison completion rate
* Recommendation engagement
* Repeat comparison rate
* User-reported decision confidence

### Quality

* Recommendation accuracy
* Calibration by position
* Performance by scoring format
* Error rate on high-confidence recommendations

### Product

* Weekly active users
* Return rate
* Time to decision
* Feature adoption
* Conversion/retention if connected to a subscription product

## Experiment ideas

### Experiment A — Explainability

A/B test:

* Recommendation only
* Recommendation + top three reasons

**Hypothesis:** explanations improve trust and repeat use.

### Experiment B — Personalization

Compare:

* One universal score
* Risk-adjusted score

**Hypothesis:** personalization improves perceived usefulness.

### Experiment C — Comparison workflow

Compare:

* Search-first experience
* "Who should I start?" guided workflow

**Hypothesis:** reducing the number of choices decreases decision friction.

## Future AI architecture

The AI layer should not be responsible for inventing the underlying facts.

A safer production architecture would be:

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

The model should explain grounded signals rather than manufacture statistics.

## What I would build next

1. Connect reliable player/stat data.
2. Add scoring-format awareness.
3. Add injury/news context.
4. Add expert consensus.
5. Instrument product analytics.
6. Build historical backtesting.
7. Add AI explanations grounded in structured outputs.
8. Run experiments on explanation depth and personalization.

## Reflection

This project demonstrates a product mindset: identify a real user decision, narrow the MVP, make the logic visible, design for measurement, and create a path from prototype to production.
