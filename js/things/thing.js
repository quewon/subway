class Thing {
  constructor(p) {
    p = p || {};

    this.tag = "untagged";
    this.label = p.label || null;

    if (p.scene) {
      this.enter(p.scene);
    } else {
      this.enter(subway.currentScene);
    }

    this.position = p.position || new Vector2(
      this.scene.size.x * (Math.random() - .5),
      this.scene.size.y * (Math.random() - .5)
    );
  }

  draw() {}
  update(dt) {}

  exit() {
    this.scene.things.splice(this.scene.things.indexOf(this), 1);
    this.scene = null;
  }

  enter(scene) {
    if (scene == this.scene) return;

    this.scene = scene;
    this.scene.things.push(this);
  }

  drawUI() {}
}

class PhysicalThing extends Thing {
  constructor(p) {
    super(p);

    p = p || {};
    this.isPhysical = true;
    this.group = p.group || null;

    this.speed = p.speed == null ? 2 + Math.random() * 4 : p.speed;
    this.direction = new Vector2();
    this.velocity = new Vector2();
    this.weight = 1;
    this.frictionFactor = 1.1;
    this.unpushable = false;
    this.collisionsCounter = 0;
  }

  linkToScene(scene, door, offset) {
    if (this.linkedScene) {
      let od = this.linkDoor.relativePosition
        .add(this.linkDoor.confiner.position)
        .sub(this.position.add(this.linkOffset))
        .magnitude();

      let nd = door.relativePosition
        .add(door.confiner.position)
        .sub(this.position.add(offset))
        .magnitude();

      if (nd <= od) {
        this.unlink();
      } else {
        return;
      }
    }

    this.linkedScene = scene;
    this.linkOffset = offset;
    this.linkDoor = door;

    scene.linkedThings.push(this);
  }

  moveToLinkedScene() {
    if (this.scene == this.linkedScene) return;

    this.exit();
    this.enter(this.linkedScene);
    this.position = this.position.add(this.linkOffset);
    this.unlink();
  }

  unlink() {
    if (!this.linkedScene) return;

    this.linkedScene.linkedThings.splice(this.linkedScene.linkedThings.indexOf(this), 1);
    this.linkedScene = null;
  }

  update(dt) {
    this.direction = new Vector2();
    this.move(dt);
  }

  move(dt) {
    this.velocity = this.velocity.div(this.frictionFactor);
    this.velocity = this.velocity.add(this.direction.mul(this.speed * dt/1000));
    this.position = this.position.add(this.velocity);

    if (!this.unpushable) this.collideWithThings(dt);
  }

  collideWithThings(dt) {
    let force = new Vector2();

    for (let thing of this.scene.things) {
      if (!thing.isPhysical || thing == this) continue;

      var colliding = false;
      let direction, distance, radii;

      if (this.radius) {
        if (thing.radius) {
          // circle in circle

          distance = this.position.distanceTo(thing.position);
          radii = this.radius + thing.radius;
          if (distance <= radii) {
            direction = thing.position.sub(this.position).normalize().jiggle();

            colliding = true;
          }
        } else {
          // rect in circle

          let center = this.position;
          let radius = this.radius;
          let halfsize = thing.size.div(2);
          let rc = thing.position.add(halfsize);
          distance = center.sub(rc).abs();

          if (distance.x > halfsize.x + radius || distance.y > halfsize.y + radius) continue;

          if (
            distance.x <= halfsize.x ||
            distance.y <= halfsize.y ||
            distance.sub(halfsize).sqrMagnitude() <= radius * radius
          ) {
            direction = rc.sub(center).normalize();
            distance = center.distanceTo(rc);
            radii = Math.max(halfsize.x, halfsize.y) + radius;
            colliding = true;

            if (this.package && thing == this.package) {
              this.fulfillDelivery();
            }
          }
        }
      } else {
        if (thing.radius) {
          // circle in rect

          let center = thing.position;
          let radius = thing.radius;
          let halfsize = this.size.div(2);
          let rc = this.position.add(halfsize);

          distance = center.sub(rc).abs();

          if (distance.x > halfsize.x + radius || distance.y > halfsize.y + radius) continue;

          if (
            distance.x <= halfsize.x ||
            distance.y <= halfsize.y ||
            distance.sub(halfsize).sqrMagnitude() <= radius * radius
          ) {
            direction = center.sub(rc).normalize();
            distance = rc.distanceTo(center);
            radii = Math.max(halfsize.x, halfsize.y) + radius;

            colliding = true;
          }
        } else {
          // rect in rect

          let a = this.position;
          let as = this.size;
          let b = thing.position;
          let bs = thing.size;

          if (rectRect(a, as, b, bs)) {
            let ac = this.position.add(this.size.div(2));
            let bc = thing.position.add(thing.size.div(2));

            direction = bc.sub(ac).normalize();
            distance = ac.distanceTo(bc);
            radii = (Math.max(this.size.x, this.size.y) + Math.max(thing.size.x, thing.size.y))/2;

            colliding = true;
          }
        }
      }

      if (colliding) {
        let pushStrength = Math.min(radii/Math.max(distance, .1) * dt/200, 1);
        force = force.sub(direction.mul(pushStrength));

        this.collisionsCounter++;
        thing.collisionsCounter++;
      }
    }

    force = force.div(this.weight);

    this.applyForce(force);
  }

