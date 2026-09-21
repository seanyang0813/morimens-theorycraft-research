"""Join public replay reports into a current-catalog retrospective consistency summary."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ATTRIBUTION = ROOT / "research/evidence/replay-catalog-build-attribution.json"
CURRENT_AUDIT = ROOT / "research/raw/resource150-replay-adapter-audit.json"
OUTPUT = ROOT / "research/evidence/current-catalog-gameplay-consistency.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    attribution = json.loads(ATTRIBUTION.read_text(encoding="utf-8"))
    current_audit = json.loads(CURRENT_AUDIT.read_text(encoding="utf-8"))
    audited = {row["observationId"]: row for row in current_audit}
    selected = []
    for catalog_row in attribution["replays"]:
        if catalog_row["classification"] != "PC_RES150_BUILD51_CATALOG_MATCH":
            continue
        audit_row = audited.get(catalog_row["observationId"])
        if not audit_row:
            continue
        if audit_row.get("calculationBuild") != "pc-res150-build51" or audit_row.get("recordedCombatBuild") is not None:
            raise ValueError("Current adapter audit build boundary is invalid")
        selected.append({
            "observationId": catalog_row["observationId"],
            "catalogClassification": catalog_row["classification"],
            "comparableCatalogRows": catalog_row["comparableRows"],
            "currentExclusiveCatalogRows": catalog_row["currentExclusiveRows"],
            "unmatchedCatalogRows": catalog_row["unmatchedRows"],
            "completeHitSnapshots": audit_row["completeHitSnapshots"],
            "retrospectiveActiveCandidates": audit_row["retrospectiveActiveCandidates"],
            "deterministicExactChecks": audit_row["deterministicExactChecks"],
            "deterministicMismatches": audit_row["deterministicMismatches"],
            "exactRngBranchConsistencyChecks": audit_row["exactRngBranchConsistencyChecks"],
            "rngBranchMismatches": audit_row["rngBranchMismatches"],
        })
    selected.sort(key=lambda row: row["observationId"])
    totals = {
        "auditedReplays": len(selected),
        "completeHitSnapshots": sum(row["completeHitSnapshots"] for row in selected),
        "retrospectiveActiveCandidates": sum(row["retrospectiveActiveCandidates"] for row in selected),
        "deterministicExactChecks": sum(row["deterministicExactChecks"] for row in selected),
        "deterministicMismatches": sum(row["deterministicMismatches"] for row in selected),
        "exactRngBranchConsistencyChecks": sum(row["exactRngBranchConsistencyChecks"] for row in selected),
        "rngBranchMismatches": sum(row["rngBranchMismatches"] for row in selected),
    }
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_CURRENT_CATALOG_GAMEPLAY_CONSISTENCY",
        "analysisTrack": "verification",
        "status": "RETROSPECTIVE_CURRENT_CATALOG_ENGINE_VERSION_UNCONFIRMED",
        "catalogBuild": "pc-res150-build51",
        "calculationBuild": "pc-res150-build51",
        "sourceHashes": {
            "replayCatalogBuildAttribution": sha(ATTRIBUTION),
            "privateResource150AdapterAudit": sha(CURRENT_AUDIT),
        },
        "method": "Recalculate every supported hit in exact resource-150 Cmd/Skill catalog matches through the bounded resource-150 replay adapter, using its current State classifier and cross-build-runtime-matched offense, utility, critical and final-target domains.",
        "totals": totals,
        "replays": selected,
        "publicationCredit": False,
        "privacy": "Only anonymous batch labels and aggregate counts from existing public reports are included.",
        "limitations": [
            "The replay catalog identifies data rows, not the engine bytecode version that executed the battle",
            "Every outcome was available before calculation; no prediction was frozen before reveal",
            "The matched cases are critical/noncritical branch consistency checks and do not reconstruct the original random draw",
            "The calculation path is resource 150, but the recordings' engine bytecode versions remain unconfirmed",
            "This report is verification-track retrospective regression evidence, not theorycraft output, cheese analysis or budget scouting",
            "No holdout or publication-gate credit",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "totals": totals, "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
