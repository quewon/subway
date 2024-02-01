const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

context.font = "11px normal serif";
context.textBaseline = "middle";
context.textAlign = "center";

function animate() {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.translate(canvas.width/2, canvas.height/2);
  context.scale(window.devicePixelRatio, window.devicePixelRatio);
  context.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);

  if (subway) subway.draw();

  requestAnimationFrame(animate);
}

var previousTime = new Date();
function update() {
  let now = new Date();
  let dt = Math.min(now - previousTime, 10);

  if (subway) subway.update(dt);

  previousTime = now;
}

window.onresize = function() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
}

var keysdown = {};
document.onkeydown = function(e) {
  if (e.repeat) return;

  keysdown[e.key] = true;
}
document.onkeyup = function(e) {
  keysdown[e.key] = false;
}
