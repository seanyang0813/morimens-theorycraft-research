"""Evaluate private Wheel StatePara expressions through the copied PC Lua runtime.

Detailed expressions and values stay under ignored observations. The public
report contains only source hashes, aggregate counts, and mismatch totals.
"""

from __future__ import annotations

import ctypes as C
import hashlib
import json
from pathlib import Path

from runtime_oracle import Oracle, ROOT


PRIVATE_CROSSWALK = ROOT / "research" / "observations" / "wheel-config-audit" / "crosswalk-audit.json"
PRIVATE_OUTPUT = ROOT / "research" / "observations" / "wheel-config-audit" / "refinement-runtime-fixtures.json"
PUBLIC_OUTPUT = ROOT / "research" / "evidence" / "wheel-refinement-runtime-audit.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def authored_value(expression: str, level: int) -> float:
    compact = expression.replace(" ", "")
    if "GetRefiningLevel()" not in compact:
        return float(compact)
    prefix, suffix = compact.split("+GetRefiningLevel()", 1)
    base = float(prefix)
    if suffix == "":
        slope = 1.0
    elif suffix.startswith("*"):
        slope = float(suffix[1:])
    else:
        raise ValueError(f"Unsupported refinement expression: {expression}")
    return base + level * slope


class WheelRefinementOracle(Oracle):
    def __init__(self) -> None:
        super().__init__()
        self.module("FuncTable")
        self.setglobal(self.state, b"_wheel_refinement_expressions")
        self.level = 0

        @C.CFUNCTYPE(C.c_int, C.c_void_p)
        def get_refining_level(state):
            self.number(state, self.level)
            return 1

        self.get_refining_level = get_refining_level

    def evaluate(self, expression: str, level: int) -> float:
        self.level = level
        state = self.state
        self.top(state, 0)
        self.getglobal(state, b"_wheel_refinement_expressions")
        self.getfield(state, -1, expression.encode())
        self.table(state, 0, 1)
        self.pushclosure(state, self.get_refining_level, 0)
        self.setfield(state, -2, b"GetRefiningLevel")
        self.check(self.call(state, 1, 1, 0, 0, None))
        return self.tonumber(state, -1, None)


def main() -> None:
    crosswalk = json.loads(PRIVATE_CROSSWALK.read_text(encoding="utf-8"))
    expressions = sorted(
        {
            str(expression)
            for row in crosswalk["rows"]
            if row["status"] == "UNIQUE"
            for expression in (row["candidates"][0].get("stateParameters") or {}).values()
        }
    )
    dynamic_expressions = [expression for expression in expressions if "GetRefiningLevel()" in expression]
    literal_expressions = [expression for expression in expressions if "GetRefiningLevel()" not in expression]
    oracle = WheelRefinementOracle()
    fixtures = []
    mismatches = []
    for expression in dynamic_expressions:
        for level in range(4):
            original = oracle.evaluate(expression, level)
            authored = authored_value(expression, level)
            fixture = {"expression": expression, "refinementLevel": level, "original": original, "authored": authored}
            fixtures.append(fixture)
            if original != authored:
                mismatches.append(fixture)
    private = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PRIVATE_WHEEL_REFINEMENT_RUNTIME_FIXTURES",
        "build": "pc-res144-build51",
        "sourceHash": oracle.assets["FuncTable.lua"]["sha256"],
        "crosswalkSha256": sha256(PRIVATE_CROSSWALK),
        "uniqueExpressions": len(expressions),
        "dynamicExpressions": len(dynamic_expressions),
        "literalExpressions": literal_expressions,
        "fixtures": fixtures,
        "mismatches": mismatches,
    }
    PRIVATE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PRIVATE_OUTPUT.write_text(json.dumps(private, indent=2) + "\n", encoding="utf-8")
    public = {
        "schemaVersion": 1,
        "kind": "MORIMENS_WHEEL_REFINEMENT_EXPRESSION_RUNTIME_AUDIT",
        "analysisTrack": "mechanics",
        "build": "pc-res144-build51",
        "status": "EXACT_MATCH_IN_FIXTURE_DOMAIN" if not mismatches else "MISMATCH",
        "source": {
            "module": "FuncTable.lua",
            "sha256": oracle.assets["FuncTable.lua"]["sha256"],
            "privateCrosswalkSha256": sha256(PRIVATE_CROSSWALK),
            "privateFixtureSha256": sha256(PRIVATE_OUTPUT),
        },
        "uniqueExpressions": len(expressions),
        "dynamicExpressionsComparedToOriginalRuntime": len(dynamic_expressions),
        "uniqueNumericLiterals": len(literal_expressions),
        "refinementLevels": [0, 1, 2, 3],
        "fixtures": len(fixtures),
        "mismatches": len(mismatches),
        "grammar": "numeric constant or base + GetRefiningLevel() * slope, with optional implicit slope 1",
        "limitations": [
            "The original-runtime comparisons cover dynamic refinement expressions at explicit levels 0 through 3; numeric literals are counted separately.",
            "It does not establish that a Wheel is equipped, its refinement level, state attachment, trigger execution, targets, stacking, gameplay agreement, or holdout credit.",
            "Detailed expressions and values remain private; the public report contains aggregate counts and source hashes only.",
            "This mechanics artifact makes no theorycraft recommendation, cheese or budget-scouting claim.",
        ],
    }
    PUBLIC_OUTPUT.write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(PUBLIC_OUTPUT.relative_to(ROOT)), "uniqueExpressions": len(expressions), "dynamicExpressions": len(dynamic_expressions), "fixtures": len(fixtures), "mismatches": len(mismatches)}, indent=2))


if __name__ == "__main__":
    main()
