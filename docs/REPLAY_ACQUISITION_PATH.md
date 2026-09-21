# Replay acquisition path

Scope: downloaded PC resource 144 / build 51. This is a static trace through copied client modules. It makes no network request, contains no player identifier or credential, and does not establish that the server currently retains any particular record.

The client does not turn a player UID directly into replay bytes. Its player-record UI performs this chain:

1. `SocialPlayerInfoPanel` requests facade field `{Type = "CopyReview"}` for the selected player UID.
2. The returned `facade.copyReview.widQueue` becomes the ordered record-ID list. `CopyRecordsModel` requests IDs in batches of ten through `QueryOthersRecentReview(uid, widList)`.
3. Each returned record row can contain `stageTid`, `wid`, `playerId`, and `battleUuid`. Detail display uses `QueryReviewDetail(stageTid, wid)`; a separate client path supports `QueryReviewDetail2(battleUuid)`.
4. Selecting replay passes `battleUuid` into `BattleReplayPlayer`.
5. The player requests `GetOSSHeader(battleUuid)`. The response must contain `header` and may contain `objName`. The client constructs the replay URL from its zone/server-domain rules and performs an HTTP GET with the returned header.
6. A successful body is JSON-decoded, its `compStr` is decompressed with the client LZ4 module and unpacked with the client cmsgpack module. Each `recordZips` entry is decompressed and unpacked separately.

This establishes the data dependency, not permissionless access. The OSS request depends on an authenticated in-client RPC response; the repository does not reproduce session credentials, call the live service, or store a player UID. A player UID by itself cannot be passed to `tools/decode_battle_replay.py`.

For an approved replay check, use the running client to open the player's record page, choose the intended high-difficulty record, and preserve the downloaded JSON bytes before decoding. Record the selected row's stage, record ID and battle UUID privately. The public evidence report should use a neutral observation ID and hashes rather than the player's UID.

Once the original JSON is available, follow [`LOCAL_REPLAY_RECOVERY.md`](LOCAL_REPLAY_RECOVERY.md): decode under ignored `research/observations/`, index its event stream, build a fail-closed action candidate, and keep observed outcomes separate from scenario construction. Already viewed outcomes can be regression evidence but cannot become a blind holdout.
