// TODO: Remove usage of unsafe
import { cast } from "./utils/Unsafe"

import { PlayerInstance } from "./Player";
import { CardInstance, CardSlot, CardType, Cards } from "./Cards.js";
import { v4 as uuid } from "uuid";
import CardDeck from "./utils/CardDeck";

export const GameState = {
  PLAYER_TURN: "PLAYER_TURN",
  EXECUTION_TURN: "EXECUTION_TURN",
  WAITING_FOR_PLAYERS: "WAITING_FOR_PLAYERS",
  COMPLETE: "COMPLETE",
}

export class TurnState {
  playerId: number | undefined = undefined;
  turns: number = 0;
  slotId: number = 0;
}

// Export - just for the test
export const cardsConfiguration = { amount: 36, nodes: [
    { w: 5/6, name: "Non mana cards", group: [
      { w: 1, name: "Damage cards", group: [
        { w: 1, v: Cards.ARROW.id },
        { w: 1, v: Cards.FIREBALL.id },
        { w: 1, v: Cards.REPEAT.id },
      ]},
      { w: 1, name: "Non damage cards", group: [
        { w: 1, v: Cards.SHIELD.id },
        { w: 1, v: Cards.REVERSE.id },
      ]},
    ]},
    // It was 1/6 (more balanced)
    { w: 2/6, name: "Mana cards", group: [
      { w: 5/6, name: "1 mana cards", group: [
        { w: 1, v: Cards.HEAL.id },
        { w: 1, v: Cards.ANCHOR.id },       // TODO: TEST IT
        // { w: 1, v: Cards.CRATER.id },    // TODO: TEST IT
        { w: 1, v: Cards.SAINT_SHIELD.id }, // TODO: TEST IT
      ]},
      { w: 1/6, name: "3 mana cards", group: [
        { w: 1, v: Cards.IMITATOR.id }
      ]},
    ]},
  ]};


/**
 * Describes the state of the game.
 */
export default class Game {

  id = undefined;
  turn = new TurnState();
  state = GameState.WAITING_FOR_PLAYERS;
  desk: CardSlot[] = [ new CardSlot(), new CardSlot(), new CardSlot(), new CardSlot(), new CardSlot(), new CardSlot() ];
  players: PlayerInstance[] = [];
  decks: any = {};
  actions: any[] = [];

  /**
   * Constructs a game with provided data
   */
  constructor(data: any) {
    Object.assign(this, data);
    for (const playerId in this.decks) {
      this.decks[playerId] = new CardDeck(this.decks[playerId]);
    }
    this.desk = this.desk.map(d => new CardSlot(d));
    this.players = this.players.map(d => new PlayerInstance(d));
  }

  /**
   * Creates a new player for this particular game with a defined playerId
   * and some player properties (character, picked cards, etc.).
   * @returns PlayerInstance added to the game
   */
  addPlayer(playerId: number, properties: any) {
    console.log("GM -> Player added");

    const player = new PlayerInstance({ id: playerId, mana: 0, ...properties });
    this.players.push(player);

    // Create deck for this particular player
    this.decks[playerId] = new CardDeck(cardsConfiguration);

    // Add 6 card slots to the player hand
    for (let i = 0; i < 6; i++) {
      player.hand.push(new CardSlot());
      this.pullCard(playerId, false);
    }

    if (this.players.length === 2) 
      this.completeTurn(undefined);
    
    if (!this.turn.playerId) 
      this.turn.playerId = player.id;

    return player;
  }

  hasPlayer(playerId: number) {
    return this.getPlayer(playerId) !== undefined;
  }

  isPlayerTurn(playerId: number) {
    return this.state === GameState.PLAYER_TURN && this.turn.playerId === playerId;
  }

  canMoveCardFromHandToDesk(playerId: number, fromSlotId: number, toSlotId: number) {
    if (!this.isPlayerTurn(playerId)) return false;

    const player = this.getPlayer(playerId);
    if (!player) return false;

    const cardInstance = player.hand[fromSlotId].getCard();
    if (!cardInstance) return false;

    const slotAvailable = !this.desk[toSlotId].hasCard();
    const playerDeskCards = this.getPlayerDeskCardsCount(playerId);

    // Enchants only put effects on cards which are already on the desk
    if (cardInstance.getCard().type === CardType.ENCHANT) {
      return false;
    }

    const canPlaceCard = cardInstance && slotAvailable && playerDeskCards < 3;

    // If the card has a mana cost, verify that the player has
    // enough mana to pay for it
    const card = Cards.getCardByInstance(cardInstance);
    if (canPlaceCard && card.hasManaCost) {
      const manaCost = card.getManaCost();
      return manaCost !== undefined ? player.mana >= manaCost : false; 
    }

    return canPlaceCard;
  }