  applyForce(force) {
    this.velocity = this.velocity.add(force);
  }
}

class ImageThing extends Thing {
  constructor(p) {
    p = p || {};
    super(p);

    this.image = p.image;
    this.scale = p.scale || new Vector2(.5, .5);
  }

  draw() {
    let width = this.image.width * this.scale.x;
    let height = this.image.height * this.scale.y;
    let x = this.position.x - width/2;
    let y = this.position.y - height/2;
    context.drawImage(this.image, x, y, width, height);
  }
}

class Interactable extends Thing {
  constructor(p) {
    super(p);
    p = p || {};

    this.tag = "interactable";
    this.promptText = "interact";

    this.color = new RGBA(255, 230, 0, 1);
    this.size = p.size || new Vector2(10, 10);
    this.position = this.position.sub(new Vector2(this.size.x/2, this.size.y/2));

    this.hover = false;
    this.active = false;
    this.toggled = false;
    this.hoveringPassengers = [];
    this.interactingPassengers = [];
  }

  draw() {
    this.drawBox();
    this.drawLabel();
  }

  drawBox() {
    context.fillStyle = context.strokeStyle = this.color.toString();
    context.beginPath();
    context.rect(this.position.x, this.position.y, this.size.x, this.size.y);
    if (this.toggled) {
      context.fill();
    } else {
      context.stroke();
    }
  }

  drawPrompt() {
    if (player && player.scene == this.scene && this.hoveringPassengers.indexOf(player) != -1) {
      context.fillStyle = LINES_COLOR;
      context.font = "13px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";

      context.strokeStyle = BACKGROUND_COLOR;
      context.lineWidth = 3;
      context.strokeText("[space] "+this.promptText, this.position.x + this.size.x/2, this.position.y);
      context.lineWidth = 1;

      context.fillText("[space] "+this.promptText, this.position.x + this.size.x/2, this.position.y);
    }
  }

  drawUI() {
    this.drawPrompt();
  }

  update(dt) {
    this.hover = false;
    this.active = false;

    for (let passenger of this.scene.things) {
      if (passenger.tag != "passenger") continue;

      let margin = new Vector2(2, 2);
      let collides = circleRect(passenger.position, passenger.radius, this.position.sub(new Vector2(margin.x/2, margin.y/2)), this.size.add(margin));
      let index = this.hoveringPassengers.indexOf(passenger);

      if (collides) {
        this.hover = true;
        if (index == -1) {
          this.hoveringPassengers.push(passenger);
          this.onhover(passenger);
        }

        let interactIndex = this.interactingPassengers.indexOf(passenger);
        if (passenger.interacting) {
          this.active = true;
          if (interactIndex == -1) {
            this.interactingPassengers.push(passenger);
            this.oninteract(passenger);
            this.toggled = !this.toggled;
          }
        } else if (interactIndex != -1) {
          this.interactingPassengers.splice(interactIndex, 1);
          this.onuninteract(passenger);
        }
      } else if (index != -1) {
        this.hoveringPassengers.splice(index, 1);
        this.onleave(passenger);
        this.toggled = false;

        let interactIndex = this.interactingPassengers.indexOf(passenger);
        if (interactIndex != -1) {
          this.interactingPassengers.splice(interactIndex, 1);
          this.onuninteract(passenger);
        }
      }
    }
  }

