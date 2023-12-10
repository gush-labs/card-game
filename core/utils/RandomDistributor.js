
function shuffle(array) {
  for (let i = array.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const iv = array[i];
    array[i] = array[j] 
    array[j] = iv;
  }
}

/**
 * Takes a collection of objects and probability with which
 * they should be returned by this picker. Used to pick cards from
 * the deck.
 */
export default class ObjectPicker {

  values = [];
  nodes = [];
  pickIndex = 0;

  constructor(props) {
    Object.assign(this, props);
    this.reset();
  }

  pick() {
    if (this.pickIndex < this.values.length) {
      const result = this.values[this.pickIndex];
      this.pickIndex += 1;
      return result;
    }

    // TODO: We probably want to do something else in this case
    return undefined;
  }

  reset() {
    this.values = [];
    this.generate();
    this.shuffle();
    this.pickIndex = 0;
  }

  generate(amount = this.amount, nodes = this.nodes) {
    let sum = 0;
    nodes.forEach(node => sum += node.weight ?? node.w);

    const unit = amount / sum;
    for (let node of nodes) {

      const nodeAmount = Math.floor(unit * (node.weight ?? node.w));
      if (nodeAmount < 1) {
        console.error("There is no enough space for " + (node.v ?? node.value));
        continue;
      }

      if (node.value ?? node.v) {
        for (let i = 0; i < nodeAmount; i++) {
          this.values.push(node.value ?? node.v);
        }
      } else if (node.group ?? node.g) {
        this.generate(nodeAmount, node.group);
      }
    }
  }

  shuffle() {
    shuffle(this.values);
  }
}

/*
function test(array) {

  const results = new Map();

  let prev = array[0];
  let seq = 1;

  for (let i = 1; i < array.length; i++) {
    if (prev === array[i]) {
      seq += 1;
    } else {
      
      if (!results.has(prev)) {
        results.set(prev, seq);
      } else {
        results.set(prev, Math.max(seq, results.get(prev)));
      }

      prev = array[i];
      seq = 1;
    }
  }

  console.log(results);
}


const distributor = new RandomDistributor({ nodes: [
  { w: 5/6, name: "Non mana cards", group: [
    { w: 1, name: "Damage cards", group: [
      { w: 1, v: "arrow" },
      { w: 1, v: "fireball" },
    ]},
    { w: 1, name: "Non damage cards", group: [
      { w: 1, v: "repeat" },
      { w: 1, v: "shield" },
      { w: 1, v: "reverse" },
    ]},
  ]},
  { w: 1/6, name: "Mana cards", group: [
    { w: 2/3, name: "1 mana cards", group: [
      { w: 1, v: "heal" },
      { w: 1, v: "anchor" },       // TODO: TEST IT
      { w: 1, v: "crater" },       // TODO: TEST IT
      { w: 1, v: "sain shield" }, // TODO: TEST IT
    ]},
    { w: 1/3, name: "3 mana cards", group: [
      { w: 1, v: "imitator" }
    ]},
  ]},
]});

const cards = [];

function putCards() {
  setTimeout(() => {
    console.log("generating...");

    distributor.pick();
    distributor.pick();
    for (let i = 0; i < 1; i++) {
      cards.push(distributor.pick());
    }

    if (cards.length < 50) {
      putCards();
    } else {
      test(cards);
    }
  }, 100);
}

putCards();

/*
For testing how uniform the distribution is 

const distributor = new RandomDistributor({
  nodes: [
    { w: 1/3, v: "vadim" },
    { w: 1/3, v: "nikita" },
    { w: 1/3, group: [
      { w: 2/3, v: "a" },
      { w: 1/3, v: "b" }
    ]},
  ]
});

const counters = new Map();
for (let i = 0; i < 1000; i++) {
  const value = distributor.pick();
  if (!counters.has(value)) {
    counters.set(value, 0);
  }
  counters.set(value, counters.get(value) + 1);
}

console.log(counters);
*/