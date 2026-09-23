"""Re-run historical synthetic Fixed/Pure cases on installed resource-151 code."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import UnityPy
from passive_runtime_oracle import PassiveOracle, ROOT

MODULE_DIR = ROOT / "research/observations/current-res151-build51/modules"
BUILD_REPORT = ROOT / "research/evidence/pc-res144-to-res151-combat-build.json"
CARRY_REPORT = ROOT / "research/evidence/pc-res150-to-res151-combat-carryforward.json"
OUTPUT = ROOT / "research/evidence/pc-res151-fixed-pure-runtime.json"
SHARED = ("BattleConst", "BattleUtilServer", "BattleCmdServer", "BattleEffectServer")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def single_hash(report: dict, name: str) -> str:
    rows = [row for row in report["modules"] if row["name"] == name + ".lua"]
    if len(rows) != 1 or rows[0]["status"] != "IDENTICAL" or len(rows[0]["after"]) != 1:
        raise ValueError(f"Installed module was not uniquely tracked: {name}")
    return rows[0]["after"][0]["sha256"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--install-root", required=True, type=Path)
    args = parser.parse_args()
    build = json.loads(BUILD_REPORT.read_text(encoding="utf-8"))
    carry = json.loads(CARRY_REPORT.read_text(encoding="utf-8"))
    if build["currentBuild"] != "pc-res151-build51" or carry["afterBuild"] != "pc-res151-build51":
        raise ValueError("Installed build reports do not agree")
    module_names = (*SHARED, "BEFixedDamage", "BEPureDamage")
    share_bundle = args.install_root.resolve() / "_game_data_" / "DownLoad" / "share.ab"
    if sha256(share_bundle) != build["sourceHashes"]["bundles"]["share.ab"]["sha256"]:
        raise ValueError("Installed share bundle differs from pinned resource-151 build")
    UnityPy.set_assetbundle_decrypt_key((ROOT / "research/raw/bundle-key.bin").read_bytes())
    bundled = {}
    wanted = {name + ".lua" for name in module_names}
    for obj in UnityPy.load(str(share_bundle)).objects:
        if obj.type.name != "TextAsset":
            continue
        asset = obj.read()
        if asset.m_Name not in wanted:
            continue
        payload = asset.m_Script.encode("utf-8", "surrogateescape") if isinstance(asset.m_Script, str) else bytes(asset.m_Script)
        if asset.m_Name in bundled:
            raise ValueError(f"Duplicate installed module: {asset.m_Name}")
        bundled[asset.m_Name] = payload
    if set(bundled) != wanted:
        raise ValueError("One or more installed effect dependencies are missing")
    hashes = {}
    assets = {}
    for name in module_names:
        path = MODULE_DIR / (name + ".lua")
        actual = sha256(path)
        if hashlib.sha256(bundled[name + ".lua"]).hexdigest() != actual:
            raise ValueError(f"Private {name} copy differs from the installed bundle")
        if name == "BattleEffectServer":
            expected = json.loads((ROOT / "tests/synthetic/original-fixed-runtime.json").read_text(encoding="utf-8"))["sourceHashes"][name]
        else:
            expected = single_hash(carry, name)
        if actual != expected:
            raise ValueError(f"Installed {name} differs from the pinned source")
        hashes[name] = actual
        assets[name] = {"output": str(path.relative_to(ROOT)).replace("\\", "/")}
    results = {}
    for category in ("Fixed", "Pure"):
        fixture_path = ROOT / f"tests/synthetic/original-{category.lower()}-runtime.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        if fixture["build"] != "pc-res144-build51" or fixture["sourceHashes"]["BE" + category + "Damage"] != hashes["BE" + category + "Damage"] or fixture["sourceHashes"]["BattleEffectServer"] != hashes["BattleEffectServer"]:
            raise ValueError(f"Historical {category} fixture source mismatch")
        oracle = PassiveOracle("BE" + category + "Damage", assets)
        mismatches = []
        for row in fixture["fixtures"]:
            current = oracle.evaluate(row["input"])
            if current != row["expected"]:
                mismatches.append(row["id"])
        results[category] = {"fixtures": len(fixture["fixtures"]),
                             "exactMatches": len(fixture["fixtures"]) - len(mismatches),
                             "mismatches": len(mismatches),
                             "historicalFixtureSha256": sha256(fixture_path)}
        if mismatches:
            raise AssertionError(f"Installed {category} divergence in cases: {mismatches[:5]}")
    report = {
        "schemaVersion": 1, "kind": "MORIMENS_PC_RES151_FIXED_PURE_RUNTIME_COMPARISON",
        "analysisTrack": "mechanics", "status": "EXACT_MATCH_IN_SYNTHETIC_FIXTURE_DOMAIN",
        "historicalBuild": "pc-res144-build51", "installedBuild": "pc-res151-build51",
        "sourceHashes": {"buildComparison": sha256(BUILD_REPORT),
                         "carryforward": sha256(CARRY_REPORT), "modules": hashes},
        "results": results,
        "scope": "Installed Fixed/Pure effect __DoMultiEffect with installed BattleEffectServer, BattleConst, BattleUtilServer and BattleCmdServer, explicit synthetic target properties/dimension, and intercepted BeHit damage payload. Historical fixture outputs compared exactly.",
        "limitations": [
            "This is connected copied-original method execution over synthetic inputs, not a live battle or independent gameplay holdout.",
            "Target selection, catalog argument preparation, repeated-effect initialization, HP/shield resolution, statistics, callbacks and death execution are outside these fixtures.",
            "No full Fixed/Pure scenario or published-site accuracy claim follows from this component comparison.",
            "Only hashes and aggregate case counts are public; original Lua and private fixture inputs are not included here."],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(OUTPUT.relative_to(ROOT)), "results": results}))


if __name__ == "__main__":
    main()
