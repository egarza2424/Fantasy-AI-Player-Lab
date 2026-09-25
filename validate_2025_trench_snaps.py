"""Retrospectively validate pregame trench depth-chart candidates using 2025 snaps.
Snap counts are OUTCOMES for audit only, never pregame features.
"""
import argparse
import csv
from collections import Counter, defaultdict
import pandas as pd


def normalize_id(s):
    if pd.isna(s): return ''
    t = str(s).strip()
    return '' if t.lower() in ('nan', 'none', '') else t


def validate(candidates, snaps):
    needed = {'game_id','team','gsis_id','unit','position','depth_rank'}
    missing = needed - set(candidates.columns)
    if missing: raise ValueError(f'Candidates missing {sorted(missing)}')
    # nflverse snap-count release has historically used player_id and team;
    # fail with actual columns if the release schema changes.
    player_col = next((x for x in ('player_id','gsis_id') if x in snaps), None)
    team_col = next((x for x in ('team','team_abbr') if x in snaps), None)
    if not player_col or not team_col or 'game_id' not in snaps:
        raise ValueError(f'Snap counts require game_id, player_id/gsis_id and team/team_abbr; found {list(snaps)}')
    for col in ('offense_snaps','defense_snaps'):
        if col not in snaps: raise ValueError(f'Snap counts missing {col}; found {list(snaps)}')
    cand = candidates.copy(); sn = snaps.copy()
    for frame, idcol, teamcol in ((cand,'gsis_id','team'),(sn,player_col,team_col)):
        frame['_id'] = frame[idcol].map(normalize_id)
        frame['_team'] = frame[teamcol].astype(str).str.strip().str.upper()
        frame['_game'] = frame.game_id.astype(str).str.strip()
    sn['offense_snaps'] = pd.to_numeric(sn.offense_snaps, errors='coerce').fillna(0)
    sn['defense_snaps'] = pd.to_numeric(sn.defense_snaps, errors='coerce').fillna(0)
    # An exact game + team + GSIS join prevents name collisions and wrong-week joins.
    sn = sn[sn._id.ne('')].groupby(['_game','_team','_id'],as_index=False)[['offense_snaps','defense_snaps']].max()
    out = cand.merge(sn,how='left',on=['_game','_team','_id'],validate='many_to_one',indicator=True)
    out['id_present'] = out._id.ne('')
    out['snap_record_found'] = out._merge.eq('both')
    out['unit_snaps'] = out.apply(lambda r: r.offense_snaps if r.unit=='OL' else r.defense_snaps,axis=1).fillna(0)
    out['played_unit_snaps'] = out.unit_snaps.gt(0)
    out['depth_rank'] = pd.to_numeric(out.depth_rank,errors='coerce')
    out['listed_first_string'] = out.depth_rank.eq(1)
    out['status'] = out.apply(lambda r: 'MISSING_ID' if not r.id_present else ('NO_SNAP_RECORD' if not r.snap_record_found else ('PLAYED' if r.played_unit_snaps else 'ZERO_UNIT_SNAPS')),axis=1)
    # Do not equate any snaps to a confirmed start; snap counts cannot prove who started.
    coverage=[]
    for (game,team,unit), g in out.groupby(['game_id','team','unit'],dropna=False):
        first = g[g.listed_first_string]
        coverage.append({'game_id':game,'team':team,'unit':unit,'candidates':len(g),
            'first_string_listed':len(first),'first_string_with_id':int(first.id_present.sum()),
            'first_string_with_snap_record':int(first.snap_record_found.sum()),
            'first_string_played':int(first.played_unit_snaps.sum()),
            'backup_played':int((g.depth_rank.gt(1)&g.played_unit_snaps).sum()),
            'any_missing_id':bool((~g.id_present).any())})
    keep = ['game_id','week','team','opponent','player_name','gsis_id','unit','position','depth_rank','listed_first_string','id_present','snap_record_found','offense_snaps','defense_snaps','unit_snaps','played_unit_snaps','status']
    return out[keep],pd.DataFrame(coverage)


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--candidates',required=True);p.add_argument('--snaps',required=True)
    p.add_argument('--output-prefix',default='trench_snap_validation_2025')
    a=p.parse_args()
    players,coverage=validate(pd.read_csv(a.candidates,low_memory=False),pd.read_csv(a.snaps,low_memory=False))
    players.to_csv(a.output_prefix+'_players.csv',index=False)
    coverage.to_csv(a.output_prefix+'_team_games.csv',index=False)
    print(f'Candidate records: {len(players)}; exact player/game/team snap matches: {int(players.snap_record_found.sum())}; missing IDs: {int((~players.id_present).sum())}')
    for unit in ('OL','DL'):
        p=players[(players.unit==unit)&players.listed_first_string]
        c=coverage[coverage.unit==unit]
        print(f'{unit}: first-string entries {len(p)}, played unit snaps {int(p.played_unit_snaps.sum())}; team-games {len(c)}; team-games with backup participating {int(c.backup_played.gt(0).sum())}')
    print('CAUTION: snap participation does not prove a player started or was healthy; postgame snaps used for validation ONLY.')

if __name__=='__main__':main()
