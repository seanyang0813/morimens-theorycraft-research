"""A ranked replay report must retain mismatches instead of dropping the replay."""

import unittest

from summarize_ranked_replay_prehit import comparison_counts


class RankedReplayComparisonTests(unittest.TestCase):
    def test_reports_a_real_mismatch_alongside_exact_hits(self):
        rows = [
            {"observedBranchComparison": {"difference": 0}},
            {"observedBranchComparison": {"difference": -17}},
            {"observedBranchComparison": {"difference": 3}},
        ]
        self.assertEqual(
            comparison_counts(rows, expected_count=3, expected_exact=1),
            {"mismatchCompared": 2, "largestAbsoluteDifference": 17},
        )

    def test_rejects_missing_or_inconsistent_comparison_data(self):
        with self.assertRaises(ValueError):
            comparison_counts([{"observedBranchComparison": None}], 1, 0)
        with self.assertRaises(ValueError):
            comparison_counts([{"observedBranchComparison": {"difference": 0}}], 1, 0)


if __name__ == "__main__":
    unittest.main()
