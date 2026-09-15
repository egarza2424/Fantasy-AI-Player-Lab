import csv
import io
import re
import unicodedata
import urllib.request
from collections import defaultdict

MODEL_FILE = "2026-week1-reconstructed-model-snapshot-3.csv"
OUTPUT_FILE = "2026-week1-model-validation.csv"

STATS_URL = (
    "https://github.com/nflverse/nflverse-data/releases/download/"
    "stats_player/stats_player_week_2026.csv"
)

print("Loading reconstructed Week 1 model snapshot...")

with open(MODEL_FILE, newline="", encoding="utf-8") as f:
    model_rows = list(csv.DictReader(f))

print(f"Loaded {len(model_rows)} model predictions.")
print("Downloading completed 2026 NFL player stats...")

request = urllib.request.Request(
    STATS_URL,
    headers={"User-Agent": "Fantasy-AI-Player-Lab"},
)

with urllib.request.urlopen(request) as response:
    stats_text = response.read().decode("utf-8")

stats_rows = list(csv.DictReader(io.StringIO(stats_text)))

print(f"Downloaded {len(stats_rows)} player-week stat rows.")
available_seasons = sorted(
    {
        str(row.get("season", ""))
        for row in stats_rows
        if row.get("season")
    }
)

print(f"Available nflverse seasons: {available_seasons}")

season_2026_rows = [
    row
    for row in stats_rows
    if str(row.get("season", "")) == "2026"
]

print(f"2026 rows available: {len(season_2026_rows)}")

week1_rows = [
    row
    for row in stats_rows
    if str(row.get("season", "")) == "2026"
    and str(row.get("week", "")) == "1"
    and row.get("season_type", "REG") == "REG"
]

print(f"Found {len(week1_rows)} Week 1 player rows.")

if not week1_rows:
    raise RuntimeError(
        "No 2026 Week 1 player stats were found in nflverse."
    )


def number(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def calculate_ppr(row):
    return round(
        number(row.get("passing_yards")) * 0.04
        + number(row.get("passing_tds")) * 4
        - number(row.get("interceptions")) * 2
        + number(row.get("rushing_yards")) * 0.10
        + number(row.get("rushing_tds")) * 6
        + number(row.get("receptions"))
        + number(row.get("receiving_yards")) * 0.10
        + number(row.get("receiving_tds")) * 6
        - number(row.get("fumbles_lost")) * 2,
        2,
    )


actual_players = []

for row in week1_rows:
    position = row.get("position", "")

    if position not in {"QB", "RB", "WR", "TE"}:
        continue

    actual_players.append(
        {
            "player_id": row.get("player_id", ""),
            "player_name": (
                row.get("player_display_name")
                or row.get("player_name", "")
            ),
            "position": position,
            "team": row.get("recent_team") or row.get("team", ""),
            "actual_ppr": calculate_ppr(row),
        }
    )

print(
    f"Calculated PPR results for "
    f"{len(actual_players)} fantasy players."
)

# Rank actual Week 1 performances within each position.
actual_by_position = defaultdict(list)

for player in actual_players:
    actual_by_position[player["position"]].append(player)

for position, players in actual_by_position.items():
    players.sort(
        key=lambda player: (
            -player["actual_ppr"],
            player["player_name"],
        )
    )

    for rank, player in enumerate(players, start=1):
        player["actual_position_rank"] = rank


def normalize_name(name):
    value = unicodedata.normalize("NFKD", str(name))
    value = "".join(
        char
        for char in value
        if not unicodedata.combining(char)
    )
    value = value.lower()
    value = re.sub(r"[^a-z0-9 ]", " ", value)
    value = re.sub(
        r"\b(jr|sr|ii|iii|iv|v)\b",
        " ",
        value,
    )
    return " ".join(value.split())


# Try nflverse ID first, then normalized name + position.
actual_by_id = {
    str(player["player_id"]): player
    for player in actual_players
    if player["player_id"]
}

actual_by_name_position = {
    (
        normalize_name(player["player_name"]),
        player["position"],
    ): player
    for player in actual_players
    if player["player_name"]
}

validation_rows = []
unmatched_rows = []

for model in model_rows:
    player_id = str(model.get("player_id", ""))
    position = model.get("position", "")

    actual = actual_by_id.get(player_id)

    if actual is None:
        actual = actual_by_name_position.get(
            (
                normalize_name(model.get("player_name", "")),
                position,
            )
        )

    if actual is None:
        unmatched_rows.append(model)
        continue

    model_rank = int(
        float(model.get("position_rank", 0) or 0)
    )
    actual_rank = int(actual["actual_position_rank"])

    validation_rows.append(
        {
            "player_id": player_id,
            "player_name": model.get("player_name", ""),
            "position": position,
            "team": model.get("team", ""),
            "model_score": model.get("model_score", ""),
            "model_rank": model_rank,
            "recommendation": model.get(
                "recommendation",
                "",
            ),
            "actual_ppr": actual["actual_ppr"],
            "actual_position_rank": actual_rank,
            "rank_difference": actual_rank - model_rank,
        }
    )

matched = len(validation_rows)
unmatched = len(unmatched_rows)

print(f"Matched {matched} model predictions.")
print(f"Unmatched model predictions: {unmatched}")

if unmatched_rows:
    print("")
    print("First 20 unmatched model players:")

    for row in unmatched_rows[:20]:
        print(
            f'{row.get("player_name")} '
            f'({row.get("position")})'
        )

fieldnames = [
    "player_id",
    "player_name",
    "position",
    "team",
    "model_score",
    "model_rank",
    "recommendation",
    "actual_ppr",
    "actual_position_rank",
    "rank_difference",
]

with open(
    OUTPUT_FILE,
    "w",
    newline="",
    encoding="utf-8",
) as f:
    writer = csv.DictWriter(
        f,
        fieldnames=fieldnames,
    )
    writer.writeheader()
    writer.writerows(validation_rows)

print(
    f"Wrote {len(validation_rows)} rows "
    f"to {OUTPUT_FILE}."
)


def pearson_correlation(xs, ys):
    if len(xs) < 2 or len(xs) != len(ys):
        return 0.0

    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)

    numerator = sum(
        (x - mean_x) * (y - mean_y)
        for x, y in zip(xs, ys)
    )

    denominator_x = sum(
        (x - mean_x) ** 2 for x in xs
    )
    denominator_y = sum(
        (y - mean_y) ** 2 for y in ys
    )

    denominator = (
        denominator_x * denominator_y
    ) ** 0.5

    if denominator == 0:
        return 0.0

    return numerator / denominator


