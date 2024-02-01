class Thing {
  constructor(p) {
    p = p || {};

    this.tag = "untagged";
    this.position = p.position || new Vector2();

    if (p.scene) {
      this.enter(p.scene);
    } else {
      this.enter(subway.currentScene);
    }
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

    if (this == player) {
      subway.currentScene = scene;
    }
  }
}

class Wall extends Thing {
  constructor(p) {
    super(p);

    p = p || {};
    this.tag = "wall";
    this.size = p.size || new Vector2(10, 10);
    this.color = new RGBA();
  }

  update(dt) {
    this.keepOutPassengers(dt);
  }

  circleCollides(position, radius) {
    return circleRect(position, radius, this.position, this.size);
  }

  keepOutPassengers(dt) {
    for (let passenger of this.scene.things) {
      if (passenger.tag != "passenger") continue;

      if (this.circleCollides(passenger.position, passenger.radius)) {
        let force = new Vector2();

        if (passenger.position.x <= this.position.x) {
          force.x--;
        } else if (passenger.position.x >= this.position.x + this.size.x) {
          force.x++;
        }
        if (passenger.position.y <= this.position.y) {
          force.y--;
        } else if (passenger.position.y >= this.position.y + this.size.y) {
          force.y++;
        }

        passenger.applyForce(force.mul(dt/100));
      }
    }
  }

  draw() {
    context.strokeStyle = this.color;
    context.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
  }
}

class Interactable extends Wall {
  constructor(p) {
    super(p);
    p = p || {};

    this.tag = "interactable";
    this.isSolid = true;

    this.color = new RGBA(0, 0, 255, 1);
    this.idleColor = new RGBA(0, 0, 255, .3);
    this.position = this.position.sub(new Vector2(this.size.x/2, this.size.y/2));

    this.active = false;
    this.interactingPassengers = [];
  }

  draw() {
    if (this.active) {
      context.strokeStyle = this.color.toString();
    } else {
      context.strokeStyle = this.idleColor.toString();
    }
    context.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
  }

  update(dt) {
    if (this.isSolid) {
      this.keepOutPassengers(dt);
    }

    this.active = false;
    for (let passenger of this.scene.things) {
      if (passenger.tag != "passenger") continue;

      let margin = new Vector2(2, 2);
      if (circleRect(passenger.position, passenger.radius, this.position.sub(new Vector2(margin.x/2, margin.y/2)), this.size.add(margin))) {
        this.active = true;
        this.interactingPassengers.push(passenger);
        this.oninteract(passenger);
      } else if (this.interactingPassengers.indexOf(passenger) != -1) {
        this.interactingPassengers.splice(this.interactingPassengers.indexOf(passenger), 1);
        this.onleave(passenger);
      }
    }
  }

  oninteract(passenger) { }
  onleave(passenger) { }
}

class Map extends Interactable {
  constructor(p) {
    super(p);
  }

  oninteract(passenger) {
    if (passenger == player) subway.openMap();
  }

  onleave(passenger) {
    if (passenger == player) subway.closeMap();
  }
}

class VendingMachine extends Interactable {
  constructor() {

  }
}
