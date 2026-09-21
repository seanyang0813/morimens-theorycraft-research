# Replay acquisition path

Scope: downloaded PC resource 144 / build 51 plus one explicitly authorized live-client replay retrieval. Public files contain no player identifier, battle UUID, object name, or credential.

The client does not turn a player UID directly into replay bytes. Its player-record UI performs this chain:

1. `SocialPlayerInfoPanel` requests facade field `{Type = "CopyReview"}` for the selected player UID.
2. The returned `facade.copyReview.widQueue` becomes the ordered record-ID list. `CopyRecordsModel` requests IDs in batches of ten through `QueryOthersRecentReview(uid, widList)`.
3. Each returned record row can contain `stageTid`, `wid`, `playerId`, and `battleUuid`. Detail display uses `QueryReviewDetail(stageTid, wid)`; a separate client path supports `QueryReviewDetail2(battleUuid)`.
4. Selecting replay passes `battleUuid` into `BattleReplayPlayer`.
5. The player requests `GetOSSHeader(battleUuid)`. The response must contain `header` and may contain `objName`. The client constructs the replay URL from its zone/server-domain rules and performs an HTTP GET. The recovered object name used the `publish/BattleReplay_<uuid>.json` layout; that specific object was readable without sending the replay header.
6. A successful body is JSON-decoded, its `compStr` is decompressed with the client LZ4 module and unpacked with the client cmsgpack module. Each `recordZips` entry is decompressed and unpacked separately.

This establishes the data dependency and one observed retrieval path. Discovering the record and resolving its object name still depended on the authenticated in-client record flow. The repository does not reproduce session credentials or store a player UID. A player UID by itself cannot be passed to `tools/decode_battle_replay.py`, and public-object behavior must not be generalized beyond the retrieved object.

For an approved replay check, use the running client to open the player's record page, choose the intended high-difficulty record, and preserve the downloaded JSON bytes before decoding. Record the selected row's stage, record ID and battle UUID privately. The public evidence report should use a neutral observation ID and hashes rather than the player's UID.

Once the original JSON is available, follow [`LOCAL_REPLAY_RECOVERY.md`](LOCAL_REPLAY_RECOVERY.md): decode under ignored `research/observations/`, index its event stream, build a fail-closed action candidate, and keep observed outcomes separate from scenario construction. Already viewed outcomes can be regression evidence but cannot become a blind holdout.

## Historical build identification

The packaged PC `sproto.ab` does not solve the historical-build problem. `tools/inspect_pc_protocol_bundle.py` validates the copied bundle key, applies the same in-memory UnityFS alignment compatibility override used for other client bundles, extracts the sole `proto.spb` TextAsset, and queries it with the copied client's native `sproto.core`. The resolved catalog contains generic transport, login and notification protocols. `QueryOthersRecentReview`, `QueryReviewDetail`, `QueryReviewDetail2` and `GetOSSHeader` do not resolve as protocols, and the schema contains no literal `battleUuid`, `buildVersion`, `resourceVersion` or `recordedCombatBuild` field.

This is a bounded negative result, recorded in `research/evidence/pc-protocol-bundle-inspection.json`. Endpoint values may travel inside the generic `Base.CommonCall` payload or be defined elsewhere. Until a replay container or another authenticated response supplies a verifiable version fingerprint, a historical recording's combat build remains unknown and cannot receive strict end-to-end publication credit.
