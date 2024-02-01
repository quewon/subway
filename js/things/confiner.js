class RectConfiner {
  constructor(position, size) {
    this.shape = "rect";
    this.position = position || new Vector2();
    this.size = size || new Vector2(300, 400);
    this.floorColor = BACKGROUND_COLOR;
    this.wallColor = "black";

    this.doors = [];
  }

  getBounds() {
    return {
      position: this.position,
      size: this.size
    }
  }

  drawWalls() {
    context.lineWidth = 2;
    context.strokeStyle = this.wallColor;
    context.beginPath();
    context.rect(this.position.x, this.position.y, this.size.x, this.size.y);
    context.stroke();
    context.lineWidth = 1;
  }

  drawFloors() {
    context.fillStyle = this.floorColor;
    context.beginPath();
    context.rect(this.position.x, this.position.y, this.size.x, this.size.y);
    context.fill();
  }

  drawDoors() {
    for (let door of this.doors) {
      door.draw();
    }
  }

  passengerConfined(passenger, offset) {
    offset = offset || new Vector2();

    let cor = circleOutsideRect(passenger.position.add(offset), passenger.radius, this.position, this.size);
    if (cor.direction.x == 0 && cor.direction.y == 0) {
      return true;
    }
    return this.passengerInOpenDoor(passenger, offset);
  }

  passengerInOpenDoor(passenger, offset) {
    offset = offset || new Vector2();

    for (let door of this.doors) {
      if (door.open && door.passengerCollides(passenger, offset)) {
        return true;
      }
    }
    return false;
  }

  confine(dt, passenger) {
    let force = new Vector2();

    let cor = circleOutsideRect(passenger.position, passenger.radius, this.position, this.size);

    force.x += cor.direction.x * Math.max(cor.distance.x/10, 1);
    force.y += cor.direction.y * Math.max(cor.distance.y/10, 1);

    passenger.applyForce(force.mul(dt/100));
  }

  resolveVisitor(passenger) {
    if (passenger.linkedScene && passenger.linkedScene == this.scene) {
      passenger.moveToLinkedScene();
    }
  }
}

class CircleConfiner {
  constructor(position, radius) {
    this.shape = "circle";
    this.position = position || new Vector2();
    this.radius = radius || 100;
    this.floorColor = BACKGROUND_COLOR;
    this.wallColor = "black";
  }

  getBounds() {
    let radius2 = new Vector2(this.radius, this.radius);
    return {
      position: this.position.sub(radius2),
      size: radius2.mul(2)
    }
  }

  drawWalls() {
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI*2);

    context.lineWidth = 2;
    context.strokeStyle = this.wallColor;
    context.stroke();
    context.lineWidth = 1;
  }

  drawFloors() {
    context.fillStyle = this.floorColor;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI*2);
    context.fill();
  }

  drawDoors() { }

  passengerConfined(passenger, offset) {
    offset = offset || new Vector2();

    let pc = passenger.position.add(offset);
    let pr = passenger.radius;

    let c = this.position;
    let r = this.radius;

    if (pc.distanceTo(c) >= r - pr) {
      return false;
    }

    return true;
  }

  confine(dt, passenger) {
    let force = new Vector2();

    let pc = passenger.position;
    let pr = passenger.radius;

    let c = this.position;
    let r = this.radius;

    let direction = c.sub(pc).normalize();
    let distance = c.distanceTo(pc);

    force.x += direction.x * distance/50;
    force.y += direction.y * distance/50;

    passenger.applyForce(force.mul(dt/100));
  }
}

class Door {
  constructor(rectConfiner, relativeOffset, pixelOffset) {
    pixelOffset = pixelOffset || new Vector2();

    this.confiner = rectConfiner;
    this.open = false;

    let width = 40;
    this.size = new Vector2(5, 5);
    if (relativeOffset.x == 0 || relativeOffset.x == 1) {
      this.size.y = width;
    } else {
      this.size.x = width;
    }

    this.relativePosition = new Vector2(
      relativeOffset.x * this.confiner.size.x - this.size.x/2,
      relativeOffset.y * this.confiner.size.y - this.size.y/2
    ).add(pixelOffset);

    this.confiner.doors.push(this);

    this.linkedScene = null;
  }

  linkToScene(scene, offset) {
    this.linkedScene = scene;
    this.linkOffset = offset;
  }

  passengerCollides(passenger, offset) {
    offset = offset || new Vector2();
    let collides = circleRect(passenger.position.add(offset), passenger.radius, this.relativePosition.add(this.confiner.position), this.size);

    if (this.linkedScene && passenger.linkedScene != this.scene) {
      passenger.linkToScene(this.linkedScene, this, this.linkOffset);
    }

    return circleRect(passenger.position.add(offset), passenger.radius, this.relativePosition.add(this.confiner.position), this.size);
  }

  draw() {
    let position = this.relativePosition.add(this.confiner.position);

    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(position.x, position.y, this.size.x, this.size.y);

    if (!this.open) {
      context.strokeStyle = this.confiner.wallColor;
      context.setLineDash([2]);
      context.beginPath();
      context.moveTo(position.x + this.size.x/2, position.y);
      context.lineTo(position.x + this.size.x/2, position.y + this.size.y);
      context.stroke();
      context.setLineDash([]);
    }

    // context.fillStyle = new RGBA(255,0,0,.2).toString();
    // context.fillRect(position.x, position.y, this.size.x, this.size.y);
  }
}
