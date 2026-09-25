"""Tests for unique-name, exact-game/team postgame snap validation."""
import unittest
import pandas as pd
from validate_2025_trench_snaps import validate


class TestSnaps(unittest.TestCase):
    def test_unique_name_match_and_missing_id(self):
        c = pd.DataFrame([
            dict(game_id='G1', team='PHI', gsis_id='00-1', unit='OL',
                 position='LT', depth_rank=1, week=1, opponent='DAL', player_name='A. Player'),
            dict(game_id='G1', team='PHI', gsis_id='00-2', unit='OL',
                 position='LT', depth_rank=2, week=1, opponent='DAL', player_name='B. Player'),
            dict(game_id='G1', team='PHI', gsis_id=None, unit='DL',
                 position='NT', depth_rank=1, week=1, opponent='DAL', player_name=None),
        ])
        s = pd.DataFrame([
            dict(game_id='G1', team='PHI', player='A Player', pfr_player_id='P1',
                 offense_snaps=60, defense_snaps=0),
            dict(game_id='G1', team='PHI', player='B Player', pfr_player_id='P2',
                 offense_snaps=12, defense_snaps=0),
            dict(game_id='G2', team='PHI', player='A Player', pfr_player_id='P1',
                 offense_snaps=70, defense_snaps=0),
        ])
        players, coverage = validate(c, s)
        self.assertEqual(int(players.played_unit_snaps.sum()), 2)
        self.assertEqual(int((~players.id_present).sum()), 1)
        self.assertEqual(int(coverage[coverage.unit == 'OL'].backup_played.iloc[0]), 1)
        self.assertEqual(int(players.loc[players.gsis_id == '00-1', 'unit_snaps'].iloc[0]), 60)

    def test_ambiguous_snap_names_not_matched(self):
        c = pd.DataFrame([
            dict(game_id='G1', team='PHI', gsis_id='00-1', unit='OL',
                 position='LT', depth_rank=1, week=1, opponent='DAL', player_name='J Smith')
        ])
        s = pd.DataFrame([
            dict(game_id='G1', team='PHI', player='J Smith', pfr_player_id='P1',
                 offense_snaps=40, defense_snaps=0),
            dict(game_id='G1', team='PHI', player='J Smith', pfr_player_id='P2',
                 offense_snaps=30, defense_snaps=0),
        ])
        players, _ = validate(c, s)
        self.assertFalse(bool(players.snap_record_found.iloc[0]))

    def test_ambiguous_candidate_names_not_matched(self):
        c = pd.DataFrame([
            dict(game_id='G1', team='PHI', gsis_id='00-1', unit='OL',
                 position='LT', depth_rank=1, week=1, opponent='DAL', player_name='J Smith'),
            dict(game_id='G1', team='PHI', gsis_id='00-2', unit='OL',
                 position='LG', depth_rank=1, week=1, opponent='DAL', player_name='J. Smith'),
        ])
        s = pd.DataFrame([
            dict(game_id='G1', team='PHI', player='J Smith', pfr_player_id='P1',
                 offense_snaps=40, defense_snaps=0),
        ])
        players, _ = validate(c, s)
        self.assertEqual(int(players.snap_record_found.sum()), 0)


if __name__ == '__main__':
    unittest.main()
