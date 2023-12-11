import { Action } from "./Actions.js";
import { EffectInstance, Effects } from "./Effects.js";
import Game from "./Game.js";
import { PlayerInstance } from "./Player.js";

export const CardType = {
  SPELL: "SPELL", // Can be placed on the desk
  ENCHANT: "ENCHANT", // Modifies cards on the desk
}

type CardActionContext = {
  game: Game,
  player: PlayerInstance,
  opponent: PlayerInstance,
  actions: any[], // TODO: Replace with the proper type
  slotId: number,
  targetSlotId: number,
}

type GetManaContext = {
  targetSlotId: number,
}

type EnchantApplyContext = {
  game: Game,
  targetSlotId: number,
}

type CardParameters = {
  id: string,
  icon: string,
  name: string
  description: string,
  type: string,
  damage?: number,
  hasManaCost: boolean,

  action: (context: CardActionContext) => void,
  getManaCost: (context?: GetManaContext) => number | undefined,
  canApplyEnchant: (context: EnchantApplyContext) => boolean,
};

export default class Card {
  id = "shield";
  icon = "shield-shaded";
  name = "";
  description = "";
  type = CardType.SPELL;
  hasManaCost: boolean = false;

  action: (context: CardActionContext) => void = () => {};
  getManaCost: (context?: GetManaContext) => number | undefined = () => undefined;
  canApplyEnchant: (context: EnchantApplyContext) => boolean = () => false;

  constructor(data: CardParameters & any) {
    Object.assign(this, data);
  }

  createInstance(props: any) {
    return new CardInstance({ id: this.id, ...props });
  }
}

function dealDamage(actions: any[], player: PlayerInstance, opponent: PlayerInstance, damage: number) {
  const hasShield = opponent.hasEffect(e => e.getEffect().hasTrait("shield"));
  if (hasShield) {
    actions.push(Action.damageBlocked(opponent.id, player.id, damage));
    return;
  };
  actions.push(Action.damage(opponent.id, player.id, damage));
  opponent.health -= damage;
}

