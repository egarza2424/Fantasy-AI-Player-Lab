
import unittest
import pandas as pd
from validate_2025_trench_snaps import validate


class TestSnaps(unittest.TestCase):

    def test_exact_id_match_and_missing_id(self):
        c = pd.DataFrame([
            dict(
                game_id='G1', team='PHI', gsis_id='00-1',
                unit='OL', position='LT', depth_rank=1,
                week=1, opponent='DAL', player_name='A. Player'
            ),
            dict(
                game_id='G1', team='PHI', gsis_id='00-2',
                unit='OL', position='LT', depth_rank=2,
                week=1, opponent='DAL', player_name='B. Player'
            ),
            dict(
                game_id='G1', team='PHI', gsis_id=None,
                unit='DL', position='NT', depth_rank=1,
                week=1, opponent='DAL', player_name=None
            )
        ])

        s = pd.DataFrame([
            dict(
                game_id='G1', team='PHI', player_id='00-1',
                offense_snaps=60, defense_snaps=0
            ),
            dict(
                game_id='G1', team='PHI', player_id='00-2',
                offense_snaps=12, defense_snaps=0
            ),
            dict(
                game_id='G2', team='PHI', player_id='00-1',
                offense_snaps=70, defense_snaps=0
            )
        ])

        p, g = validate(c, s)

        self.assertEqual(int(p.played_unit_snaps.sum()), 2)
        self.assertEqual(int((~p.id_present).sum()), 1)
        self.assertEqual(
            int(g[g.unit == 'OL'].backup_played.iloc[0]), 1
        )
        self.assertEqual(
            int(p.loc[p.gsis_id == '00-1', 'unit_snaps'].iloc[0]),
            60
        )

    def test_ambiguous_names_not_matched(self):
        c = pd.DataFrame([
            dict(
                game_id='G1', team='PHI', gsis_id='00-1',
                unit='OL', position='LT', depth_rank=1,
                week=1, opponent='DAL', player_name='J Smith'
            )
        ])

        s = pd.DataFrame([
            dict(
                game_id='G1', team='PHI', player_id='00-2',
                offense_snaps=40, defense_snaps=0
            ),
            dict(
                game_id='G1', team='PHI', player_id='00-3',
                offense_snaps=30, defense_snaps=0
            )
        ])

        p, _ = validate(c, s)

        self.assertFalse(bool(p.snap_record_found.iloc[0]))


if __name__ == '__main__':
    unittest.main()
