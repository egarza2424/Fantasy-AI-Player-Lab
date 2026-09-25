"""Build strictly prior-game public-data inputs for public_trench_signal.py.

Run on a machine/GitHub Actions with network access:
 python build_trench_pregame.py --pbp path/to/play_by_play_2025.parquet \
   --schedule path/to/schedules.csv --output trench_2025_pregame_metrics.csv

Sources: nflverse pbp release and nflverse schedules release. This creates
TEAM-level proxies, not individual OL/DL grades or confirmed starter injuries.
The published timestamp is conservatively set to the final prior game's kickoff
plus 48 hours; if that exceeds current kickoff the matchup is skipped.
"""
import argparse
import csv
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pandas as pd

COUNT_KEYS=('offense_pass_plays','offense_sacks_allowed','offense_qb_hits_allowed',
            'offense_rushes','offense_rush_successes','defense_pass_plays',
            'defense_sacks','defense_qb_hits','defense_rushes','defense_rush_stops')

def kickoff_utc(gameday,gametime):
    # nflverse schedules gametime is ET (DST-aware using America/New_York).
    t=pd.Timestamp(f'{gameday} {gametime}').tz_localize('America/New_York',ambiguous='raise',nonexistent='raise')
    return t.tz_convert('UTC').to_pydatetime()

def to_flag(v):
    return int(pd.notna(v) and (v is True or str(v).lower() in ('true','1','1.0')))

def aggregate(pbp):
    """One row per completed team game; avoid attributing kneels to rushes."""
    out=defaultdict(lambda:defaultdict(int))
    needed={'game_id','posteam','defteam','play_type','sack','qb_hit','success'}
    missing=needed-set(pbp.columns)
    if missing:raise ValueError(f'PBP missing columns: {sorted(missing)}')
    for r in pbp[list(needed)].itertuples(index=False,name=None):
        d=dict(zip(list(needed),r));g=d['game_id'];o=d['posteam'];defn=d['defteam']
        if pd.isna(g) or pd.isna(o) or pd.isna(defn):continue
        pt=d['play_type'];sack=to_flag(d['sack']);hit=to_flag(d['qb_hit'])
        # nflverse sacks can be play_type='pass'; count explicitly either way.
        ispass=(pt=='pass' or sack==1);isrun=pt=='run'
        if not (ispass or isrun):continue
        a=out[(str(g),str(o))];b=out[(str(g),str(defn))]
        if ispass:
            a['offense_pass_plays']+=1;a['offense_sacks_allowed']+=sack
            a['offense_qb_hits_allowed']+=hit
            b['defense_pass_plays']+=1;b['defense_sacks']+=sack;b['defense_qb_hits']+=hit
        elif isrun:
            a['offense_rushes']+=1;a['offense_rush_successes']+=to_flag(d['success'])
            b['defense_rushes']+=1;b['defense_rush_stops']+=(1-to_flag(d['success']))
    return out

def build(pbp,schedule,prior_games=3,publication_lag_hours=48):
    if prior_games<1:raise ValueError('prior_games must be >=1')
    schedule=schedule.copy()
    required={'game_id','season','week','game_type','home_team','away_team','gameday','gametime'}
    if required-set(schedule.columns):raise ValueError(f'Schedule missing {sorted(required-set(schedule.columns))}')
   
    schedule = schedule[
        (schedule.season == 2026)
        & (schedule.game_type == 'REG')
        & schedule.gameday.notna()
        & schedule.gametime.notna()
    ].copy()
    schedule['kickoff'] = schedule.apply(
        lambda r: kickoff_utc(r.gameday, r.gametime),
        axis=1
    )
    schedule=schedule.sort_values(['kickoff','game_id'])
    counts=aggregate(pbp)
    histories=defaultdict(list);rows=[]
    for g in schedule.itertuples(index=False):
        for team,opp in [(g.home_team,g.away_team),(g.away_team,g.home_team)]:
            # A game counts only after its conservative publication time.
            own=[x for x in histories[(g.season,team)] if x[0]<g.kickoff][-prior_games:]
            their=[x for x in histories[(g.season,opp)] if x[0]<g.kickoff][-prior_games:]
            if not own or not their:continue
            own_sum={k:sum(x[1].get(k,0) for x in own) for k in COUNT_KEYS}
            opp_sum={k:sum(x[1].get(k,0) for x in their) for k in COUNT_KEYS}
            keys=['offense_pass_plays','offense_sacks_allowed','offense_qb_hits_allowed','offense_rushes','offense_rush_successes']
            dkeys=['defense_pass_plays','defense_sacks','defense_qb_hits','defense_rushes','defense_rush_stops']
            row={'season':g.season,'week':g.week,'game_id':g.game_id,'offense_team':team,
                 'defense_team':opp,'kickoff_utc':g.kickoff.isoformat(),
                 'metric_published_utc':max(own[-1][0],their[-1][0]).isoformat(),
                 'offense_history_games':len(own),'defense_history_games':len(their)}
            row.update({k:own_sum[k] for k in keys});row.update({k:opp_sum[k] for k in dkeys})
            if all(row[k]>0 for k in ('offense_pass_plays','offense_rushes','defense_pass_plays','defense_rushes')):
                rows.append(row)
        # Update only after both sides' pregame features are computed.
        for team in (g.home_team,g.away_team):
            c=counts.get((str(g.game_id),str(team)))
            if c and c['offense_pass_plays'] and c['offense_rushes']:
                histories[(g.season,team)].append((g.kickoff+timedelta(hours=publication_lag_hours),c))
    return rows

def main():
    p=argparse.ArgumentParser();p.add_argument('--pbp',required=True);p.add_argument('--schedule',required=True)
    p.add_argument('--output',required=True);p.add_argument('--prior-games',type=int,default=3)
    a=p.parse_args();pbp=pd.read_parquet(a.pbp);schedule=pd.read_csv(a.schedule)
    rows=build(pbp,schedule,a.prior_games)
    if not rows:raise RuntimeError('No eligible pregame matchups; check schedule/PBP coverage')
    with open(a.output,'w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    print(f'Wrote {len(rows)} strictly pregame team-matchup rows to {a.output}')
if __name__=='__main__':main()
