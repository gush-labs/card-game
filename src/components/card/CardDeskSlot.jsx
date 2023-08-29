import style from "./CardDeskSlot.module.css";

export default function CardDeskSlot({ children, owner }) {

  const ownerBadge = owner ? (
    <div className={`${ style.Owner } ${ owner.opponent ? style.Opponent : style.Player }`}>
      { owner.name }
    </div>
  ) : undefined;

  return (
    <div className={ style.CardDeskSlot }>
      <div className={ style.Effects }>
      </div>
      { children }
      <div className={ style.OwnerContainer }>
        { ownerBadge }
      </div>
    </div>
  )
}