# core

Contains game logic and description of all game objects. 

Game objects are described using the following pattern:
```js
// Description of the object itself
class Object {}

// List of all possible objects in the game
const Objects = {
  ID1: new Object({}),
  ID2: new Object({}),
  ID3: new Object({}),
};

// A particular instance of the object
// Contains instance related field
class ObjectInstance {
  id: 0; // ID of the referenced object

  // Method to get the referenced object
  getObject() {
    returns Objects[id];
  }
}
```