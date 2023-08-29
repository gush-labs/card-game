
export const Actions = {
  DAMAGE: "DAMAGE",
  EFFECT_ADDED: "EFFECT_ADDED",
  EFFECT_REMOVED: "EFFECT_REMOVED",
  CHANGE_OWNER: "CHANGE_OWNER",
  DAMAGE_BLOCKED: "DAMAGE_BLOCKED",
}

export class Action {

  constructor(props) {
    Object.assign(this, props);
  }

  static damage(target, source, damage) {
    return new Action({ 
      type: Actions.DAMAGE, target, source, damage })
  }

  static damageBlocked(target, source, damage) {
    return new Action({ type: Actions.DAMAGE_BLOCKED, target, source, damage });
  }

  static effectAdded(target, effectId) {
    return new Action({ type: Actions.EFFECT_ADDED, target, effectId });
  }

  static effectRemoved(target, effectId) {
    return new Action({ type: Actions.EFFECT_REMOVED, target, effectId });
  }

  static changeOwner(target) {
    return new Action({ type: Actions.CHANGE_OWNER, target });
  }
}