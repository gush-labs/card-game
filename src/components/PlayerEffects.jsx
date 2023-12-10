import { Effects } from "../../core/Effects";
import "./PlayerEffects.css"

// TODO(vadim): Use CSS modules
export default function PlayerEffects({ player }) {
  const effects = [];

  function renderEffect(icon, id) {
    effects.push(
      <div className='player-effect' key={ id }><i class={`bi bi-${icon}`}></i></div>
    );
  }

  player.effects.forEach((effect, id) => {
    if (effect.id === Effects.HAS_SHIELD.id) {
      renderEffect("shield-shaded", id);
    }
    if (effect.id === Effects.SAINT_SHIELD.id) {
      renderEffect("shield-fill-plus", id);
    }
  });

  return (
    <div className='player-effects-container'>
      { effects }
    </div>
  );
}