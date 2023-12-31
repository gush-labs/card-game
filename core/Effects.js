
export class Effect {
  id = undefined;

  preAction = undefined;
  postAction = undefined;

  constructor(data) {
    Object.assign(this, data);
  }

  createInstance(props) {
    return new EffectInstance({ ...this, ...props });
  }

  hasTrait(trait) {
    return this.traits.find(t => t === trait) !== undefined;
  }

  isPersistant() {
    return this.persistant ?? false;
  }
}

export const Effects = {

  HAS_SHIELD: new Effect({ 
    id: "HAS_SHIELD", 
    traits: [ 'shield' ],
    name: "Щит" 
  }), 

  SAINT_SHIELD: new Effect({ 
    id: "SAINT_SHIELD", 
    name: "Святой щит", 
    traits: [ 'shield' ],
    persistant: true 
  }),

  getEffectByInstance(effectInstance) {
    return Effects[effectInstance.id];
  },

  getEffectById(effectId) {
    return Effects[effectId];
  }
}

export class EffectInstance {

  constructor({ id }) {
    this.id = id;
  }

  getEffect() {
    return Effects.getEffectById(this.id);
  }

}
