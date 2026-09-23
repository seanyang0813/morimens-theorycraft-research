"""Check the public RNG boundary audit's privacy and state detection."""

import unittest

from audit_replay_rng_boundary import audit


class ReplayRngBoundaryTest(unittest.TestCase):
    def setUp(self):
        self.decoded = {
            "kind": "MORIMENS_DECODED_REPLAY",
            "inputSha256": "a" * 64,
            "decoded": {"battleDat": {"randomseed": 123456, "svrRunBattle": True}, "unZippedRecord": []},
        }
        self.hashes = {
            "CRand.lua": "70a29b0366ec3195ec8f2d6787ba0b50b5343eebe248f50cc1e6d774efff6918",
            "Rand.lua": "4734d061c8791dbec351b8d9c4810af84d376b22e6d407e906af79e9011874f2",
        }

    def test_seed_is_not_exposed_as_a_roll(self):
        result = audit(self.decoded, self.hashes)
        self.assertTrue(result["battleSeedPresent"])
        self.assertTrue(result["serverRunBattle"])
        self.assertEqual(result["serializedRngStateFields"], 0)
        self.assertNotIn("123456", str(result))
        self.assertEqual(result["conclusion"], "SEED_NOT_A_PREHIT_ROLL")

    def test_serialized_state_is_reported_without_exposing_it(self):
        self.decoded["decoded"]["unZippedRecord"] = [{"globalData": {"randomState": "private-state"}}]
        result = audit(self.decoded, self.hashes)
        self.assertEqual(result["serializedRngStateFields"], 1)
        self.assertNotIn("private-state", str(result))


if __name__ == "__main__":
    unittest.main()
