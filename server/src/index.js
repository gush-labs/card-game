import { WebSocketServer } from "ws";
import Game, { GameState } from "../../core/Game.js";
import ClientConnection from "./io/ClientConnection.js";
import Player from "../../core/Player.js";
import { Errors } from "../../core/Errors.js";
import { v4 as uuid } from "uuid";

const server = new WebSocketServer({ port: 8080 });

// All games that are currently going on
const games = new Map();

// All players connections
const connections = new Map();

function getPlayersConnections(players) {
  return players.map(p => connections.get(p.id))
    .filter(con => con !== undefined);
}

server.on('connection', socket => {
  socket.on('error', console.log);

  const connection = new ClientConnection(socket);

  connection.onClose(() => {
    if (connection.player === undefined) return;
    connections.delete(connection.player.id);
  });

  /**
   * Asks the server to find a game. It will find any available one
   * to join and return its gameId
   */
  connection.onFindGame(request => {

    // Go through all games to find any available one
    // TODO(vadim): O(N)! Should be O(1)
    let availableGameId = undefined;
    for (const [id, game] of games) {
      if (game.players.length < 2) availableGameId = id;
    }

    if (availableGameId) {

      // Find available game to play
      const game = games.get(availableGameId);
      const playerIndex = game.players.findIndex(p => p.id === request.player.id);

      // If game doesn't have this player, we should add him
      if (playerIndex < 0) game.addPlayer(new Player(request.player));

      connection.sendGameIsFound({ gameId: availableGameId });

    } else {

      // Create a new one
      console.log("MN -> Creating new game")
      const game = new Game();
      const gameId = uuid();
      game.addPlayer(new Player(request.player));
      games.set(gameId, game);
      connection.sendGameIsFound({ gameId });
    }

    connection.player = new Player(request.player);
  });
  
  /**
   * Player joins the existing game based on gameId field.
   * We will return the entire game state.
   */
  connection.onJoinGame(request => {
    // Player wants to join a new game
    const game = games.get(request.gameId);

    if (!game) {
      connection.sendError(Errors.GAME_IS_NOT_FOUND);
      return;
    }

    if (!game.state === GameState.WAITING_FOR_PLAYERS) {
      connection.sendError(Errors.GAME_IS_FULL);
      return;
    }

    let player = game.getPlayer(request.player.id);
    if (player) {
      // Reconnect the existing one
      console.log(`MN -> '${ player.name }' re-joins the game `);
    } else {
      // Add a new player
      console.log(`MN -> '${ request.player.name }' joins the game `);
      player = game.addPlayer(new Player(request.player));
    }

    // Close previous connection
    if (connections.has(request.player.id)) {
      connections.get(request.player.id).close();
      connections.delete(request.player.id);
    }

    // Set new connection for this player
    connections.set(request.player.id, connection);

    // Need to remember which player and which game
    connection.player = new Player(player ?? request.player);
    connection.game = game;

    // Send the entire state of the game
    connection.sendFullUpdate(game);

    getPlayersConnections(game.players.filter(p => p.id !== player.id))
      .forEach(con => con.sendPartialUpdate(game, ['players', 'state', 'turn']));
  });

  /**
   * On every event that we will recieve from players, we should
   * check if game needs to move to a new turn.
   */
  connection.onEvent(() => {
    if (!connection.game) return;

    function scheduleNewTurn() {
      const game = connection.game;
      if (game && game.state === GameState.EXECUTION_TURN) {
        const actions = [];
        game.performExecutionTurn(actions);

        game.actions = actions;
        getPlayersConnections(game.players)
          .forEach(con => con.sendPartialUpdate(game, ['actions', 'players', 'desk', 'turn', 'state']));
        setTimeout(() => scheduleNewTurn(), 3000);
      } else {
        connection.game.executionInProcess = false;
      }
    }

    if (!connection.game.executionInProcess) {
      console.log("MN -> Schedule execution turn")
      connection.game.executionInProcess = true;
      setTimeout(() => scheduleNewTurn(), 3000);
    }
  })

  connection.onPullCard(() => {
    const game = connection.game;
    const player = game.getPlayer(connection.player.id);
    game.pullCard(player);
    connection.sendPartialUpdate(game, [ 'players' ]);
  });

  /**
   * Whenever the player decided to complete his turn.
   */
  connection.onCompleteTurn(() => {
    const game = connection.game;
    const player = game.getPlayer(connection.player.id);
    if (!game.isPlayerTurn(player)) return;

    game.nextTurn();
    
    getPlayersConnections(game.players)
      .forEach(con => con.sendPartialUpdate(game, [ 'state', 'turn']))
  });

  connection.onMoveCardFromHandToDesk(request => {
    const handSlotId = request.handSlotId;
    const deskSlotId = request.deskSlotId;

    const game = connection.game;
    const player = game.getPlayer(connection.player.id);

    if (!game.isPlayerTurn(player)) return;

    // Move the card
    const cardRef = player.hand[handSlotId];
    player.hand = player.hand.map((ref, id) => id === handSlotId ? undefined : ref)
    game.desk = game.desk.map((ref, id) => id === deskSlotId ? cardRef : ref);

    // Send update of the desk to everyone except for the player itself
    getPlayersConnections(game.players.filter(p => p.id !== player.id))
      .forEach(con => con.sendPartialUpdate(game, ['desk']));
  });

  connection.onMoveCardFromDeskToHand(request => {
    const deskSlotId = request.deskSlotId;
    const handSlotId = request.handSlotId;

    const game = connection.game;
    const player = game.getPlayer(connection.player.id);

    if (!game.isPlayerTurn(player)) return;

    // Move the card
    const cardRef = game.desk[deskSlotId];

    // Player can't move someones card to their hand
    if (cardRef.owner !== player.id) return;

    game.desk = game.desk.map((ref, id) => id === deskSlotId ? undefined : ref);
    player.hand = player.hand.map((ref, id) => id === handSlotId ? cardRef : ref);

    // Send update of the desk to everyone except the player itself
    getPlayersConnections(game.players.filter(p => p.id !== player.id))
      .forEach(con => con.sendPartialUpdate(game, ['desk']));
  });

  connection.onMoveCardFromDeskToDesk(request => {
    const fromSlotId = request.fromSlotId;
    const toSlotId = request.toSlotId;

    const game = connection.game;
    const player = game.getPlayer(connection.player.id);

    if (!game.isPlayerTurn(player)) return;

    // TODO(vadim): Verify order of the cards
    
    // Move the card
    const cardRef = game.desk[fromSlotId];
    game.desk = game.desk
      .map((ref, id) => id === fromSlotId ? undefined : ref)
      .map((ref, id) => id === toSlotId ? cardRef : ref)

    // Send update of the desk to everyone except the player itself
    getPlayersConnections(game.players.filter(p => p.id !== player.id))
      .forEach(con => con.sendPartialUpdate(game, ['desk']));
  }); 

  connection.onMoveCardFromHandToHand(request => {
    const fromSlotId = request.fromSlotId;
    const toSlotId = request.toSlotId;

    const game = connection.game;
    const player = game.getPlayer(connection.player.id);

    if (!game.isPlayerTurn(player)) return;

    // Move the card
    const cardRef = player.hand[fromSlotId];
    player.hand = player.hand
      .map((ref, id) => id === fromSlotId ? undefined : ref)
      .map((ref, id) => id === toSlotId ? cardRef : ref);

    // no need to send any updates because hands are not visible to other players
    // and the player itself knows what's going on with its hand
  });

})