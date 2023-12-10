import { CardSlot } from "./Cards.js";

export default class Player {
  id = 1;
  name = "vadim";

  constructor(data) {
    Object.assign(this, data);
  }
}

/**
 * Contains game related player information.
 */
export class PlayerInstance {

  id = 0;
  icon = "emoji-angry";
  name = "player";
  health = 50;
  hand = [];
  pullSize = 0;
  effects = [];
  mana = 0;

  constructor(data) {
    Object.assign(this, data);
    this.hand = this.hand.map(d => new CardSlot(d));
  }

  addEffect(effectInstance) {
    this.effects.push(effectInstance);
  }

  // TODO: Remove this. It's useless.
  hasEffectById(effectId) {
    return this.effects.find(e => e.id === effectId) !== undefined;
  }

  hasEffect(query) {
    return this.effects.find(query) !== undefined;
  }

  findEffect(query) {
    return this.effects.find(query);
  }

  removeEffect(effectId) {
    this.effects.splice(effectId, 1);
  }

  // TODO: Also should be useless
  removeEffectById(effectId) {
    const id = this.effects.findIndex(e => e.id === effectId);
    if (id >= 0) this.effects.splice(id, 1);
  }
}