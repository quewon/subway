const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

function animate() {
  document.body.classList.remove("pointer");

  context.lineCap = "round";

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.translate(canvas.width/2, canvas.height/2);
  context.scale(window.devicePixelRatio, window.devicePixelRatio);

  context.fillStyle = GRADIENT;
  context.beginPath();
  context.rect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
  context.fill();

  if (player && subway) subway.draw();

  requestAnimationFrame(animate);
}

var previousTime = new Date();
function update() {
  let now = new Date();
  let dt = Math.min(now - previousTime, 10);

  if (subway) subway.update(dt);

  previousTime = now;

  mouse.downThisFrame = false;

  requestAnimationFrame(update);
}

window.onresize = function() {
  canvas.width = window.innerWidth * window.devicePixelRatio * GAME_SCALE;
  canvas.height = window.innerHeight * window.devicePixelRatio * GAME_SCALE;

  let gradient = context.createRadialGradient(0, 0, 300, 0, 0, window.innerHeight * 3);
  gradient.addColorStop(0, BACKGROUND_COLOR);
  gradient.addColorStop(.5, "rgba(191, 212, 217, .3)");
  gradient.addColorStop(.7, "rgba(204, 122, 174, .1)");
  GRADIENT = gradient;
}

var mouse = { down: false, downThisFrame: false, rightdown: false, gamePosition: new Vector2() };

function init_inputs() {
  document.onmousedown = function(e) {
    let x = e.pageX * window.devicePixelRatio;
    let y = e.pageY * window.devicePixelRatio;

    mouse.down = true;
    mouse.downThisFrame = true;
  }
  document.oncontextmenu = function(e) {
    mouse.rightdown = true;
    e.preventDefault();
  }
  document.onmousemove = function(e) {
    mouse.gamePosition = new Vector2(e.pageX, e.pageY);
    mouse.gamePosition = mouse.gamePosition.mul(window.devicePixelRatio * GAME_SCALE);
    mouse.gamePosition.x -= canvas.width/2;
    mouse.gamePosition.y -= canvas.height/2;
    mouse.gamePosition = mouse.gamePosition.div(window.devicePixelRatio);
  }
  document.onmouseup = function(e) {
    mouse.down = false;
    mouse.rightdown = false;
  }

  window.onblur = function(e) {
    document.onmouseup();
  }
}