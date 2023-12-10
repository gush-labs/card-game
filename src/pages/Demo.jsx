import RandomDistributor from "../../core/utils/RandomDistributor";
import { Cards } from "../../core/Cards";
import CardSlot from "../components/CardSlot";
import "./Demo.css";
import { cardsConfiguration } from "../../core/Game";

export default function Demo() {

  /*
  const distributor = new RandomDistributor({ amount: 26, nodes: [
    { w: 1, v: Cards.FIREBALL.id },
    { w: 1, v: Cards.ARROW.id },
    { w: 1, group: [
      { w: 1, v: Cards.SHIELD.id },
      { w: 1, v: Cards.REPEAT.id },
    ]}
  ]});
  */
  
  const distributor = new RandomDistributor(cardsConfiguration);
  // const distributor = new Game().cards;
  // distributor.generate(26);
  // distributor.shuffle();

  const cards = [];
  for (let i = 0; i < 100; i++) {
  // for (let cardId of distributor.values) {
    // const instance = Cards[cardId].createInstance();
    const cardId = distributor.pick();
    if (!cardId) break;

    const instance = Cards[cardId].createInstance();
    cards.push((
      <CardSlot cardInstance={ instance } enabled={ true }></CardSlot>
    ));
  }

  return (
    <div className='DemoContainer'>{cards}</div>
  );
}