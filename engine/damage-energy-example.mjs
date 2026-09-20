// Synthetic context with command 2112; provenance in research/examples/damage-energy-command-provenance.json.
export function syntheticDamageEnergyExample(){return {
  "schemaVersion": 1,
  "kind": "morimens-damage-energy-command",
  "build": "pc-res144-build51",
  "otherEvents": "assumed-absent",
  "command": {
    "CnID": "\u6307\u4ee4@\u6253\u51fb",
    "data_list": {
      "1": {
        "BaseSortID": 582,
        "Para": "Arg1",
        "Type": "BEActiveDamage",
        "Target": "UpperTarget"
      },
      "2": {
        "Type": "BEGainUltiEnergy",
        "Para": "Arg2",
        "Target": "CmdCaster"
      }
    },
    "BaseSortID": 582,
    "ID": 2112
  },
  "variables": {
    "Arg1": 120,
    "Arg2": 10
  },
  "attackBase": {
    "offense": {
      "awakerOutsideDamagePer": 0,
      "awakerInsideBasicDamagePer": 0,
      "playerOutsideDamagePer": 0,
      "cardOutsideDmgPer": 0,
      "curCardDamagePer": 0,
      "cardDamagePlus": 0,
      "strength": 0,
      "ultiDamgePlus": 0,
      "strikecard_damage_plus": 0,
      "skillArgsPlus": 0,
      "awakerDamagePlus": 0,
      "skillTypeOutsideDmgPer": 1,
      "skillTypeDmgPer": 1,
      "roleEnhancePer": 0,
      "roleWeakPer": 0,
      "awakerInsideDamagePer": 0,
      "awakerInsideDamagePer1": 0,
      "awakerInsideDamagePer2": 0,
      "awakerInsideDamagePer3": 0,
      "awakerInsideDamagePer4": 0,
      "awakerInsideDamagePer5": 0,
      "awakerInsideDamagePer6": 0,
      "awakerInsideDamagePer7": 0,
      "awakerInsideDamagePer8": 0,
      "playerInsideDamagePer": 0,
      "dimension_fix_per": 0,
      "cardInsideDmgPer": 0,
      "cardDamagePer2": 0,
      "cardDamagePer3": 0,
      "card_damage_per3_n2": 0,
      "awaker_CmdCard_dmg_per": 0,
      "awaker_ulti_dmg_per": 0,
      "skillTypeInsideDmgPer": 1,
      "spellboundDmgPer": 0,
      "spellboundDmgPer2": 0,
      "spellboundDmgPer3": 0,
      "spellboundDmgPer4": 0,
      "spellboundDmgPer5": 0,
      "basicDamagePer": 0
    },
    "targetModifiers": {
      "isCrit": false,
      "awakerCritDamage": 0,
      "cardCritDamage": 0,
      "skillTypeCritDamage": 0,
      "awakerCardCritDamage": 0,
      "critDamagePer": 0,
      "beDamagePer4": 0,
      "beDamagePer5": 0,
      "enemyTypeDmgPer": 0,
      "enemyBuffDmgPer": 0,
      "enemyDebuffDmgPer": 0,
      "enemyBlockDmgPer": 0,
      "enemyBlockBarrierDmgPer": 0,
      "cardBlockBarrierPer": 0,
      "enemyStateDmgMultiplier": 1,
      "beDamagePlus": 0,
      "beDamagePer": 0,
      "beDamagePer2": 0,
      "beDamagePer3": 0,
      "vulnerablePer": 0
    },
    "repeatModifiers": {
      "plus": 0,
      "per": 0
    },
    "immune": false,
    "targetState": {
      "hp": 1000,
      "block": 0
    }
  },
  "energy": {
    "source": {
      "castRoleUid": 7,
      "cmdServerUid": 2,
      "skillConfigId": 3
    },
    "target": {
      "uid": 7,
      "role": "Awaker",
      "energy": 95,
      "maximumProperties": {
        "ulti_energy_max": 100,
        "ulti_energy_cost_per": 0,
        "ulti_energy_cost_flat": 0,
        "ulti_energy_max_per": 0
      },
      "calculation": {
        "dimension": 0,
        "properties": {
          "ulti_energy_per": 0,
          "i_ulti_energy_per": 0,
          "ulti_energy_efficiency": 0,
          "ulti_energy_plus": 0,
          "gain_ulti_energy_per": 0,
          "gain_ulti_energy_plus": 0
        },
        "card": null,
        "casterEligible": true,
        "skillTags": []
      }
    }
  }
};}
