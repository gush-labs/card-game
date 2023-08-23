import './player-cards.css'

export default function PlayerCards({ player }) {
  return (
    <div className='player-cards-bar'>
      <div><i class="bi bi-collection-fill"></i></div>
      <div>{ player.pullSize }</div>
    </div>
  );
}