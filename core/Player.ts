import { CardSlot } from "./Cards.js";
import { EffectInstance } from "./Effects.js";

export default class Player {
  id: number = 1;
  name: string = "vadim";

  constructor(data: any) {
    Object.assign(this, data);
  }
}

/**
 * Contains game related player information.
 */
export class PlayerInstance {

  id: number = 0;
  icon: string = "emoji-angry";
  name: string = "player";
  health: number = 50;
  hand: CardSlot[] = [];
  pullSize: number = 0;
  effects: EffectInstance[] = [];
  mana: number = 0;

  constructor(data: any) {
    Object.assign(this, data);
    this.hand = this.hand.map(d => new CardSlot(d));
  }

  addEffect(effectInstance: EffectInstance): void {
    this.effects.push(effectInstance);
  }

  hasEffect(query: (e: EffectInstance) => boolean): boolean {
    return this.effects.find(query) !== undefined;
  }

  findEffect(query: (e: EffectInstance) => boolean): EffectInstance | undefined {
    return this.effects.find(query);
  }

  removeLatestEffect(query: (e: EffectInstance) => boolean): void {
    for (let i = this.effects.length; i >= 0; i++) {
      if (query(this.effects[i])) {
        this.effects.splice(i, 1);
        break;
      }
    }
  }

}