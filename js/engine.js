const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

const notebook = document.getElementById("notebook");
const noteContext = notebook.getContext("2d");

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

  // noise();

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
  if (subway && subway.currentScene) {
    subway.saveNotes(subway.currentScene);
  }

  let prevWidth = canvas.width;
  let prevHeight = canvas.height;

  notebook.width = canvas.width = window.innerWidth * window.devicePixelRatio * GAME_SCALE;
  notebook.height = canvas.height = window.innerHeight * window.devicePixelRatio * GAME_SCALE;

  // noiseCanvas.width = window.innerWidth * window.devicePixelRatio / 8;
  // noiseCanvas.height = window.innerHeight * window.devicePixelRatio / 8;
  // noise();

  if (subway && subway.currentScene) {
    subway.placeNotes();
  }

  let gradient = context.createRadialGradient(0, 0, 300, 0, 0, window.innerHeight * 3);
  gradient.addColorStop(0, BACKGROUND_COLOR);
  gradient.addColorStop(.5, "rgba(191, 212, 217, .3)");
  gradient.addColorStop(.7, "rgba(204, 122, 174, .1)");
  GRADIENT = gradient;
}

var keysdown = {};
var mouse = { down: false, downThisFrame: false, rightdown: false, gamePosition: new Vector2() };

function init_inputs() {
  document.onkeydown = function(e) {
    if (e.repeat) return;

    keysdown[e.code] = true;
  }
  document.onkeyup = function(e) {
    keysdown[e.code] = false;

    if (e.code == "KeyC") {
      noteContext.clearRect(0, 0, notebook.width, notebook.height);
    }
  }

  document.onmousedown = function(e) {
    let x = e.pageX * window.devicePixelRatio;
    let y = e.pageY * window.devicePixelRatio;

    mouse.down = true;
    mouse.downThisFrame = true;
    mouse.prevPoint = new Vector2(x, y);
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

    if (mouse.down || mouse.rightdown) {
      let x = e.pageX * window.devicePixelRatio;
      let y = e.pageY * window.devicePixelRatio;

      if (mouse.rightdown) {
        noteContext.strokeStyle = "white";
        noteContext.globalCompositeOperation = "destination-out";
        noteContext.lineWidth = 30;
      } else {
        noteContext.strokeStyle = "blue";
        noteContext.globalCompositeOperation = "source-over";
        noteContext.lineWidth = 2;
      }

      noteContext.lineCap = "round";

      noteContext.beginPath();
      noteContext.moveTo(mouse.prevPoint.x, mouse.prevPoint.y);
      noteContext.lineTo(x, y);

      // uncomment this to be able to draw on scenes :)
      // noteContext.stroke();

      mouse.prevPoint = new Vector2(x, y);

      if (subway && subway.currentScene) {
        subway.currentScene.notebookEdited = true;
      }
    }
  }
  document.onmouseup = function(e) {
    mouse.down = false;
    mouse.rightdown = false;
    mouse.prevPoint = null;
  }

  window.onblur = function(e) {
    for (let key in keysdown) {
      keysdown[key] = false;
    }
    document.onmouseup();
  }
}

// const noiseCanvas = document.getElementById("noise");
// const noiseContext = noiseCanvas.getContext("2d");
// function noise() { //https://codepen.io/fawority/pen/aVqWey
// 	const w = noiseCanvas.width,
// 				h = noiseCanvas.height,
// 				iData = noiseContext.createImageData(w, h),
// 				buffer32 = new Uint32Array(iData.data.buffer),
// 				len = buffer32.length
//
// 	for (let i=0; i<len; i++) {
//     if (Math.random() < 0.5) {
//       buffer32[i] = 0x2f000000;
//     }
//   }
//
// 	noiseContext.putImageData(iData, 0, 0);
// }
