"""Run inherited no-card and card offensive-assembly domains on resource 150."""
from pathlib import Path
import hashlib
import json

from card_setup_oracle import CardSetupOracle
from offensive_setup_oracle import SetupOracle, ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir = ROOT / "research/observations/current-res150-build51/modules"
    comparison_path = ROOT / "research/evidence/pc-res144-to-res150-combat-build.json"
    no_card_path = ROOT / "tests/synthetic/original-offensive-setup.json"
    card_path = ROOT / "tests/synthetic/original-card-setup.json"
    output = ROOT / "research/evidence/pc-res150-offensive-setup-runtime.json"
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    names = ("BattleConst", "BattleUtilServer", "BattleCmdServer")
    assets = {}
    hashes = {"comparison": sha(comparison_path), "noCardFixture": sha(no_card_path),
              "cardFixture": sha(card_path)}
    for name in names:
        path = module_dir / f"{name}.lua"
        rows = [row for row in comparison["combatModules"] if row["name"] == f"{name}.lua"]
        if len(rows) != 1 or len(rows[0].get("current") or []) != 1:
            raise ValueError(f"Unique current module hash required: {name}")
        if sha(path) != rows[0]["current"][0]["sha256"]:
            raise ValueError(f"Private current module does not match build comparison: {name}")
        assets[name] = {"output": str(path.relative_to(ROOT)).replace("\\", "/")}
        hashes[f"current{name}"] = sha(path)
    suites = [
        ("noCard", SetupOracle(assets), json.loads(no_card_path.read_text(encoding="utf-8"))["fixtures"]),
        ("card", CardSetupOracle(assets), json.loads(card_path.read_text(encoding="utf-8"))["fixtures"]),
    ]
    domains = {}
    mismatches = []
    for name, oracle, fixtures in suites:
        matches = 0
        for fixture in fixtures:
            actual = oracle.evaluate(fixture["input"])
            if actual == fixture["expected"]:
                matches += 1
            else:
                mismatches.append({"domain": name, "input": fixture["input"],
                                   "baseline": fixture["expected"], "current": actual})
        domains[name] = {"fixtures": len(fixtures), "exactMatches": matches,
                         "mismatches": len(fixtures) - matches}
    total = sum(row["fixtures"] for row in domains.values())
    matches = sum(row["exactMatches"] for row in domains.values())
    report = {
        "schemaVersion": 1, "kind": "MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON",
        "baselineBuild": "pc-res144-build51", "currentBuild": "pc-res150-build51",
        "method": "BattleCmdServer.__GetShowDamage through BattleUtilServer.ShowDamageFormula",
        "status": "EXACT_MATCH_IN_FIXTURE_DOMAIN" if matches == total else "BEHAVIOR_CHANGE_DETECTED",
        "sourceHashes": hashes, "fixtures": total, "exactMatches": matches,
        "mismatches": len(mismatches), "domains": domains, "results": mismatches,
        "scope": "Actual resource-150 PvE Awakener offensive-input assembly for inherited no-card and explicit non-Awake card domains, through both ShowDamageFormula return values.",
        "limitations": [
            "No Card_Awake path, PvP path, target selection, final target multipliers, HP or gameplay",
            "Properties, tags, instruction-card and state-trigger flags are explicit synthetic inputs",
        ],
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "fixtures": total, "exactMatches": matches,
                      "domains": domains, "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
