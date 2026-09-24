"""Audit 2025 nflverse dated depth charts for PREKICKOFF trench lineup coverage.

This is a data-availability audit, NOT an injury/grade model. Input depth-chart
CSV uses the 2025 ESPN-era schema (dt, team, player_name, gsis_id, pos_abb,
pos_rank). Schedule CSV uses nflverse game schedule fields. Never use a
snapshot dated on/after game day as proof it was published before kickoff:
date-only chart timestamps are treated conservatively as midnight *next day*
in US Eastern time. See audit outputs for unknown publication times.
"""
import argparse
import csv
from collections import Counter, defaultdict
from datetime import timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
import pandas as pd

ET = ZoneInfo('America/New_York')
OL = {'LT', 'LG', 'C', 'RG', 'RT'}
DL = {'DE', 'DT', 'NT', 'EDGE', 'LE', 'RE', 'LDE', 'RDE', 'LDT', 'RDT'}

def audit(depth, schedule):
    required_depth = {'dt','team','player_name','pos_abb','pos_rank'}
    required_schedule = {'season','game_type','game_id','week','home_team','away_team','gameday','gametime'}
    for label, frame, cols in [('depth charts',depth,required_depth),('schedule',schedule,required_schedule)]:
        missing=cols-set(frame.columns)
        if missing: raise ValueError(f'{label} missing {sorted(missing)}')
    depth=depth.copy();schedule=schedule.copy()
    depth['chart_day']=pd.to_datetime(depth['dt'],errors='coerce').dt.date
    depth['rank']=pd.to_numeric(depth['pos_rank'],errors='coerce')
    depth['pos_abb']=depth['pos_abb'].astype(str).str.upper().str.strip()
    depth['team']=depth['team'].astype(str).str.upper().str.strip()
    schedule=schedule[(pd.to_numeric(schedule.season,errors='coerce')==2025)&(schedule.game_type=='REG')].copy()
    rows=[];candidates=[]
    for g in schedule.itertuples(index=False):
        if pd.isna(g.gameday) or pd.isna(g.gametime): continue
        kickoff=pd.Timestamp(f'{g.gameday} {g.gametime}').tz_localize(ET).tz_convert('UTC')
        for team, opponent in [(g.home_team,g.away_team),(g.away_team,g.home_team)]:
            team=str(team).upper().strip()
            # Source has only a date, not guaranteed publication time. Only
            # accept charts dated strictly BEFORE game day, never same day.
            eligible=depth[(depth.team==team)&depth.chart_day.notna()&
                           (depth.chart_day < kickoff.tz_convert(ET).date())]
            if eligible.empty:
                rows.append({'game_id':g.game_id,'week':g.week,'team':team,'opponent':opponent,
                             'kickoff_utc':kickoff.isoformat(),'chart_date':'',
                             'ol_slots_found':0,'dl_roles_found':0,'ol_complete':False,
                             'candidate_count':0,'status':'NO_PRIOR_CHART'})
                continue
            day=eligible.chart_day.max();latest=eligible[eligible.chart_day==day]
            ol_slots=set(latest[latest.pos_abb.isin(OL)].pos_abb)
            dl_roles=set(latest[latest.pos_abb.isin(DL)].pos_abb)
            rows.append({'game_id':g.game_id,'week':g.week,'team':team,'opponent':opponent,
                         'kickoff_utc':kickoff.isoformat(),'chart_date':str(day),
                         'ol_slots_found':len(ol_slots),'dl_roles_found':len(dl_roles),
                         'ol_complete':ol_slots==OL,'candidate_count':len(latest),
                         'status':'PRIOR_CHART_FOUND'})
            for r in latest.itertuples(index=False):
                if r.pos_abb not in OL|DL: continue
                candidates.append({'game_id':g.game_id,'week':g.week,'team':team,
                                   'opponent':opponent,'kickoff_utc':kickoff.isoformat(),
                                   'chart_date':str(day),'player_name':r.player_name,
                                   'gsis_id':getattr(r,'gsis_id',''),'position':r.pos_abb,
                                   'depth_rank':r.rank,'unit':'OL' if r.pos_abb in OL else 'DL',
                                   'grade_status':'MISSING','injury_status':'UNVERIFIED',
                                   'projection_status':'DEPTH_CHART_ONLY'})
    return rows,candidates

def write(path, rows, columns):
    with open(path,'w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=columns);w.writeheader();w.writerows(rows)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--depth',required=True);p.add_argument('--schedule',required=True)
    p.add_argument('--output-prefix',default='trench_lineup_audit_2025')
    a=p.parse_args()
    rows,candidates=audit(pd.read_csv(a.depth,low_memory=False),pd.read_csv(a.schedule,low_memory=False))
    prefix=Path(a.output_prefix)
    write(str(prefix)+'_coverage.csv',rows,['game_id','week','team','opponent','kickoff_utc','chart_date','ol_slots_found','dl_roles_found','ol_complete','candidate_count','status'])
    write(str(prefix)+'_candidates.csv',candidates,['game_id','week','team','opponent','kickoff_utc','chart_date','player_name','gsis_id','position','depth_rank','unit','grade_status','injury_status','projection_status'])
    c=Counter(r['status'] for r in rows)
    print(f'Pregame team-games audited: {len(rows)}; prior chart found: {c["PRIOR_CHART_FOUND"]}; missing: {c["NO_PRIOR_CHART"]}')
    print(f'All five OL depth slots present: {sum(r["ol_complete"] for r in rows)}; trench candidate rows: {len(candidates)}')
    print('CAUTION: Depth charts are not verified starters or injury reports. Date-only publication time unknown. No individual OL/DL grades inferred.')

if __name__=='__main__':main()
