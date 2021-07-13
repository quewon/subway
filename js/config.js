var Config = {
  res: 2,
  cursorSize: 0.1,

  Colors: ["Black", "DarkGray", "LightGray", "White"],
  Black: 0x000000,
  DarkGray: 0x5c5c5c,
  LightGray: 0xa4a4a4,
  White: 0xffffff,

  defaultRotation: Math.PI / 2, //initial rotation of objects

  keyMap: {
    forward: "w",
    left: "a",
    right: "d",
    jump: " ",
    back: "s",
    pickup: "MouseClick",
    place: "MouseClick",
    interact: "e",
  },

  Vector3Right: new Vector3( 0, 0, -1 ),
  Vector3Left: new Vector3( 0, 0, 1 ),
  Vector3Up: new Vector3( 0, 1, 0 ),
  Vector3Forward: new Vector3( -1, 0, 0 ),
  Vector3Backward: new Vector3( 1, 0, 0 ),
};

function clamp(num, min, max) {
  return num <= min 
    ? min 
    : num >= max 
      ? max 
      : num
}