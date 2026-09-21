"""Build a privacy-preserving strategy summary from an indexed replay."""

RELEVANT_STATE_IDS = {133368, 126895, 134389, 70350}
BUILD_PROPERTY_KEYS = (
    "atk", "def", "max_hp", "occupation_master", "crit", "crit_damage",
    "damage_plus", "card_damage_per3_n2", "o_damage_per_strikecard",
)
ANALYSIS_TRACKS = (
    "budget-scouting", "cheese-analysis", "theorycrafting", "verification",
)

TRACK_CONTRACTS = {
    "budget-scouting": {
        "purpose": "Find low-investment clears for later investigation",
        "mayClaim": ["observed roster, investment signals and sequence for the selected stage/wave/difficulty"],
        "mustNotClaim": ["cheese mechanism", "simulated optimal build", "formula verification"],
        "crossTrackUse": "May nominate a separate cheese or theorycraft artifact; the new artifact needs its own evidence",
    },
    "cheese-analysis": {
        "purpose": "Explain an unusual observed result through a traceable mechanic or sequence",
        "mayClaim": ["observed sequence, state transitions and outcomes included in this artifact"],
        "mustNotClaim": ["optimal general build", "forward simulated result", "verified damage formula"],
        "crossTrackUse": "May create a mechanic hypothesis for a separate theorycraft artifact; it does not verify that hypothesis",
    },
    "theorycrafting": {
        "purpose": "Evaluate explicit builds and sequences with reconstructed rules",
        "mayClaim": ["model result within the supplied inputs and supported rule scope"],
        "mustNotClaim": ["observed cheese", "leaderboard prevalence", "independent gameplay verification"],
        "crossTrackUse": "May consume cited mechanics from other tracks; every unsupported branch and supplied input remains explicit",
    },
    "verification": {
        "purpose": "Test a frozen prediction against a separately revealed matching outcome",
        "mayClaim": ["agreement or disagreement within the frozen prediction contract"],
        "mustNotClaim": ["budget ranking", "cheese classification", "general optimality"],
        "crossTrackUse": "Only the frozen-prediction chronology can promote a modeled claim to verification evidence",
    },
}


def _skill_name(row):
    value = row.get("Name") if isinstance(row, dict) else None
    if not isinstance(value, str):
        return None
    return value.split("|", 1)[-1]


