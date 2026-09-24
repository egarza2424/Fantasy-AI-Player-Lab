"""2025 strictly walk-forward incremental Signal 10 test; run after build_trench_pregame.py.

Baseline rows are prior-produced 2025 player-week features. The team-level trench
features must come from earlier completed games; no postgame starter injury data.
"""
import argparse,csv,collections
import numpy as np
from scipy.stats import spearmanr
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from public_trench_signal import compute


def read(path):
    with open(path,newline='',encoding='utf-8') as f:return list(csv.DictReader(f))

def run(baseline_path,metric_path,out_prefix):
    base=[r for r in read(baseline_path) if r['model']=='baseline']
    metrics=read(metric_path)
    features={}; rejected=0
    for r in metrics:
        z=compute(r)
        if not z['available']:rejected+=1;continue
        key=(int(r['week']),r['defense_team'])
        if key in features:raise ValueError(f'Ambiguous defensive opponent/week {key}')
        features[key]=z
    rows=[];unmatched=collections.Counter()
    for r in base:
        key=(int(r['week']),r['opponent'])
        if key not in features:
            unmatched[key]+=1;continue
        t=features[key]
        if r['position'] in ('QB','WR'):trench=t['pass_score']
        elif r['position']=='RB':trench=t['run_score']
        else:trench=(t['pass_score']+t['run_score'])/2
        rows.append({**r,'week':int(r['week']),'actual_ppr':float(r['actual_ppr']),
                     'recent_ppr':float(r['recent_ppr']),'recent_opp':float(r['recent_opp']),
                     'defense_prior_allowed':float(r['defense_prior_allowed']),
                     'trench_score':trench,'pass_score':t['pass_score'],'run_score':t['run_score'],
                     'trench_confidence':t['confidence']})
    predictions=[];weekly=[]
    for pos in ('QB','RB','WR','TE'):
        p=[r for r in rows if r['position']==pos]
        for week in range(8,19):
            train=[r for r in p if r['week']<week];test=[r for r in p if r['week']==week]
            if len(train)<30 or len(test)<8:continue
            y=np.array([r['actual_ppr'] for r in train]);actual=np.array([r['actual_ppr'] for r in test]);out={}
            for label,cols in [('baseline',['recent_ppr','recent_opp','defense_prior_allowed']),
                               ('plus_trench',['recent_ppr','recent_opp','defense_prior_allowed','trench_score'])]:
                m=make_pipeline(StandardScaler(),Ridge(alpha=20.0))
                m.fit(np.array([[r[k] for k in cols] for r in train]),y)
                pred=m.predict(np.array([[r[k] for k in cols] for r in test]));out[label]=pred
                for r,v in zip(test,pred):predictions.append({**r,'model_tested':label,'predicted_ppr':round(float(v),4)})
            weekly.append({'position':pos,'week':week,'n':len(test),
                'baseline_mae':float(np.mean(abs(out['baseline']-actual))),
                'plus_trench_mae':float(np.mean(abs(out['plus_trench']-actual))),
                'baseline_rho':float(spearmanr(out['baseline'],actual).statistic),
                'plus_trench_rho':float(spearmanr(out['plus_trench'],actual).statistic)})
    if not weekly:raise RuntimeError('No eligible matched historical games; check data coverage and joins')
    for suffix,data in [('predictions',predictions),('weekly',weekly)]:
        with open(f'{out_prefix}_{suffix}.csv','w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=list(data[0]));w.writeheader();w.writerows(data)
    print(f'Matched player-weeks: {len(rows)}; missing player-weeks: {sum(unmatched.values())}; rejected metric rows: {rejected}')
    for pos in ('QB','RB','WR','TE'):
        r=[x for x in weekly if x['position']==pos]
        if not r:continue
        print(pos,'weeks',len(r),'n',sum(x['n'] for x in r),
              'weekly baseline MAE',round(np.average([x['baseline_mae'] for x in r],weights=[x['n'] for x in r]),3),
              'with trench MAE',round(np.average([x['plus_trench_mae'] for x in r],weights=[x['n'] for x in r]),3))
    print('LIMITATION: team-level public proxies only; no verified historical individual starter grades/injuries.')

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--baseline',required=True);a.add_argument('--metrics',required=True);a.add_argument('--output-prefix',default='2025_trench_walkforward');x=a.parse_args()
    run(x.baseline,x.metrics,x.output_prefix)