  moveCardFromHandToDesk(playerId: number, fromSlotId: number, toSlotId: number) {
    if (!this.canMoveCardFromHandToDesk(playerId, fromSlotId, toSlotId)) {
      return;
    }

    const player = this.getPlayer(playerId);
    if (!player) return;

    // Move card
    const cardInstance = player.hand[fromSlotId].takeCard();
    this.desk[toSlotId].setCard(cardInstance!);

    // Pay the cost if it has it
    const card = Cards.getCardByInstance(cardInstance!);

    if (card.hasManaCost) {
      const manaCost = card.getManaCost()!;
      player.mana -= manaCost;
    }
  }

  canMoveCardFromDeskToHand(playerId: number, fromSlotId: number, toSlotId: number) {
    if (!this.isPlayerTurn(playerId)) return false;

    const player = this.getPlayer(playerId);
    if (!player) return false;

    const cardInstance = this.desk[fromSlotId].getCard();

    if (cardInstance) {
      const slotAvailable = !player.hand[toSlotId].hasCard();
      const ownsCard = cardInstance.owner === playerId;

      // We can't bring back the pinned card from the desk
      if (cardInstance.pinned) return false;

      return slotAvailable && ownsCard;
    }
    return false;
  }

  moveCardFromDeskToHand(playerId: number, fromSlotId: number, toSlotId: number) {
    if (!this.canMoveCardFromDeskToHand(playerId, fromSlotId, toSlotId)) {
      return;
    }

    const player = this.getPlayer(playerId);
    if (!player) return;

    // Move the card
    const cardInstance = this.desk[fromSlotId].takeCard();
    player.hand[toSlotId].setCard(cardInstance!);

    // Spent mana should be returned back to the player
    const card = Cards.getCardByInstance(cardInstance!);
    if (card.hasManaCost) {
      const manaCost = card.getManaCost()!;
      player.mana += manaCost;
    }
  }

  canMoveCardFromDeskToDesk(playerId: number, fromSlotId: number, toSlotId: number) {
    if (!this.isPlayerTurn(playerId)) return false;

    const cardInstance = this.desk[fromSlotId].getCard();
    if (cardInstance && !this.desk[toSlotId].hasCard()) {

      // There is no way to move the pinned card
      if (cardInstance.pinned) return false;

      if (cardInstance.owner === playerId) {
        // Players can move their cards anywhere they want
        return true;
      } else {
        // Opponent cards can be moved only to specific places
        // The player should not be able to rearange cards of the opponent.

        // Idea is to go through every card left or right on the desk
        // If player is trying to place opponents cards in the way that it will
        // change their order - this function will return false preventing player
        // from doing that
        const direction = toSlotId - fromSlotId > 0 ? 1 : -1;
        for (let i = fromSlotId + direction; i >= 0 && i < this.desk.length; i += direction) {

          const cardInstance = this.desk[i].getCard();
          // Aha! You've tried to move opponents card to far!
          if (cardInstance && cardInstance.owner !== playerId) break;
          if (i === toSlotId) return true;
        }
      }
    }

    return false;
  }

  moveCardFromDeskToDesk(playerId: number, fromSlotId: number, toSlotId: number) {
    if (!this.canMoveCardFromDeskToDesk(playerId, fromSlotId, toSlotId)) {
      return;
    }
    this.desk[toSlotId].setCard(this.desk[fromSlotId].takeCard()!);
  }

  canMoveCardFromHandToHand(playerId: number, fromSlotId: number, toSlotId: number) {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    return player.hand[fromSlotId].hasCard() && !player.hand[toSlotId].hasCard();
  }

  moveCardFromHandToHand(playerId: number, fromSlotId: number, toSlotId: number) {
    if (!this.canMoveCardFromHandToHand(playerId, fromSlotId, toSlotId)) {
      return;
    }

    const player = this.getPlayer(playerId);
    if (!player) return;

    player.hand[toSlotId].setCard(player.hand[fromSlotId].takeCard()!);
  }

  isWinner(playerId: number): boolean {
    const minHealth = this.players
      .map(p => p.health)
      .reduce((l, r) => Math.min(l, r))

    const player = this.getPlayer(playerId);
    if (!player) return false;
    return player.health > minHealth && player.health > 0;
  }

