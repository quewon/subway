// rooms, portals

class Room extends Scene {
  constructor(name, width, height, exits) {
    super(name, width, height);

    this.exits = exits || {
      top: null,
      bottom: null,
      left: null,
      right: null
    };
  }

  draw() {
    this.camera();

    context.strokeStyle = "rgba(0,0,0,.3)";

    let x = -this.size.x/2;
    let y = -this.size.y/2;
    let w = this.size.x;
    let h = this.size.y;
    let o = 0.5; // line offset

    if (this.exits.top) {
      context.setLineDash([3]);
    }
    context.beginPath();
    context.moveTo(x-o, y);
    context.lineTo(x+w+o, y);
    context.stroke();

    if (this.exits.right) {
      context.setLineDash([3]);
    } else {
      context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x+w, y);
    context.lineTo(x+w, y+h+o);
    context.stroke();

    if (this.exits.bottom) {
      context.setLineDash([3]);
    } else {
      context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x+w, y+h);
    context.lineTo(x-o, y+h);
    context.stroke();

    if (this.exits.left) {
      context.setLineDash([3]);
    } else {
      context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x, y+h);
    context.lineTo(x, y);
    context.stroke();

    context.setLineDash([]);

    for (let thing of this.things) {
      thing.draw();
    }
  }

  update(dt) {
    for (let thing of this.things) {
      thing.update(dt);

      if (thing.tag == "passenger") {
        this.exitPassenger(thing);
      }
    }
  }

  exitPassenger(passenger) {
    let newScene = null;

    let px = passenger.position.x;
    let py = passenger.position.y;
    let pr = passenger.radius;
    let w = this.size.x/2;
    let h = this.size.y/2;

    if (this.exits.top && py < -h) {
      newScene = scenes[this.exits.top];
      passenger.position.y = newScene.size.y/2 - pr;
    } else if (this.exits.bottom && py > h) {
      newScene = scenes[this.exits.bottom];
      passenger.position.y = -newScene.size.y/2 + pr;
    }
    if (this.exits.left && px < -w) {
      newScene = scenes[this.exits.left];
      passenger.position.x = newScene.size.x/2 - pr;
    } else if (this.exits.right && px > w) {
      newScene = scenes[this.exits.right];
      passenger.position.x = -newScene.size.x/2 + pr;
    }

    if (newScene) {
      passenger.exit();
      passenger.enter(newScene);
    }
  }
}

class Portal extends Wall {
  constructor(p) {
    super(p);

    p = p || {};
    this.tag = "portal";
    this.color = p.color || new RGBA();
    this.destinationScene = p.destinationScene || null;
    this.destinationPoint = p.destinationPoint || null;
    this.destinationOffset = p.destinationOffset || null;
  }

  update(dt) {
    for (let passenger of this.scene.things) {
      if (passenger.tag != "passenger") continue;
      if (this.circleCollides(passenger.position, passenger.radius)) {
        this.transportPassenger(passenger);
      }
    }
  }

  draw() {
    context.setLineDash([3]);

    context.strokeStyle = this.color;
    context.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);

    context.setLineDash([]);
  }

  transportPassenger(passenger) {
    if (this.destinationScene) {
      let originalScene = passenger.scene;
      originalScene.things.splice(originalScene.things.indexOf(passenger), 1);

      this.destinationScene.things.push(passenger);

      passenger.scene = this.destinationScene;
    }

    if (this.destinationPoint) {
      passenger.position = new Vector2(this.destinationPoint.x, this.destinationPoint.y);
    }

    if (this.destinationOffset) {
      passenger.position = passenger.position.add(this.destinationOffset);
    }
  }
}
