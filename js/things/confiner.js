class RectConfiner {
  constructor(position, size) {
    this.shape = "rect";
    this.position = position || new Vector2();
    this.size = size || new Vector2(300, 400);
    this.floorColor = BACKGROUND_COLOR;
    this.wallColor = LINES_COLOR;

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

  thingConfined(thing, offset) {
    offset = offset || new Vector2();

    if (thing.radius) {
      let cor = circleOutsideRect(thing.position.add(offset), thing.radius, this.position, this.size);
      if (cor.direction.x == 0 && cor.direction.y == 0) {
        return true;
      }
    } else {
      let a = this.position;
      let as = this.size;
      let b = thing.position.add(offset);
      let bs = thing.size;

      if (
        b.x >= a.x &&
        b.x + bs.x <= a.x + as.x &&
        b.y >= a.y &&
        b.y + bs.y <= a.y + as.y
      ) {
        return true;
      }
    }

    return this.thingInOpenDoor(thing, offset);
  }

  thingInOpenDoor(thing, offset) {
    offset = offset || new Vector2();

    for (let door of this.doors) {
      if (door.open && door.thingCollides(thing, offset)) {
        return true;
      }
    }

    return false;
  }

  confine(dt, thing) {
    let force = new Vector2();

    let position;
    let radius;
    if (thing.radius) {
      position = thing.position;
      radius = thing.radius;
    } else {
      position = thing.position.add(thing.size.div(2));
      radius = Math.max(thing.size.x, thing.size.y)/2;
    }

    let cor = circleOutsideRect(position, radius, this.position, this.size);

    force.x += cor.direction.x * Math.max(cor.distance.x/10, 1);
    force.y += cor.direction.y * Math.max(cor.distance.y/10, 1);

    thing.applyForce(force.mul(dt/500 * thing.speed));
  }

  resolveVisitor(thing) {
    if (thing.linkedScene && thing.linkedScene == this.scene) {
      let collidedDoor;
      for (let door of this.doors) {
        if (door.thingJustCollides(thing, thing.linkOffset)) {
          collidedDoor = door;
          break;
        }
      }

      if (collidedDoor) {
        let direction = -collidedDoor.relativePosition.x;
        if (Math.sign(thing.direction.x) == Math.sign(direction)) {
          thing.moveToLinkedScene();
          thing.previousConfiner = this;
        }
      }
    }
  }

  containsMouse(offset) {
    return pointInRect(mouse.gamePosition.sub(offset), this.position, this.size);
  }
}

class CircleConfiner {
  constructor(position, radius) {
    this.shape = "circle";
    this.position = position || new Vector2();
    this.radius = radius || 100;
    this.floorColor = BACKGROUND_COLOR;
    this.wallColor = LINES_COLOR;
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
    context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);

    context.lineWidth = 2;
    context.strokeStyle = this.wallColor;
    context.stroke();
    context.lineWidth = 1;
  }

  drawFloors() {
    context.fillStyle = this.floorColor;
    
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
    context.fill();
  }

  drawDoors() { }

  thingConfined(thing, offset) {
    offset = offset || new Vector2();

    if (thing.radius) {
      let pc = thing.position.add(offset);
      let pr = thing.radius;

      let c = this.position;
      let r = this.radius;

      if (pc.distanceTo(c) >= r - pr) {
        return false;
      }
    } else {
      let position = thing.position.add(offset);
      let points = [
        position,
        position.add(new Vector2(thing.size.x, 0)),
        position.add(thing.size),
        position.add(new Vector2(0, thing.size.y))
      ];
      for (let point of points) {
        if (!pointInCircle(point, this.position, this.radius)) {
          return false;
        }
      }
    }

    return true;
  }

  confine(dt, thing) {
    let force = new Vector2();

    let position;
    if (thing.radius) {
      position = thing.position;
    } else {
      position = thing.position.add(thing.size.div(2));
    }

    let direction = this.position.sub(position).normalize();
    let distance = this.position.distanceTo(position);

    force.x += direction.x * distance/50;
    force.y += direction.y * distance/50;

    thing.applyForce(force.mul(dt/500 * thing.speed));
  }

  containsMouse(offset) {
    return pointInCircle(mouse.gamePosition.sub(offset), this.position, this.radius);
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

  thingJustCollides(thing, offset) {
    offset = offset || new Vector2();

    if (thing.radius) {
      let passenger = thing;
      return circleRect(passenger.position.add(offset), passenger.radius, this.relativePosition.add(this.confiner.position), this.size);
    } else {
      return rectRect(thing.position.add(offset), thing.size, this.relativePosition.add(this.confiner.position), this.size);
    }
  }

  thingCollides(thing, offset) {
    offset = offset || new Vector2();

    let collides = this.thingJustCollides(thing, offset);
    if (collides && this.linkedScene) {
      thing.linkToScene(this.linkedScene, this, this.linkOffset);
    }

    return collides;
  }

  draw() {
    let position = this.relativePosition.add(this.confiner.position);

    context.fillStyle = BACKGROUND_COLOR;
    if (this.open) {
      context.fillRect(position.x, position.y, this.size.x, this.size.y);
    } else {
      context.fillRect(position.x+1.25, position.y, this.size.x-2.7, this.size.y);
    }

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
