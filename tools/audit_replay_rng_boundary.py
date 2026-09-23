"""Audit whether a decoded replay supplies pre-hit RNG state, without publishing its seed."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import UnityPy


ROOT = Path(__file__).resolve().parents[1]
WRAPPERS = ("CRand.lua", "Rand.lua")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def wrapper_hashes(bundle: Path) -> dict[str, str]:
    UnityPy.set_assetbundle_decrypt_key((ROOT / "research/raw/bundle-key.bin").read_bytes())
    found: dict[str, str] = {}
    for obj in UnityPy.load(str(bundle)).objects:
        if obj.type.name != "TextAsset":
            continue
        value = obj.read()
        if value.m_Name not in WRAPPERS:
            continue
        data = value.m_Script.encode("utf-8", "surrogateescape") if isinstance(value.m_Script, str) else bytes(value.m_Script)
        if value.m_Name in found:
            raise ValueError("Duplicate RNG wrapper: " + value.m_Name)
        found[value.m_Name] = sha(data)
    if set(found) != set(WRAPPERS):
        raise ValueError("Both RNG wrappers must be present in the current bundle")
    return found


def count_rng_state(value: object) -> int:
    if isinstance(value, dict):
        return sum(key.lower() in {"randomstate", "rngstate"} for key in value) + sum(count_rng_state(child) for child in value.values())
    if isinstance(value, list):
        return sum(count_rng_state(child) for child in value)
    return 0


def audit(decoded: dict, current_wrapper_hashes: dict[str, str]) -> dict:
    if decoded.get("kind") != "MORIMENS_DECODED_REPLAY":
        raise ValueError("Decoded battle replay required")
    digest = decoded.get("inputSha256")
    if not isinstance(digest, str) or len(digest) != 64 or any(char not in "0123456789abcdef" for char in digest):
        raise ValueError("Decoded replay container hash required")
    battle = decoded.get("decoded", {}).get("battleDat")
    if not isinstance(battle, dict):
        raise ValueError("Complete battle descriptor required")
    seed = battle.get("randomseed")
    if not isinstance(seed, int) or isinstance(seed, bool):
        raise ValueError("Battle seed must be an integer")
    baseline = {row["name"]: row["sha256"] for row in json.loads((ROOT / "research/symbols/text-assets.json").read_text(encoding="utf-8")) if row["name"] in WRAPPERS}
    return {
        "schemaVersion": 1,
        "kind": "MORIMENS_REPLAY_RNG_INPUT_BOUNDARY",
        "analysisTrack": "verification",
        "sampleContainerSha256": decoded["inputSha256"],
        "battleSeedPresent": seed != 0,
        "serverRunBattle": battle.get("svrRunBattle") is True,
        "serializedRngStateFields": count_rng_state(decoded["decoded"]),
        "sourceWrappers": [
            {"name": name, "baselineSha256": baseline[name], "currentSha256": current_wrapper_hashes[name], "identical": baseline[name] == current_wrapper_hashes[name]}
            for name in WRAPPERS
        ],
        "conclusion": "SEED_NOT_A_PREHIT_ROLL",
        "limitations": [
            "The battle seed is intentionally omitted from this public artifact.",
            "A seed cannot identify an event-time critical draw without the native PRNG and all intervening draws.",
            "The decoded replay contains outcomes, so this audit is not a blind prediction or a gameplay validation.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--decoded", type=Path, required=True)
    parser.add_argument("--current-share", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to(ROOT / "research/evidence"):
        raise ValueError("Public output must stay under research/evidence")
    if output.exists():
        raise FileExistsError("Refusing to overwrite an RNG audit")
    decoded = json.loads(args.decoded.read_text(encoding="utf-8"))
    result = audit(decoded, wrapper_hashes(args.current_share))
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "conclusion": result["conclusion"], "serializedRngStateFields": result["serializedRngStateFields"]}))


if __name__ == "__main__":
    main()
