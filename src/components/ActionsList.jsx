import { Actions } from "../../core/Actions";
import { Effects } from "../../core/Effects";
import { Cards } from "../../core/Cards";
import style from "./ActionsList.module.css"

export default function ActionsList({ actions, game }) {

  function renderAction(key, icon, content) {
    return (
      <div key={ key } className={ style.Action }>
        <div><i class={`bi bi-${ icon }`}></i></div>
        <div>{ content }</div>
      </div>
    );
  }

  function getAction(action, id) {
    const targetPlayer = game.getPlayer(action.target);

    if (action.type === Actions.DAMAGE) {
      return renderAction(action.id, "heartbreak", 
        (<><b>{ targetPlayer.name }</b> {action.damage} урона</>))
    }

    if (action.type === Actions.CHANGE_OWNER) {
      return renderAction(action.id, "arrow-down-up", 
        (<>Следующее заклинение сменило владельца</>))
    }

    if (action.type === Actions.DAMAGE_BLOCKED) {
      return renderAction(action.id, "shield", 
        (<><b>{ targetPlayer.name }</b> блокирует { action.damage } урона</>))
    }

    if (action.type === Actions.EFFECT_ADDED) {
      const effectName = Effects.getEffectById(action.effectId).name;
      return renderAction(action.id, "plus-circle", 
        (<><b>{ targetPlayer.name }</b> получает { effectName }</>))
    }

    if (action.type === Actions.EFFECT_REMOVED) {
      const effectName = Effects.getEffectById(action.effectId).name;
      return renderAction(action.id, "dash-circle", 
        (<><b>{ targetPlayer.name }</b> теряет { effectName }</>))
    }

    if (action.type === Actions.HEAL) {
      return renderAction(actions.id, "patch-plus", 
        (<>{ targetPlayer.name } получает { action.heal } здоровья</>))
    }

    if (action.type === Actions.PIN) {
      const cardName = Cards.getCardById(action.cardId).name;
      return renderAction(actions.id, "link-45deg",
        (<>{ targetPlayer.name } закрепил карту { cardName }</>))
    }

    return undefined;
  }
  
  return (
    <div className={ style.ActionsContainer }>
      { actions.map((a, id) => getAction(a, id)) }
    </div>
  );
}