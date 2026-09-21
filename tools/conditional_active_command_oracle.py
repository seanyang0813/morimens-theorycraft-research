"""Execute the original condition closures used by commands 393 and 1363."""
import ctypes as C
import itertools
import json

from runtime_oracle import Oracle, ROOT


if __name__ == "__main__":
    oracle = Oracle(); state = oracle.state
    oracle.module("FuncTable"); oracle.setglobal(state, b"_conditional_active_functions")
    kind = oracle.lib.lua_type; kind.argtypes = [C.c_void_p, C.c_int]; kind.restype = C.c_int
    to_boolean = oracle.lib.lua_toboolean; to_boolean.argtypes = [C.c_void_p, C.c_int]; to_boolean.restype = C.c_int
    callbacks = []; calls = []

    def callback(function):
        wrapped = C.CFUNCTYPE(C.c_int, C.c_void_p)(function); callbacks.append(wrapped); return wrapped

    @callback
    def get_layer(inner):
        state_id = int(oracle.tonumber(inner, 1, None)); value = layers.get(state_id, 0)
        calls.append({"name": "CmdCaster.GetStateLayer", "args": [state_id], "value": value})
        oracle.number(inner, value); return 1

    @callback
    def get_potency(inner):
        calls.append({"name": "CmdCaster.GetPotencyLevel", "args": [], "value": potency})
        oracle.number(inner, potency); return 1

    commands = json.loads((ROOT / "research/extracted/config/Cmd.json").read_text(encoding="utf-8"))
    expressions = [
        commands["393"]["data_list"]["2"]["Cond"],
        commands["1363"]["data_list"]["1"]["Cond"],
        commands["1363"]["data_list"]["2"]["Cond"],
    ]
    fixtures = []
    for expression, potency, layer, last in itertools.product(expressions, [0, 14, 15, 20], [0, 1], [False, True]):
        layers = {55487: layer, 2799: layer}; calls = []
        oracle.top(state, 0); oracle.getglobal(state, b"_conditional_active_functions"); oracle.getfield(state, -1, expression.encode())
        if kind(state, -1) != 6: raise RuntimeError("Missing original condition: " + expression)
        oracle.table(state, 0, 3)
        oracle.table(state, 0, 2)
        oracle.pushclosure(state, get_layer, 0); oracle.setfield(state, -2, b"GetStateLayer")
        oracle.pushclosure(state, get_potency, 0); oracle.setfield(state, -2, b"GetPotencyLevel")
        oracle.setfield(state, -2, b"CmdCaster")
        oracle.number(state, 1 if last else 0); oracle.setfield(state, -2, b"LastConditionRet")
        oracle.check(oracle.call(state, 1, 1, 0, 0, None))
        if kind(state, -1) != 1: raise RuntimeError("Expected boolean condition result")
        fixtures.append({"input": {"expression": expression, "potencyLevel": potency, "stateLayer": layer, "lastConditionRet": last}, "expected": {"passed": bool(to_boolean(state, -1)), "calls": calls}})
    report = {
        "kind": "SYNTHETIC_ORIGINAL_RUNTIME",
        "build": "pc-res144-build51",
        "sourceHashes": {name: oracle.assets[name + ".lua"]["sha256"] for name in ("FuncTable", "Cmd")},
        "scope": "Original compiled conditions selected by commands 393 and 1363 over explicit potency, caster-state and prior-condition values with observed call order. No original CheckCondition mutation, effect execution, target selection or gameplay.",
        "fixtures": fixtures,
    }
    output = ROOT / "tests/synthetic/original-conditional-active-command.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("Generated", len(fixtures), "conditional Active-command cases")