  onhover(passenger) { }
  onleave(passenger) { }
  oninteract(passenger) { }
  onuninteract(passenger) { }
}

class Map extends Interactable {
  constructor(p) {
    p = p || {};
    p.size = new Vector2(30, 30);

    super(p);

    this.promptText = "map";
  }

  draw() {
    this.drawBox();
    let star = images.map.star;
    let width = star.width;
    let height = star.height;
    context.drawImage(star, this.position.x + this.size.x/2 - width/2, this.position.y + this.size.y/2 - height/2);
  }

  oninteract(passenger) {
    if (passenger == player) {
      if (subway.mapOpen) {
        subway.closeMap();
        passenger.unpushable = false;
      } else {
        subway.openMap();
        passenger.unpushable = true;
      }
    }
  }

  onleave(passenger) {
    if (passenger == player && subway.mapOpen) {
      subway.closeMap();
      passenger.unpushable = false;
    }
  }
}

class TrainTracker extends Interactable {
  constructor(p) {
    p = p || {};
    p.size = new Vector2(18, 20);
    super(p);

    this.line = p.line;
    this.direction = p.direction;
    this.trackerOpen = false;

    this.promptText = "track";

    //

    this.this_stop = this.scene.station;
    this.prev_stop = this.line.getPreviousStop(this.this_stop, this.direction);
    this.next_stop = this.line.getNextStop(this.this_stop, this.direction);
    this.stops = [
      this.prev_stop,
      this.this_stop,
      this.next_stop
    ];

    let names = [this.this_stop.name];
    if (this.prev_stop) names.push(this.prev_stop.name);
    if (this.next_stop) names.push(this.next_stop.name);

    let longestName;
    let longestNameLength = 0;
    for (let name of names) {
      if (name.length > longestNameLength) {
        longestName = name;
        longestNameLength = name.length;
      }
    }
    this.longestName = longestName;
  }

  draw() {
    this.drawBox();
  }

  drawUI() {
    this.drawPrompt();
    if (this.trackerOpen) this.drawTracker();
  }

  drawTracker() {
    context.font = "13px monospace";
    context.textAlign = "center";
    context.textBaseline = "top";

    let measurement = context.measureText(this.longestName);
    let textWidth = measurement.width + 20;
    let textHeight = measurement.fontBoundingBoxDescent;

    let width = textWidth * 3;
    let height = textHeight * 7;

    context.beginPath();
    context.rect(-width/2, -height/2, width, height);
    context.fillStyle = LINES_COLOR;
    context.fill();

    context.fillStyle = BACKGROUND_COLOR;

    let y = -height/2 + textHeight * 5;
    for (let i=0; i<this.stops.length; i++) {
      let station = this.stops[i];
      if (station) {
        let x = -width/2 + textWidth * i + textWidth/2;
        context.fillText(station.name, x, y);

        context.beginPath();
        context.arc(x, y-5, 3, 0, Math.PI*2);
        context.fill();
      }
    }

    context.strokeStyle = BACKGROUND_COLOR;
    context.beginPath();
    context.moveTo(-width/2 + 10, y-5);
    context.lineTo(width/2 - 10, y-5);
    context.stroke();

    context.fillText(subway.getTimeString(), 0, -height/2 + textHeight);
  }

  oninteract(passenger) {
    if (passenger == player) {
      this.trackerOpen = !this.trackerOpen;
      passenger.unpushable = this.trackerOpen;
    }
  }

  onleave(passenger) {
    if (passenger == player && this.trackerOpen) {
      this.trackerOpen = false;
      passenger.unpushable = false;
    }
  }
}

class VendingMachine extends Interactable {
  constructor() {

  }
}