def _finite_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def build_strategy_summary(index, resources, *, analysis_track, label=None, stage=None,
                           wave=None, difficulty=None, include_outcomes=False):
    if analysis_track not in ANALYSIS_TRACKS:
        raise ValueError(f"Unsupported analysis track: {analysis_track}")
    skills = resources.get("Skill", {})
    actions = index.get("actionSnapshots") or []
    first = actions[0] if actions else {}

    roster = []
    for role in (first.get("roles") or {}).values():
        if role.get("camp") != 1 or role.get("roleType") != 1:
            continue
        props = role.get("properties") or {}
        roster.append({
            "awakenerId": role.get("tid"),
            "level": role.get("level"),
            "skillLevel": role.get("skillLevel"),
            "potencyLevel": role.get("potencyLevel"),
            "breakLevel": role.get("breakLevel"),
            "likeLevel": role.get("likeLevel"),
            "slotLevels": [slot.get("level") for slot in role.get("slots") or [] if _finite_number(slot.get("level"))],
            "properties": {key: props[key] for key in BUILD_PROPERTY_KEYS if _finite_number(props.get(key))},
        })
    roster.sort(key=lambda row: (row.get("awakenerId") is None, row.get("awakenerId") or 0))

    sequence = []
    for action in actions:
        cards = action.get("cards") or {}
        card = cards.get(str(action.get("cardUid"))) or {}
        roles = action.get("roles") or {}
        owner = roles.get(str(card.get("ownerUid"))) or {}
        player = next((row for row in roles.values() if row.get("roleType") == 3), {})
        player_props = player.get("properties") or {}
        owner_props = owner.get("properties") or {}
        skill_id = card.get("tid")
        skill = skills.get(str(skill_id), {})

        state_markers = []
        for state in action.get("activeStates") or []:
            state_id = state.get("stateId")
            if state_id not in RELEVANT_STATE_IDS:
                continue
            target_card = cards.get(str(state.get("roleUid"))) or {}
            state_markers.append({
                "stateId": state_id,
                "layer": state.get("layer"),
                "targetCardSkillId": target_card.get("tid"),
                "targetsPlayedCard": state.get("roleUid") == action.get("cardUid"),
            })

        hits = (action.get("window") or {}).get("hits") or []
        item = {
            "actionIndex": action.get("actionIndex"),
            "cardSkillId": skill_id,
            "skillName": _skill_name(skill),
            "cardTypes": skill.get("Type") if isinstance(skill, dict) else None,
            "printedCost": skill.get("Cost") if isinstance(skill, dict) else None,
            "ownerAwakenerId": owner.get("tid"),
            "hitCount": len(hits),
            "snapshotBoundaryStatus": action.get("boundaryStatus"),
            "mastery": {
                "base": player_props.get("occupation_master"),
                "final": player_props.get("occupation_master_final"),
                "finalPercent": player_props.get("occupation_master_final_per"),
            },
            "ownerDamageState": {
                key: owner_props.get(key)
                for key in ("card_damage_per3_n2", "basic_damage_per", "damage_plus", "o_damage_per_strikecard")
                if _finite_number(owner_props.get(key))
            },
            "relevantStateMarkers": state_markers,
        }
        if include_outcomes:
            damages = [hit.get("data", {}).get("beHitConfig", {}).get("castDamage") for hit in hits]
            damages = [value for value in damages if _finite_number(value)]
            item["observedOutcome"] = {"reportedHitCount": len(damages), "castDamageTotal": sum(damages)}
        sequence.append(item)

    counts = index.get("counts") or {}
    investment = {
        "characterLevelSum": sum(row.get("level") or 0 for row in roster),
        "highestCharacterLevel": max((row.get("level") or 0 for row in roster), default=0),
        "maxLevelCharacterCount": sum(row.get("level") == 90 for row in roster),
        "potencyLevelSum": sum(row.get("potencyLevel") or 0 for row in roster),
        "highestPotencyLevel": max((row.get("potencyLevel") or 0 for row in roster), default=0),
        "slotLevelSum": sum(sum(row.get("slotLevels") or []) for row in roster),
        "wheelEnhancement": None,
    }

    return {
        "schemaVersion": 2,
        "kind": "MORIMENS_PRIVATE_STRATEGY_SUMMARY",
        "privacy": "Player, replay, role-instance and card-instance identifiers removed",
        "analysisTrack": analysis_track,
        "claimBoundary": TRACK_CONTRACTS[analysis_track],
        "label": label,
        "stage": stage,
        "wave": wave,
        "difficulty": difficulty,
        "outcomesIncluded": bool(include_outcomes),
        "counts": {
            "records": counts.get("records", 0),
            "events": counts.get("events", len(index.get("events") or [])),
            "cardUses": counts.get("cardUses", len(index.get("cardUses") or [])),
            "hits": counts.get("hits", len(index.get("hits") or [])),
            "actions": len(actions),
            "unknownCommands": len(index.get("unknownCommands") or []),
            "unknownEvents": len(index.get("unknownEvents") or []),
        },
        "snapshotBoundaryStatus": index.get("snapshotBoundaryStatus"),
        "investmentSignals": investment,
        "roster": roster,
        "sequence": sequence,
        "limitations": [
            "The analysis track limits how this summary may be used; it does not establish another track's claim",
            "A wave summary does not prove state continuity from earlier waves",
            "Card and state IDs require the matching versioned catalog",
            "Outcome-free summaries support chronology but do not validate damage by themselves",
        ],
    }
