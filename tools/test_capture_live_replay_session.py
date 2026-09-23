"""Pure regression checks for the public live replay capture tool."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

import capture_live_replay_session as capture


class LiveReplayCaptureTests(unittest.TestCase):
    def test_baseline_summary_never_contains_private_references(self):
        replay = "11111111-1111-1111-1111-111111111111"
        metadata = {"pid": 7, "startedAtUtc": "2026-09-22T00:00:00+00:00", "executable": "C:/Morimens.exe", "executableSha256": "a" * 64}
        report = capture.baseline_report(metadata, {replay: {"field"}}, 123, "2026-09-22T00:01:00+00:00")
        self.assertEqual(report["replayReferences"], [replay])
        rendered = json.dumps(capture.public_summary(report))
        self.assertNotIn(replay, rendered)
        self.assertEqual(capture.public_summary(report)["replayReferenceCount"], 1)

    def test_inventory_and_process_match_fail_closed(self):
        with self.assertRaises(ValueError):
            capture.ensure_reference_inventory(["not-a-uuid"])
        baseline = {"process": {"pid": 1, "startedAtUtc": "a", "executableSha256": "b"}, "replayReferences": []}
        capture.assert_same_process(baseline, {"pid": 1, "startedAtUtc": "a", "executableSha256": "b"})
        with self.assertRaises(ValueError):
            capture.assert_same_process(baseline, {"pid": 2, "startedAtUtc": "a", "executableSha256": "b"})

    def test_private_paths_cannot_escape_ignored_storage(self):
        with self.assertRaises(ValueError):
            capture.private_path(Path("README.md"), "Test")
        path = capture.private_path(Path("research/raw/safe.json"), "Test")
        self.assertEqual(path.parent, capture.PRIVATE_ROOT)

    def test_replay_envelope_accepts_binary_latin1_json_without_unpacking_it(self):
        # The live replay API may write raw compressed bytes into the JSON string.
        latin1 = b'{"compStr":"\xc0"}'
        self.assertEqual(capture.container_json_encoding(latin1), "latin1")
        self.assertEqual(capture.container_json_encoding(b'{"compStr":"ok"}'), "utf8")
        self.assertIsNone(capture.container_json_encoding(b'{"compStr":3}'))
        self.assertIsNone(capture.container_json_encoding(b'{"compStr":"\xc0"'))


if __name__ == "__main__":
    unittest.main()
