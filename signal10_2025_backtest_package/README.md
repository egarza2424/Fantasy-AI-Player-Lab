# Signal 10 — public-data 2025 walk-forward test

Copy the files in this package into the root of your Fantasy-AI-Player-Lab repository, preserving `.github/workflows/backtest-trench-signal.yml`. In GitHub Actions, run **Backtest Signal 10 (public trench data)** using **Run workflow**. Download the `trench-backtest-2025` artifact after the run and share the weekly and prediction CSVs for interpretation.

This uses publicly available *team-level* play-by-play proxies for line play. It **does not** yet include verified individual offensive/defensive starter grades or timestamped injury reports, so it is not the final injury-adjusted Signal 10. The 2025 baseline file contains historical proxies from prior work, not your exact six-component live model. No repository model weights are changed.
