import { OseDice } from "../dice.js";

export class OseActor extends Actor {
  /**
   * Extends data from base Actor class
   */

  prepareData() {
    super.prepareData();
    const data = this.system;

    // Compute modifiers from actor scores
    this.computeModifiers();
    this._isSlow();
    this.computeAC();
    this.computeEncumbrance();
    this.computeTreasure();

    // Determine Initiative
    if (game.settings.get("ose", "initiative") != "group") {
      data.initiative.value = data.initiative.mod;
      if (this.type == "character") {
        data.initiative.value += data.scores.dex.mod;
      }
    } else {
      data.initiative.value = 0;
    }
    data.movement.encounter = data.movement.base / 3;
  }
  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers
    /* -------------------------------------------- */
  getExperience(value, options = {}) {
    if (this.type != "character") {
      return;
    }
    let modified = Math.floor(
      value + (this.system.details.xp.bonus * value) / 100
    );
    return this.update({
      "system.details.xp.value": modified + this.system.details.xp.value,
    }).then(() => {
      const speaker = ChatMessage.getSpeaker({ actor: this });
      ChatMessage.create({
        content: game.i18n.format("OSE.messages.GetExperience", {
          name: this.name,
          value: modified,
        }),
        speaker,
      });
    });
  }

  isNew() {
    const data = this.system;
    if (this.type == "character") {
      let ct = 0;
      Object.values(data.scores).forEach((el) => {
        ct += el.value;
      });
      return ct == 0 ? true : false;
    } else if (this.type == "monster") {
      let ct = 0;
      Object.values(data.saves).forEach((el) => {
        ct += el.value;
      });
      return ct == 0 ? true : false;
    }
  }

