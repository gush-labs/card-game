import "./Game.css"
import { useState, useCallback } from "react"
import CardSlot from "../components/CardSlot"
import { GameState } from "../../core/Game";
import PlayerHealth from "../components/player/PlayerHealth";
import PlayerAvatar from "../components/player/PlayerAvatar";
import PlayerEffects from "../components/PlayerEffects";
import ActionsView from "../components/ActionsList";
import { useGameView, GameViewMode } from "../io/GameSession";
import DeskSlot from "../components/DeskSlot";
import CardDeck from "../components/CardDeck";
import PlayerMana from "../components/player/PlayerMana";

import CardInfoOverlay from "../components/overlay/CardInfoOverlay";
import FullscreenOverlay from "../components/overlay/FullscreenOverlay";
import WaitingPlayersOverlay from "../components/overlay/WaitingPlayersOverlay";
import GameCompleteOverlay from "../components/overlay/GameCompleteOverlay";

// TODO(vadim): Use CSS modules

export default function GamePage({ playerInfo, connection, gameId }) {

  const [ showCardInfo, setShowCardInfo ] = useState(undefined);

  const gameSession = useGameView(connection, playerInfo, gameId);
  const { game, player, opponent, hand, desk, actions, manaCost } = gameSession;

  let opponentBadge = undefined;
  let playerBadge = undefined;

  if (game.state === GameState.PLAYER_TURN) {
    if (game.isPlayerTurn(player.id)) {
      playerBadge = <div className='player-badge'>{ game.turn.turns === 1 ? "Вы атакуете" : "Вы защищаетесь"}</div>
    } else {
      opponentBadge = <div className='player-badge'>Ход соперника</div>
    }
  }

  const onInfo = useCallback((card) => setShowCardInfo(card), []);
  const onCloseInfo = useCallback(() => setShowCardInfo(undefined), []);

  let fullscreenOverlay = undefined;
  if (game.state === GameState.WAITING_FOR_PLAYERS) {
    fullscreenOverlay = (
    <FullscreenOverlay>
      <WaitingPlayersOverlay />
    </FullscreenOverlay>)

  } else if (game.state === GameState.COMPLETE) {
    fullscreenOverlay = (
    <FullscreenOverlay>
      <GameCompleteOverlay game={ game } player={ player }/> 
    </FullscreenOverlay>);

  } else if (showCardInfo) {
    fullscreenOverlay = (
    <FullscreenOverlay>
      <CardInfoOverlay card={ showCardInfo } onClose={ onCloseInfo }/>
    </FullscreenOverlay>)
  } 

  // TODO(vadim): Rename "card-container" to "desk-container"
  // and "desk-container" to "game-container"
  // TODO(vadim): Replace everything with the proper components
  return (
    <div className="desk-container">

      { fullscreenOverlay }

      <div className="opponent-container">
        <PlayerMana player={ opponent }/>
        <PlayerAvatar player={ opponent }/>
        <PlayerHealth player={ opponent } />
      </div>


      <div className="card-container">
        <div className="event-container">
          <ActionsView actions={ actions } game={ game } />
        </div>

        <div className='center-container'>
          <div className='player-badge-container top'>
            { opponentBadge }
            { game.state === GameState.EXECUTION_TURN ? <PlayerEffects player={opponent} /> : undefined }
          </div>

          <div className="inner-card-container">
            { desk.map((cardSlot, slotId) => 
              <DeskSlot 
                key={ slotId } 
                player={ player }
                owner={ game.getPlayer(cardSlot.getCard()?.owner) }
                enchantCost={ gameSession.enchantCost[slotId] }
                >

                <CardSlot
                  cardInstance={ cardSlot.getCard() } 
                  enabled={ gameSession.enabledDeskSlots[slotId] }
                  onClick={ () => gameSession.selectDeskSlot(slotId) } 
                  selected={ gameSession.slotSelection.isSlotSelected('desk', slotId) } 
                  highlighted={ game.isCardSlotExecuted(slotId) }
                  onInfo={ () => onInfo(cardSlot.getCard()?.getCard()) }
                />
              </DeskSlot>
              ) 
            }
          </div>

          <div className='player-badge-container bottom'>
            { game.state === GameState.EXECUTION_TURN ? <PlayerEffects player={player} /> : undefined }
            { playerBadge }
          </div>
        </div>

        <div className="turn-button-container">
          {
            game.isPlayerTurn(player.id) ? <button 
              className="end-turn-button" 
              onClick={ gameSession.completeTurn }>
                <i className="bi bi-play-circle-fill"></i></button> : undefined
          }
        </div>

      </div>


      <div className="player-container">
        <div className="player-status-container">
          <PlayerAvatar player={ player }/>
          <PlayerHealth player={ player }/>
          <PlayerMana player={ player } cost={ manaCost }/>
        </div>
        <div className="card-container">

          { hand.map((cardSlot, slotId) => 
            <CardSlot
              key={ slotId } 
              cardInstance={ cardSlot.getCard() } 
              // TODO(vadim): game.isPlayerTurn(playerId) - USELESS, replace with proper 'mode' check
              enabled={ gameSession.enabledHandSlots[slotId] }
              onClick={ () => gameSession.selectHandSlot(slotId) }
              onInfo={ () => onInfo(cardSlot.getCard()?.getCard()) }
              selected={ gameSession.slotSelection.isSlotSelected('hand', slotId) }/>)}

        </div>
        <div className="player-deck-container">
          <CardDeck 
            onClick={ () => gameSession.pullCard() }
            available={ gameSession.canPullCard }
          />
        </div>
      </div>
    </div>
  )
}
