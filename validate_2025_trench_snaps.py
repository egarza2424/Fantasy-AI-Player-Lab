"""Audit pregame trench depth-chart candidates against postgame NFLverse snaps.

NFLverse snap-count player IDs are PFR IDs, while depth charts use GSIS IDs.
Join only on unique normalized name within the exact game and team.
Postgame snap counts are validation outcomes, never pregame model features.
"""
import argparse
import re
import unicodedata
import pandas as pd


def normalize_name(value):
    if pd.isna(value):
        return ''
    value = unicodedata.normalize('NFKD', str(value))
    value = ''.join(c for c in value if not unicodedata.combining(c))
    value = value.lower().replace('’', "'")
    value = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b', '', value)
    return re.sub(r'[^a-z0-9]', '', value)


def validate(candidates, snaps):
    required_c = {'game_id', 'week', 'team', 'opponent', 'player_name', 'gsis_id',
                  'unit', 'position', 'depth_rank'}
    missing_c = required_c - set(candidates.columns)
    if missing_c:
        raise ValueError(f'Candidates missing {sorted(missing_c)}')
    required_s = {'game_id', 'team', 'player', 'offense_snaps', 'defense_snaps'}
    missing_s = required_s - set(snaps.columns)
    if missing_s:
        raise ValueError(f'Snap counts missing {sorted(missing_s)}; found {list(snaps)}')

    cand = candidates.copy()
    sn = snaps.copy()
    for frame, name_col in ((cand, 'player_name'), (sn, 'player')):
        frame['_game'] = frame.game_id.astype(str).str.strip()
        frame['_team'] = frame.team.astype(str).str.strip().str.upper()
        frame['_name'] = frame[name_col].map(normalize_name)
    for col in ('offense_snaps', 'defense_snaps'):
        sn[col] = pd.to_numeric(sn[col], errors='coerce').fillna(0)

    keys = ['_game', '_team', '_name']
    cand_counts = (cand[cand['_name'].ne('')].groupby(keys).size()
                   .rename('_cand_count').reset_index())
    snap_counts = (sn[sn['_name'].ne('')].groupby(keys).size()
                   .rename('_snap_count').reset_index())
    sn = sn.merge(snap_counts, on=keys, how='left')
    sn = sn[sn['_name'].ne('') & sn['_snap_count'].eq(1)]
    cand = cand.merge(cand_counts, on=keys, how='left')
    snap_cols = keys + ['offense_snaps', 'defense_snaps']
    if 'pfr_player_id' in sn.columns:
        snap_cols.append('pfr_player_id')
    out = cand.merge(sn[snap_cols], on=keys, how='left',
                     validate='many_to_one', indicator=True)
    out['id_present'] = (out.gsis_id.notna()
                         & out.gsis_id.astype(str).str.strip().ne(''))
    out['name_unique'] = out['_cand_count'].eq(1)
    out['snap_record_found'] = out['_merge'].eq('both') & out.name_unique
    out.loc[~out.snap_record_found, ['offense_snaps', 'defense_snaps']] = float('nan')
    out['unit_snaps'] = out.apply(
        lambda r: r.offense_snaps if r.unit == 'OL' else r.defense_snaps, axis=1)
    out['played_unit_snaps'] = out.unit_snaps.gt(0) & out.snap_record_found
    out['depth_rank'] = pd.to_numeric(out.depth_rank, errors='coerce')
    out['listed_first_string'] = out.depth_rank.eq(1)
    out['match_method'] = out.snap_record_found.map(
        {True: 'UNIQUE_NAME_GAME_TEAM', False: 'UNMATCHED'})
    out['status'] = out.apply(
        lambda r: 'MISSING_NAME' if not r['_name'] else
                  'AMBIGUOUS_CANDIDATE_NAME' if not r.name_unique else
                  'NO_UNIQUE_SNAP_MATCH' if not r.snap_record_found else
                  'PLAYED' if r.played_unit_snaps else 'ZERO_UNIT_SNAPS', axis=1)
    coverage = []
    for (game, team, unit), g in out.groupby(['game_id', 'team', 'unit'], dropna=False):
        first = g[g.listed_first_string]
        coverage.append({
            'game_id': game, 'team': team, 'unit': unit,
            'candidates': len(g), 'first_string_listed': len(first),
            'first_string_with_id': int(first.id_present.sum()),
            'first_string_with_snap_record': int(first.snap_record_found.sum()),
            'first_string_played': int(first.played_unit_snaps.sum()),
            'backup_played': int((g.depth_rank.gt(1) & g.played_unit_snaps).sum()),
            'any_missing_id': bool((~g.id_present).any()),
            'ambiguous_candidates': int((~g.name_unique & g['_name'].ne('')).sum())})
    keep = ['game_id', 'week', 'team', 'opponent', 'player_name', 'gsis_id',
            'unit', 'position', 'depth_rank', 'listed_first_string', 'id_present',
            'name_unique', 'snap_record_found', 'match_method', 'offense_snaps',
            'defense_snaps', 'unit_snaps', 'played_unit_snaps', 'status']
    if 'pfr_player_id' in out.columns:
        keep.insert(6, 'pfr_player_id')
    return out[keep], pd.DataFrame(coverage)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--candidates', required=True)
    p.add_argument('--snaps', required=True)
    p.add_argument('--output-prefix', default='trench_snap_validation_2025')
    a = p.parse_args()
    players, coverage = validate(
        pd.read_csv(a.candidates, low_memory=False),
        pd.read_csv(a.snaps, low_memory=False))
    players.to_csv(a.output_prefix + '_players.csv', index=False)
    coverage.to_csv(a.output_prefix + '_team_games.csv', index=False)
    print(f'Candidate records: {len(players)}; unique-name/game/team snap matches: '
          f'{int(players.snap_record_found.sum())}; missing GSIS IDs: '
          f'{int((~players.id_present).sum())}; ambiguous candidate names: '
          f'{int((~players.name_unique & players.player_name.notna()).sum())}')
    for unit in ('OL', 'DL'):
        p_unit = players[(players.unit == unit) & players.listed_first_string]
        c_unit = coverage[coverage.unit == unit]
        print(f'{unit}: first-string entries {len(p_unit)}, played unit snaps '
              f'{int(p_unit.played_unit_snaps.sum())}; team-games {len(c_unit)}; '
              f'team-games with backup participating '
              f'{int(c_unit.backup_played.gt(0).sum())}')
    print('LIMITATION: unique normalized name + game + team is provisional. '
          'Ambiguous records excluded; snap participation does not prove a start.')


if __name__ == '__main__':
    main()