export const Cards = {

  SHIELD: new Card({ 
    id: "SHIELD", 
    icon: "shield-shaded", 
    name: "Щит", 
    description: "Создает щит который блокирует весь последующий урон. Некоторые заклинания способны уничтожить данный щит.",
    type: CardType.SPELL,
    hasManaCost: false,

    action({ actions, player }: CardActionContext) {
      actions.push(Action.effectAdded(player.id, Effects.HAS_SHIELD.id))
      player.addEffect(Effects.HAS_SHIELD.createInstance());
    }
  }),

  ARROW: new Card({ 
    id: "ARROW", 
    icon: "heart-arrow", 
    name: "Магическая стрела", 
    description: "Наносит 3 урона сопернику.",
    type: CardType.SPELL,
    damage: 3,
    hasManaCost: false,

    action({ actions, player, opponent }: CardActionContext) {
      dealDamage( actions, player, opponent, this.damage!);
    }
   }),

  FIREBALL: new Card({ 
    id: "FIREBALL", 
    icon: "fire", 
    name: "Огненный шар", 
    description: "Уничтожает один щит соперника. Если щитов у соперника нет, то наносит 6 урона.",
    type: CardType.SPELL,
    damage: 6,
    hasManaCost: false,

    action({ actions, player, opponent }: CardActionContext) {
      const shieldQuery = (e: EffectInstance) => e.getEffect().hasTrait("shield");
      if (opponent.hasEffect(shieldQuery)) {
        opponent.removeLatestEffect(shieldQuery);
      } else {
        dealDamage(actions, player, opponent, this.damage!);
      }
    }
  }),

  REVERSE: new Card({ 
    id: "REVERSE", 
    icon: "arrow-down-up", 
    name: "Воровство заклинания", 
    description: "Ворует следующее заклинание если оно принадлежит сопернику." ,
    type: CardType.SPELL,
    hasManaCost: false,

    action(context: CardActionContext) {
      const { actions, game, slotId, player, opponent } = context;

      for (let i = slotId + 1; i < game.desk.length; i++) {
        const cardInstance = game.desk[i].getCard();
        if (!cardInstance) continue;

        if (cardInstance.owner === opponent.id) {
          cardInstance.owner = player.id;
          actions.push(Action.changeOwner(cardInstance));
          break;
        }
      }
    }
  }),

  REPEAT: new Card({
    id: "REPEAT",
    icon: "arrow-clockwise",
    name: "Магический повтор",
    description: "Повторяет предыдущее заклинание от вашего имени.", 
    type: CardType.SPELL,
    hasManaCost: false,

    action(context: CardActionContext) {
      const { game, slotId } = context;

      for (let i = slotId - 1; i >= 0; i++) {
        const cardInstance = game.desk[i].getCard();
        if (cardInstance) {
          cardInstance.getCard().action({ ...context, slotId: i })
          break;
        }
      }
    },
  }),

  ANCHOR: new Card({
    id: "ANCHOR",
    icon: "link-45deg",
    name: "Якорь",
    description: "Закрепляет выбранную вами карту. Данную карту не сможет перемещать как ваш соперник, так и вы.",
    type: CardType.ENCHANT,
    hasManaCost: true,

    canApplyEnchant({ game, targetSlotId }: EnchantApplyContext) {
      return game.desk[targetSlotId].getCard()?.pinned ?? false;
    },

    getManaCost(context: GetManaContext | undefined) {
      if (!context) return undefined;
      const { targetSlotId } = context;
      return targetSlotId > 2 ? 3 - (targetSlotId - 3) : targetSlotId + 1;
    },

    action({ game, player, actions, targetSlotId }: CardActionContext) {
      const cardInstance = game.desk[targetSlotId].getCard();
      if (cardInstance) {
        actions.push(Action.pinCard(player.id, cardInstance.getCard().id));
        cardInstance.pinned = true;
      }
    }
  }),

  HEAL: new Card({
    id: "HEAL",
    icon: "patch-plus",
    name: "Лечение",
    description: "Восстанавливает 9 здоровья. Требует одну ману.",
    type: CardType.SPELL,
    hasManaCost: true,

    getManaCost() {
      return 1;
    },

    action({ actions, player }: CardActionContext) {
      actions.push(Action.heal(player.id, 9));
      player.health += 9;
    }
  }),

  SAINT_SHIELD: new Card({
    id: "SAINT_SHIELD",
    icon: "shield-fill-plus",
    name: "Святой щит",
    description: "Создает щит который блокирует последующий урон. Если щит не был уничтожен, то он остается у вас даже после окончания хода. Некоторые заклинания способны уничтожить данный щит.",
    type: CardType.SPELL,
    hasManaCost: true,

    getManaCost() {
      return 1;
    },

    action(context: CardActionContext) {
      const { player, actions } = context;
      actions.push(Action.effectAdded(player.id, Effects.SAINT_SHIELD.id))
      player.addEffect(Effects.SAINT_SHIELD.createInstance());
    }
  }),

  CRATER: new Card({
    id: "CRATER",
    icon: "slash-circle-fill",
    name: "Кратер",
    description: "Запрещает использование выбранной вами ячейки. В ячейку, на которое было произведенно данное зачарование, нельзя будет положить карту.",
    type: CardType.ENCHANT,
    hasManaCost: true,

    getManaCost() {
      return 1;
    },

    action({ game, targetSlotId }: CardActionContext) {
      // TOOD(vadim): Write this
    }
  }),

  IMITATOR: new Card({
    id: "IMITATOR",
    icon: "arrow-repeat",
    name: "Имитатор",
    description: "Повторяет предыдущие два заклинания.",
    type: CardType.SPELL,
    hasManaCost: true,

    getManaCost() {
      return 3;
    },

    action(context: CardActionContext) {
      // implement
    }
  }),

  // Note: Don't use, this is a horrible card. It motivates your opponent to not play
  // any cards at all - which is fucking the entire point of PvP game.
  POISON: new Card({
    id: "POISON",
    icon: "droplet-half",
    name: "Отравление",
    description: "Накладывает на соперника отравление. Отравление будет отнимать 2 очка здоровья перед каждым зачитанным заклинанием в этом ходу.",
    type: CardType.SPELL,
    hasManaCost: true,

    getManaCost() {
      return 1;
    },

    action({}) {}
  }),

  // Note: Don't use. This game is about positioning of cards. It doesn't matter where this
  // card is, it behaves exactly the same way. BOOORIIING
  ORACLE: new Card({
    id: "ORACLE",
    icon: "eye",
    name: "Предзнаменование",
    description: "Повторяет последнее заклинание которое будет прочитано в этом раунде.",
    type: CardType.SPELL,
    hasManaCost: true,
    
    action({}) {}
  }),

  getCardById(cardId: string): Card {
    // Don't like that cast? Go cry about it.
    return (this as any)[cardId];
  },

  getCardByInstance(cardInstance: CardInstance): Card {
    return (this as any)[cardInstance.id];
  }

};

export const CardEffects = {
  PINNED: "PINNED",
}

export class CardInstance {
  id: string = "";
  owner: number | undefined = undefined;
  effects: any[] = [];
  pinned: boolean = false;

  constructor(data: any) {
    Object.assign(this, data);
  }

  hasEffect(effect: any) {
    return this.effects.find(v => v === effect) !== undefined;
  }

  addEffect(effect: any) {
    this.effects.push(effect);
  }

  getCard(): Card {
    return Cards.getCardByInstance(this);
  }
}

export class CardSlot {

  // TODO(vadim): Rename 'card' to 'cardInstance' otherwise
  // it is too much confusion
  card: CardInstance | undefined;
  
  constructor(data?: any) {
    Object.assign(this, data);
    if (this.card) this.card = new CardInstance(this.card);
  }

  hasCard() {
    return this.card !== undefined;
  }

  setCard(cardInstance: CardInstance) {
    this.card = cardInstance;
  }

  // TODO: Rename to "getCardInstance"
  getCard(): CardInstance | undefined {
    return this.card;
  }

  takeCard() {
    const card = this.card;
    this.card = undefined;
    return card;
  }
}