  /**
   * Get the player by playerId
   */
  getPlayer(playerId: number): PlayerInstance | undefined {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Get the only opponent by the current playerId
   * @param {number} playerId 
   * @returns 
   */
  getOpponent(playerId: number) {
    return this.players.find(p => p.id !== playerId);
  }

  canUseEnchant(playerId: number, slotId: number): boolean {
    if (!this.isPlayerTurn(playerId)) return false;
    const player = this.getPlayer(playerId);
    if (!player) return false;

    if (!player.hand[slotId].hasCard()) return false;
    return true;
  }

  canUseEnchantOn(playerId: number, slotId: number, targetSlotId: number) {
    if (!this.canUseEnchant(playerId, slotId)) return false;

    const player = this.getPlayer(playerId);
    if (!player) return false;

    const cardInstance = player.hand[slotId].getCard();

    if (cardInstance && this.desk[targetSlotId].hasCard()) {
      const manaCost = this.getEnchantManaCostFor(playerId, slotId, targetSlotId);
      if (manaCost === undefined) return undefined;

      const enchant = cardInstance.getCard();
      return player.mana >= manaCost && enchant.canApplyEnchant({ game: this, targetSlotId });
    }
    return false;
  }

  getEnchantManaCostFor(playerId: number, slotId: number, targetSlotId: number): number | undefined {
    const player = this.getPlayer(playerId);
    if (!player) return undefined;

    const cardInstance = player.hand[slotId].getCard();
    if (!cardInstance) return undefined;
    
    const card = cardInstance.getCard();
    if (!card.hasManaCost) return undefined;

    return card.getManaCost({ targetSlotId });
  }

  useEnchant(playerId: number, slotId: number, targetSlotId: number) {
    if (!this.canUseEnchantOn(playerId, slotId, targetSlotId)) return;

    const player = this.getPlayer(playerId);
    if (!player) return;

    const opponent = this.getPlayer(playerId);
    if (!opponent) return;

    const cardInstance = player.hand[slotId].getCard();
    if (!cardInstance) return;

    const manaCost = this.getEnchantManaCostFor(playerId, slotId, targetSlotId);
    if (!manaCost) return;

    player.mana -= manaCost;

    this.actions = [];
    cardInstance.getCard().action({ game: this, actions: this.actions, slotId, player, opponent, targetSlotId });
    player.hand[slotId].takeCard();
  }

  getPlayerCardsCount(playerId: number): number {
    const player = this.getPlayer(playerId);
    if (!player) return 0;

    const cardsOnDesk = this.desk.filter(cardSlot => cast<CardInstance>(cardSlot.getCard())?.owner === playerId).length;
    const cardsOnHand = player.hand.filter(cardSlot => cardSlot.hasCard()).length;
    return cardsOnDesk + cardsOnHand; 
  }

  getPlayerDeskCardsCount(playerId: number): number {
    return this.desk.filter(cardSlot => cast<CardInstance>(cardSlot.getCard())?.owner === playerId).length;
  }

  getPlayerHandCardsCount(playerId: number): number {
    const player = this.getPlayer(playerId);
    if (!player) return 0;
    return player.hand.filter(cardSlot => cardSlot.hasCard()).length;
  }

  getNextDeskCard(slotId: number): [CardInstance | undefined, number | undefined] {
    for (let i = slotId + 1; i < this.desk.length; i++) {
      if (this.desk[i].hasCard()) return [ this.desk[i].getCard(), i ];
    }
    return [ undefined, undefined ];
  }

  getPrevDeskCard(slotId: number) {
    for (let i = slotId - 1; i >= 0; i--) {
      if (this.desk[i].hasCard()) return [ this.desk[i].getCard(), i ];
    }
    return [ undefined, undefined ];
  }

  getLastDeskCard() {
    for (let i = this.desk.length - 1; i >= 0; i--) {
      if (this.desk[i].hasCard()) return [ this.desk[i].getCard(), i];
    }
    return [ undefined, undefined ];
  }

  isCardSlotExecuted(slotId: number) {
    return this.state === GameState.EXECUTION_TURN && this.turn.slotId === slotId;
  }

  canPullCard(playerId: number) {
    const player = this.getPlayer(playerId);
    if (player) {
      const playersTurn = this.state === GameState.PLAYER_TURN;
      const notEnoughCards = this.getPlayerCardsCount(playerId) < 6;
      return playersTurn && notEnoughCards;
    }
    return false;
  }

  /**
   * Pulls the card for a specific player from his deck
   */
  pullCard(playerId: number, performValidation = true) {
    if (!this.canPullCard(playerId) && performValidation) return;

    const player = this.getPlayer(playerId);
    if (!player) return;

    const availableSlotId = player.hand.findIndex(cardSlot => !cardSlot.hasCard());
    if (availableSlotId >= 0) {
      const card = Cards.getCardById(this.decks[playerId].pick());
      player.hand[availableSlotId].setCard(card.createInstance({ owner: player.id }));
    }
  }

  /**
   * Give mana to the player
   * @param {number} playerId 
   */
  giveMana(playerId: number) {
    const player = this.getPlayer(playerId);
    if (!player) return;

    player.mana = Math.min(player.mana + 1, 3);
  }

  clearDesk() {
    this.desk = this.desk.map(s => new CardSlot());
  }

  /**
   * Completes the current turn. Can be done by a certain player
   * or without any player at all.
   * @param {number} playerId - id of the current player
   * @returns 
   */
  completeTurn(playerId: number | undefined) {
    // TODO(vadim): this code will probably fail if "playerId == 0"
    if (playerId && !this.isPlayerTurn(playerId)) return;

    // We can't do anything until all players are in the game
    if (this.players.length < 2) return;

    if (this.state === GameState.WAITING_FOR_PLAYERS) {
      // If the game has started
      // Select the first player for the first turn

      // TODO(vadim): Pick a random one for that
      this.turn.playerId = this.players[0].id;
      this.giveMana(this.turn.playerId);
      this.state = GameState.PLAYER_TURN;
      this.turn.turns += 1;

    } else if (this.state === GameState.PLAYER_TURN) {

      if (this.turn.turns >= 2) {
        // If it has beed 2 turns, meaning both players made their turns
        // At this point, we should start the "execution turn".
        this.state = GameState.EXECUTION_TURN;
        // Select the first card for execution
        const [ card, slotId ] = this.getNextDeskCard(-1);
        this.turn.slotId = slotId ?? this.desk.length;
        this.turn.turns = 0;

      } else {
        // If one player has made their turn, we should select the opponent
        // fot the next turn.
        this.turn.playerId = this.getOpponent(this.turn.playerId!)!.id;
        this.turn.turns += 1;
      }

    } else if (this.state === GameState.EXECUTION_TURN) {

      const deadPlayer = this.players.find(p => p.health <= 0);
      if (deadPlayer) {
        this.completeGame();
      } else {
        // if the "execution turn" is complete
        // we will use the same player for the first turn (the last value of this.turn.playerId)
        this.state = GameState.PLAYER_TURN;
        this.clearDesk();

        this.players.forEach(p => {
          p.effects = p.effects.filter(e => e.getEffect().isPersistant());
        });

        this.turn.turns += 1;
        this.giveMana(this.turn.playerId!);
      }
    }

    console.log(`GM -> next turn: ${ this.state }`);
  }

  completeGame() {
    console.log("GM -> game complete");
    this.state = GameState.COMPLETE;
  }

  performExecutionTurn() {
    this.actions = [];
    const actions = this.actions;

    if (this.state === GameState.EXECUTION_TURN) {
      console.log(`GM -> perform execution turn`);

      if (this.turn.slotId >= this.desk.length) {
        this.completeTurn(undefined);
        return;
      }

      // Perform action for the current card
      const cardSlot = this.desk[this.turn.slotId];
      if (cardSlot.hasCard()) {
        const cardInstance = cast<CardInstance>(cardSlot.getCard());
        const card = Cards.getCardByInstance(cardInstance);
        const player = this.getPlayer(cast<number>(cardInstance.owner));
        const opponent = this.getOpponent(cast<number>(cardInstance.owner));
        const slotId = this.turn.slotId;
        
        // Perform "pre-action" for the effects on the player
        this.players.forEach(p => {
          p.effects
            .map(e => e.getEffect().preAction)
            .filter(a => a !== undefined)
            .forEach(a => a(actions, this, slotId, player, opponent));
        })

        const context = { actions, game: this, slotId, targetSlotId: 0, 
          player: player!, opponent: opponent!, cardInstance };
        card.action(context);

        // Perform "post-action" for the effects on the player
        this.players.forEach(p => {
          p.effects
            .map(e => e.getEffect().postAction)
            .filter(a => a !== undefined)
            .forEach(a => a(actions, this, slotId, player, opponent));
        })
      }

      // Every action that we send to the player
      // should have unique identifier
      actions.forEach(action => action.id = uuid());

      // Select the next card for the next execution
      const [ card, slotId ] = this.getNextDeskCard(this.turn.slotId);
      this.turn.slotId = slotId ?? this.desk.length;
    }
  }

  /**
   * Creates a new game object with the same data, and then updates
   * it with a new data provided in the arguments.

   * @returns new game object
   */
  update(data: any) {
    return new Game({ ...this, ...data });
  }
  
}