  generateSave(hd) {
    let saves = {};
    for (let i = 0; i <= hd; i++) {
      let tmp = CONFIG.OSE.monster_saves[i];
      if (tmp) {
        saves = tmp;
      }
    }
    this.update({
      "system.saves": {
        death: {
          value: saves.d,
        },
        wand: {
          value: saves.w,
        },
        paralysis: {
          value: saves.p,
        },
        breath: {
          value: saves.b,
        },
        spell: {
          value: saves.s,
        },
      },
    });
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  rollHP(options = {}) {
    let roll = new Roll(this.system.hp.hd).roll();
    return this.update({
      "system.hp.max": roll.total,
      "system.hp.value": roll.total,
    });
  }

  rollSave(save, options = {}) {
    const label = game.i18n.localize(`OSE.saves.${save}.long`);
    const rollParts = ["1d20"];

    const data = {
      actor: this,
      roll: {
        type: "above",
        target: this.system.saves[save].value,
      },
      details: game.i18n.format("OSE.roll.details.save", { save: label }),
    };

    let skip = options.event && options.event.ctrlKey;

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("OSE.roll.save", { save: label }),
      title: game.i18n.format("OSE.roll.save", { save: label }),
    });
  }

  rollMorale(options = {}) {
    const rollParts = ["2d6"];

    const data = {
      actor: this,
      roll: {
        type: "below",
        target: this.system.details.morale,
      },
    };

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("OSE.roll.morale"),
      title: game.i18n.localize("OSE.roll.morale"),
    });
  }

  rollLoyalty(options = {}) {
    const label = game.i18n.localize(`OSE.roll.loyalty`);
    const rollParts = ["2d6"];

    const data = {
      actor: this,
      roll: {
        type: "below",
        target: this.system.retainer.loyalty,
      },
    };

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  rollReaction(options = {}) {
    const rollParts = ["2d6"];

    const data = {
      actor: this,
      roll: {
        type: "table",
        table: {
          2: game.i18n.format("OSE.reaction.Hostile", {
            name: this.name,
          }),
          3: game.i18n.format("OSE.reaction.Unfriendly", {
            name: this.name,
          }),
          6: game.i18n.format("OSE.reaction.Neutral", {
            name: this.name,
          }),
          9: game.i18n.format("OSE.reaction.Indifferent", {
            name: this.name,
          }),
          12: game.i18n.format("OSE.reaction.Friendly", {
            name: this.name,
          }),
        },
      },
    };

    let skip = options.event && options.event.ctrlKey;

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("OSE.reaction.check"),
      title: game.i18n.localize("OSE.reaction.check"),
    });
  }

  rollCheck(score, options = {}) {
    const label = game.i18n.localize(`OSE.scores.${score}.long`);
    const rollParts = ["1d20", this.system.details.level, this.system.scores[score].mod];

    const data = {
      actor: this,
      roll: {
        type: "check",
        target: this.system.scores[score].value,
      },

      details: game.i18n.format("OSE.roll.details.attribute", {
        score: label,
      }),
    };

    let skip = options.event && options.event.ctrlKey;

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("OSE.roll.attribute", { attribute: label }),
      title: game.i18n.format("OSE.roll.attribute", { attribute: label }),
    });
  }

  rollHitDice(options = {}) {
    const label = game.i18n.localize(`OSE.roll.hd`);
    const rollParts = [this.system.hp.hd];
    if (this.type == "character") {
      rollParts.push(this.system.scores.con.mod);
    }

    const data = {
      actor: this,
      roll: {
        type: "hitdice",
      },
    };

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  rollAppearing(options = {}) {
    const rollParts = [];
    let label = "";
    if (options.check == "wilderness") {
      rollParts.push(this.system.details.appearing.w);
      label = "(2)";
    } else {
      rollParts.push(this.system.details.appearing.d);
      label = "(1)";
    }
    const data = {
      actor: this,
      roll: {
        type: {
          type: "appearing",
        },
      },
    };

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("OSE.roll.appearing", { type: label }),
      title: game.i18n.format("OSE.roll.appearing", { type: label }),
    });
  }

  rollExploration(expl, options = {}) {
    const label = game.i18n.localize(`OSE.exploration.${expl}.long`);
    const rollParts = ["1d6"];

    const data = {
      actor: this,
      roll: {
        type: "below",
        target: this.system.exploration[expl],
      },
      details: game.i18n.format("OSE.roll.details.exploration", {
        expl: label,
      }),
    };

    let skip = options.event && options.event.ctrlKey;

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("OSE.roll.exploration", { exploration: label }),
      title: game.i18n.format("OSE.roll.exploration", { exploration: label }),
    });
  }

  rollDamage(attData, options = {}) {
    const data = this.system;

    const rollData = {
      actor: this,
      item: attData.item,
      roll: {
        type: "damage",
      },
    };

    let dmgParts = [];
    if (!attData.roll.dmg) {
      dmgParts.push("1d6");
    } else {
      dmgParts.push(attData.roll.dmg);
    }

    // Add Str to damage
    if (attData.roll.type == "melee") {
      dmgParts.push(data.scores.str.mod);
    }

    // Damage roll
    OseDice.Roll({
      event: options.event,
      parts: dmgParts,
      data: rollData,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${attData.label} - ${game.i18n.localize("OSE.Damage")}`,
      title: `${attData.label} - ${game.i18n.localize("OSE.Damage")}`,
    });
  }

  async targetAttack(data, type, options) {
    if (game.user.targets.size > 0) {
      for (let t of game.user.targets.values()) {
        data.roll.target = t;
        await this.rollAttack(data, {
          type: type,
          skipDialog: options.skipDialog,
        });
      }
    } else {
      this.rollAttack(data, { type: type, skipDialog: options.skipDialog });
    }
  }

  rollAttack(attData, options = {}) {
    const data = this.system;
    const rollParts = ["1d20"];
    const dmgParts = [];
    let label = game.i18n.format("OSE.roll.attacks", {
      name: this.name,
    });
    if (!attData.item) {
      dmgParts.push("1d6");
    } else {
      label = game.i18n.format("OSE.roll.attacksWith", {
        name: attData.item.name,
      });
      dmgParts.push(attData.item.system.damage);
    }

    let ascending = game.settings.get("ose", "ascendingAC");
    if (ascending) {
      rollParts.push(data.thac0.bba.toString());
    }
    if (options.type == "missile") {
      rollParts.push(
        data.scores.dex.mod.toString(),
        data.thac0.mod.missile.toString()
      );
    } else if (options.type == "melee") {
      rollParts.push(
        data.scores.str.mod.toString(),
        data.thac0.mod.melee.toString()
      );
      dmgParts.push(
        data.scores.str.mod.toString(),
      );
    }
    if (attData.item && attData.item.system.bonus) {
      rollParts.push(attData.item.system.bonus);
    }
    let thac0 = data.thac0.value;
    if (options.type == "melee") {
      ;
    }
    const rollData = {
      actor: this,
      item: attData.item,
      roll: {
        type: options.type,
        thac0: thac0,
        dmg: dmgParts,
        save: attData.roll.save,
        target: attData.roll.target,
      },
    };

    // Roll and return
    return OseDice.Roll({
      event: options.event,
      parts: rollParts,
      data: rollData,
      skipDialog: options.skipDialog,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  async applyDamage(amount = 0, multiplier = 1) {
    amount = Math.floor(parseInt(amount) * multiplier);
    const hp = this.system.hp;

    // Remaining goes to health
    const dh = Math.clamped(hp.value - amount, 0, hp.max);

    // Update the Actor
    return this.update({
      "system.hp.value": dh,
    });
  }

  static _valueFromTable(table, val) {
    let output;
    for (let i = 0; i <= val; i++) {
      if (table[i] != undefined) {
        output = table[i];
      }
    }
    return output;
  }

  _isSlow() {
    this.system.isSlow = false;
    if (this.type != "character") {
      return;
    }
    this.items.forEach((item) => {
      if (item.type == "weapon" && item.system.slow && item.system.equipped) {
        this.system.isSlow = true;
        return;
      }
    });
  }

  computeEncumbrance() {
    if (this.type != "character") {
      return;
    }
    const data = this.system;
    let option = game.settings.get("ose", "encumbranceOption");

    // Compute encumbrance
    let totalWeight = 0;
    let hasItems = false;
    this.items.forEach((item) => {
      if (item.type == "item" && !item.system.treasure) {
        hasItems = true;
      }
      if (
        item.type == "item" &&
        (["complete", "disabled"].includes(option) || item.system.treasure)
      ) {
        totalWeight += item.system.quantity.value * item.system.weight;
      } else if (option != "basic" && ["weapon", "armor"].includes(item.type)) {
        totalWeight += item.system.weight;
      }
    });
    if (option === "detailed" && hasItems) totalWeight += 80;

    data.encumbrance = {
      pct: Math.clamped(
        (100 * parseFloat(totalWeight)) / data.encumbrance.max,
        0,
        100
      ),
      max: data.encumbrance.max,
      encumbered: totalWeight > data.encumbrance.max,
      value: totalWeight,
    };

    if (data.config.movementAuto && option != "disabled") {
      this._calculateMovement();
    }
  }

  _calculateMovement() {
    const data = this.system;
    let option = game.settings.get("ose", "encumbranceOption");
    let weight = data.encumbrance.value;
    let delta = data.encumbrance.max - 1600;
    if (["detailed", "complete"].includes(option)) {
      if (weight > data.encumbrance.max) {
        data.movement.base = 0;
      } else if (weight > 800 + delta) {
        data.movement.base = 30;
      } else if (weight > 600 + delta) {
        data.movement.base = 60;
      } else if (weight > 400 + delta) {
        data.movement.base = 90;
      } else {
        data.movement.base = 120;
      }
    } else if (option == "basic") {
      const armors = this.items.filter((i) => i.type == "armor");
      let heaviest = 0;
      armors.forEach((a) => {
        if (a.system.equipped) {
          if (a.system.type == "light" && heaviest == 0) {
            heaviest = 1;
          } else if (a.system.type == "heavy") {
            heaviest = 2;
          }
        }
      });
      switch (heaviest) {
        case 0:
          data.movement.base = 120;
          break;
        case 1:
          data.movement.base = 90;
          break;
        case 2:
          data.movement.base = 60;
          break;
      }
      if (weight > game.settings.get("ose", "significantTreasure")) {
        data.movement.base -= 30;
      }
    }
  }

  computeTreasure() {
    if (this.type != "character") {
      return;
    }
    const data = this.system;
    // Compute treasure
    let total = 0;
    let treasure = this.items.filter(
      (i) => i.type == "item" && i.system.treasure
    );
    treasure.forEach((item) => {
      total += item.system.quantity.value * item.system.cost;
    });
    data.treasure = total;
  }

  computeAC() {
    if (this.type != "character") {
      return;
    }
    // Compute AC
    let baseAc = 10;
    let baseAac = 10;
    let AcShield = 0;
    let AacShield = 0;
    const data = this.system;
    data.aac.naked = baseAac + data.scores.dex.mod;
    data.ac.naked = baseAc - data.scores.dex.mod;
    const armors = this.items.filter((i) => i.type == "armor");
    armors.forEach((a) => {
      if (a.system.equipped && a.system.type != "shield") {
        baseAc = a.system.ac.value;
        baseAac = a.system.aac.value;
      } else if (a.system.equipped && a.system.type == "shield") {
        AcShield = a.system.ac.value;
        AacShield = a.system.aac.value;
      }
    });
    data.aac.value = baseAac + data.scores.dex.mod + AacShield + data.aac.mod;
    data.ac.value = baseAc - data.scores.dex.mod - AcShield - data.ac.mod;
    data.ac.shield = AcShield;
    data.aac.shield = AacShield;
  }

  computeModifiers() {
    if (this.type != "character") {
      return;
    }
    const data = this.system;

    const standard = {
      0: -3,
      3: -3,
      4: -2,
      6: -1,
      9: 0,
      13: 1,
      16: 2,
      18: 3,
    };
    data.scores.str.mod = OseActor._valueFromTable(
      standard,
      data.scores.str.value
    );
    data.scores.int.mod = OseActor._valueFromTable(
      standard,
      data.scores.int.value
    );
    data.scores.dex.mod = OseActor._valueFromTable(
      standard,
      data.scores.dex.value
    );
    data.scores.cha.mod = OseActor._valueFromTable(
      standard,
      data.scores.cha.value
    );
    data.scores.wis.mod = OseActor._valueFromTable(
      standard,
      data.scores.wis.value
    );
    data.scores.con.mod = OseActor._valueFromTable(
      standard,
      data.scores.con.value
    );

    const capped = {
      0: -2,
      3: -2,
      4: -1,
      6: -1,
      9: 0,
      13: 1,
      16: 1,
      18: 2,
    };
    data.scores.dex.init = OseActor._valueFromTable(
      capped,
      data.scores.dex.value
    );
    data.scores.cha.npc = OseActor._valueFromTable(
      capped,
      data.scores.cha.value
    );
    data.scores.cha.retain = data.scores.cha.mod + 4;
    data.scores.cha.loyalty = data.scores.cha.mod + 7;

    const od = {
      0: 0,
      3: 1,
      9: 2,
      13: 3,
      16: 4,
      18: 5,
    };
    data.exploration.odMod = OseActor._valueFromTable(
      od,
      data.scores.str.value
    );

    const literacy = {
      0: "",
      3: "OSE.Illiterate",
      6: "OSE.LiteracyBasic",
      9: "OSE.Literate",
    };
    data.languages.literacy = OseActor._valueFromTable(
      literacy,
      data.scores.int.value
    );

    const spoken = {
      0: "OSE.NativeBroken",
      3: "OSE.Native",
      13: "OSE.NativePlus1",
      16: "OSE.NativePlus2",
      18: "OSE.NativePlus3",
    };
    data.languages.spoken = OseActor._valueFromTable(
      spoken,
      data.scores.int.value
    );
  }
}
