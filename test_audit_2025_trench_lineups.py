import pandas as pd
from audit_2025_trench_lineups import audit

sched=pd.DataFrame([dict(season=2025,game_type='REG',game_id='2025_1_B_A',week=1,home_team='A',away_team='B',gameday='2025-09-07',gametime='13:00')])
records=[]
for team in ['A','B']:
    for pos in ['LT','LG','C','RG','RT','DE','DT']:
        records.append(dict(dt='2025-09-05',team=team,player_name=f'{team}_{pos}',gsis_id=f'{team}{pos}',pos_abb=pos,pos_rank=1))
    # Same-day update MUST NOT override earlier chart
    records.append(dict(dt='2025-09-07',team=team,player_name='LEAK',gsis_id='LEAK',pos_abb='LT',pos_rank=1))
rows,players=audit(pd.DataFrame(records),sched)
assert len(rows)==2 and all(r['ol_complete'] for r in rows)
assert len(players)==14 and all(r['player_name']!='LEAK' for r in players)
assert all(r['chart_date']=='2025-09-05' for r in rows)
empty,_=audit(pd.DataFrame([dict(dt='2025-09-07',team='A',player_name='LEAK',pos_abb='LT',pos_rank=1)]),sched)
assert all(r['status']=='NO_PRIOR_CHART' for r in empty)
print('PASS: two-team coverage, complete OL slots, same-day leakage blocked, missing prior charts reported.')
