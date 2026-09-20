# Local replay recovery checkpoint

The read-only inspection in `research/evidence/local-replay-storage-inspection.json` checked the installed game's BattleLog directory, the Morimens LocalLow directory, and replay/record-named JSON/text/log/data candidates under BattleLog and `_game_data_`. BattleLog was empty and no named replay candidates were found. The two Unity logs had no matches for `BattleReplayData FirstRecord`, `copyProperties`, `recordZips`, `compStr`, or `occupation_master`. Log hashes and exact checked paths are recorded without copying log contents into the website.

Original `BattleReplayPlayer.LoadFromLocalFile` accepts an explicitly supplied file path. `DealReplayContent` decodes JSON, decompresses `compStr` with the client LZ4 module, unpacks it with cmsgpack, and decompresses/unpacks each `recordZips` entry. It keeps the result in replay-player fields. The inspected download/playback methods do not automatically save a replay file. `SaveRecordList` populates an in-memory field despite its name; it is not a disk writer.

No replay payload was recovered. This is not an exhaustive search of other locations or a statement about what process memory contains. It does not establish whether an actual replay has enough input properties for a damage prediction. No network request, process-memory read, desktop control or gameplay observation was performed.

If a replay export is later available, preserve its original bytes and hash before decoding. Verify the client's binary-string and LZ4 conventions against those bytes rather than assuming base64 or a standard LZ4 frame. Extracted outcomes from already viewed replays can support regression validation but cannot retrospectively become blind holdouts.
