var Controls = {
  mouse: {
    x: 0,
    y: 0,
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    speed: Math.PI / 16,
    clampDegree: Math.PI / 2,
  },
  key: {
    handler: {},
    history: [],
    update: undefined,
  },
};

function init_controls() {
  // mouse

  document.body.addEventListener( 'click', function () {
    this.requestPointerLock();
  }, false );

  document.addEventListener("mousemove", function(e) {
    Controls.mouse.x = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    Controls.mouse.y = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
  }, false);

  // key

  document.addEventListener("keydown", function(e) {
    if (e.repeat) return;

    let k = e.key;

    Controls.key.handler[k] = e.type == "keydown";
    Controls.key.history.unshift(k);
  });

  document.addEventListener("keyup", function(e) {
    let k = e.key;

    Controls.key.handler[k] = e.type == "keydown";
    if (k == Controls.key.history[0]) {
      Controls.key.history.shift();
    };
  });

  window.addEventListener("blur", function(e) {
    for (let key in Controls.key.handler) {
      Controls.key.handler[key] = false;
    }
  });
}

Controls.mouse.update = function(delta) {
  const x = Controls.mouse.x;
  const y = Controls.mouse.y;

  let player = S[S.Current].mobs.player;
  let speed = Controls.mouse.speed;

  let change = x * speed * delta;
  player.turn(change);

  Controls.mouse.euler.y -= change;
  Controls.mouse.euler.x -= y * speed * delta;
  Controls.mouse.euler.x = clamp(Controls.mouse.euler.x, -Controls.mouse.clampDegree, Controls.mouse.clampDegree);
  camera.quaternion.setFromEuler(Controls.mouse.euler);
}

Controls.key.update = function() {
  const map = Config.keyMap;
  const player = S[S.Current].mobs.player;

  let handler = Controls.key.handler;
  let history = Controls.key.history;

  for (let i in handler) {
    if (handler[i]) {
      switch (i) {
        case map.forward:
          if (history[0] == map.back) break;
          player.move("Forward");
          break;
        case map.back:
          if (history[0] == map.forward) break;
          player.move("Backward");
          break;
        case map.right:
          if (history[0] == map.left) break;
          player.move("Right");
          break;
        case map.left:
          if (history[0] == map.right) break;
          player.move("Left");
          break;
      }
    }
  }

  // if (!Key.Handler[map.jump] && p.offGround) p.terminateJump();
  // if (!Key.Handler[map.place] && p.isPlacing) p.isPlacing = false;
  // if (!Key.Handler[map.pickup] && p.isPickingUp) p.isPickingUp = false;
  // if (!Key.Handler[map.interact] && p.isInteracting) p.isInteracting = false;
}