def rank_values(values):
    indexed = sorted(
        enumerate(values),
        key=lambda item: item[1],
    )

    ranks = [0.0] * len(values)
    i = 0

    while i < len(indexed):
        j = i

        while (
            j + 1 < len(indexed)
            and indexed[j + 1][1] == indexed[i][1]
        ):
            j += 1

        average_rank = (
            (i + 1) + (j + 1)
        ) / 2

        for k in range(i, j + 1):
            original_index = indexed[k][0]
            ranks[original_index] = average_rank

        i = j + 1

    return ranks


model_scores = [
    float(row["model_score"])
    for row in validation_rows
]

actual_points = [
    float(row["actual_ppr"])
    for row in validation_rows
]

score_ppr_correlation = pearson_correlation(
    model_scores,
    actual_points,
)

model_ranks = [
    float(row["model_rank"])
    for row in validation_rows
]

actual_ranks = [
    float(row["actual_position_rank"])
    for row in validation_rows
]

spearman = pearson_correlation(
    rank_values(model_ranks),
    rank_values(actual_ranks),
)

print("")
print("===== MODEL V1 WEEK 1 VALIDATION =====")
print(f"Matched players: {matched}")
print(f"Unmatched predictions: {unmatched}")
print(
    "Model Score vs Actual PPR correlation: "
    f"{score_ppr_correlation:.3f}"
)
print(
    "Predicted Rank vs Actual Rank "
    f"Spearman correlation: {spearman:.3f}"
)

print("")
print("===== PERFORMANCE BY POSITION =====")

for position in ["QB", "RB", "WR", "TE"]:
    position_rows = [
        row
        for row in validation_rows
        if row["position"] == position
    ]

    if len(position_rows) < 2:
        continue

    scores = [
        float(row["model_score"])
        for row in position_rows
    ]
    points = [
        float(row["actual_ppr"])
        for row in position_rows
    ]
    predicted_ranks = [
        float(row["model_rank"])
        for row in position_rows
    ]
    finished_ranks = [
        float(row["actual_position_rank"])
        for row in position_rows
    ]

    score_corr = pearson_correlation(
        scores,
        points,
    )
    rank_corr = pearson_correlation(
        rank_values(predicted_ranks),
        rank_values(finished_ranks),
    )

    average_rank_error = (
        sum(
            abs(
                float(row["actual_position_rank"])
                - float(row["model_rank"])
            )
            for row in position_rows
        )
        / len(position_rows)
    )

    print(
        f"{position}: {len(position_rows)} players | "
        f"Score/PPR r={score_corr:.3f} | "
        f"Rank rho={rank_corr:.3f} | "
        f"Avg rank error={average_rank_error:.1f}"
    )

print("")
print("===== START / FLEX / SIT RESULTS =====")

recommendation_groups = defaultdict(list)

for row in validation_rows:
    recommendation_groups[
        row["recommendation"]
    ].append(float(row["actual_ppr"]))

for recommendation in ["START", "FLEX", "SIT"]:
    points = recommendation_groups.get(
        recommendation,
        [],
    )

    if not points:
        continue

    average_ppr = sum(points) / len(points)

    print(
        f"{recommendation}: "
        f"{len(points)} players | "
        f"Average PPR={average_ppr:.2f}"
    )

ranked_differences = sorted(
    validation_rows,
    key=lambda row: abs(
        int(row["rank_difference"])
    ),
    reverse=True,
)

print("")
print("===== LARGEST RANK DIFFERENCES =====")

for row in ranked_differences[:15]:
    print(
        f'{row["player_name"]} '
        f'({row["position"]}) | '
        f'Model {row["model_rank"]} -> '
        f'Actual {row["actual_position_rank"]} | '
        f'{row["actual_ppr"]} PPR | '
        f'Difference '
        f'{int(row["rank_difference"]):+d}'
    )
