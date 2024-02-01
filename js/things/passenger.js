class Passenger extends Thing {
  constructor(p) {
    super(p);

    p = p || {};
    this.tag = "passenger";
    this.group = p.group || null;

    this.colorOrigin = p.color || new RGBA(30, 30, 30);
    this.fill = p.fill == null ? false : p.fill;
    this.label = p.label || null;

    this.radius = p.radius == null ? 5 : p.radius;
    this.avoidanceRadius = p.avoidanceRadius == null ? Math.random() * 15 + 5 : p.avoidanceRadius;
    this.speed = p.speed == null ? 1 + Math.random() * 4 : p.speed;
    this.direction = new Vector2();
    this.velocity = new Vector2();

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

  draw() {
    this.drawSelf();
    this.drawAvoidanceRadius();

    if (this.group) {
      this.drawGroupLines();
    }
  }

  drawSelf() {
    let color = new RGBA(this.colorOrigin);

    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);

    if (this.collisionsCounter > 0) {
      this.collisionsCounter--;

      color.r += this.collisionsCounter/60;
      color.g += this.collisionsCounter/300;
      color.b += this.collisionsCounter/600;
    }

    context.fillStyle = color.toString();
    if (this.fill) {
      context.fill();
    } else {
      context.strokeStyle = color.toString();
      context.stroke();
    }

    if (this.label) {
      context.font = "12px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(this.label, this.position.x, this.position.y + this.radius);
    }

    this.color = color;
  }

  drawAvoidanceRadius() {
    let color = this.color;

    context.strokeStyle = new RGBA(color.r, color.g, color.b, .05).toString();
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius + this.avoidanceRadius, 0, Math.PI * 2);
    context.stroke();
  }

  drawGroupLines() {
    let color = new RGBA(200,20,10,.3);
    context.strokeStyle = color.toString();

    for (let passenger of this.group.passengers) {
      if (passenger == this || passenger.scene != this.scene) continue;

      let distance = Math.max(this.position.distanceTo(passenger.position), .01);
      let radius = this.radius + this.avoidanceRadius + passenger.radius;

      if (distance < radius) {
        let direction = passenger.position.sub(this.position).jiggle(1).normalize();
        // let p1 = new Vector2(this.position.x, this.position.y).add(direction.mul(this.radius));
        // let p2 = new Vector2(passenger.position.x, passenger.position.y).sub(direction.mul(passenger.radius));
        let p1 = this.position;
        let p2 = passenger.position;

        context.beginPath();
        context.moveTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
      }
    }
  }

  update(dt) {
    this.direction = new Vector2();
    this.avoidPassengers(dt);
    if (this.group) {
      this.followGroup(dt);
    }
    this.move(dt);
  }

  move(dt) {
    this.velocity = this.velocity.div(1.1);
    this.velocity = this.velocity.add(this.direction.mul(this.speed * dt/1000));
    this.position = this.position.add(this.velocity);

    this.collideWithPassengers(dt);
  }

  avoidPassengers(dt) {
    if (this.avoidanceRadius == 0) return;

    let desiredDirection = new Vector2();

    for (let passenger of this.scene.things) {
      if (passenger.tag != "passenger" || passenger == this) continue;

      let distance = Math.max(this.position.distanceTo(passenger.position), .01);
      let radius = this.radius + this.avoidanceRadius + passenger.radius;
      if (distance <= radius) {
        let direction = passenger.position.sub(this.position).jiggle(distance).normalize();

        let avoidStrength = radius/distance;

        if (this.group && passenger.group != this.group) {
          avoidStrength *= 5;
        }

        desiredDirection = desiredDirection.sub(direction.mul(avoidStrength));
      }
    }

    desiredDirection = desiredDirection.normalize();

    let steerStrength = .3 * dt/10;

    this.direction = this.direction
      .add(desiredDirection.mul(steerStrength))
      .normalize();
  }

  followGroup(dt) {
    let desiredDirection = new Vector2();

    for (let passenger of this.group.passengers) {
      if (passenger == this || passenger.scene != this.scene) continue;

      let distance = Math.max(this.position.distanceTo(passenger.position), .01);
      let radius = this.radius + this.avoidanceRadius + passenger.radius;
      if (distance > radius) {
        let direction = passenger.position.sub(this.position).jiggle(1).normalize();
        let followStrength = distance;
        desiredDirection = desiredDirection.add(direction.mul(followStrength));
      }
    }

    desiredDirection = desiredDirection.normalize();

    let steerStrength = this.group.strength * dt/10;

    this.direction = this.direction
      .add(desiredDirection.mul(steerStrength))
      .normalize();
  }

  collideWithPassengers(dt) {
    let force = new Vector2();

    for (let passenger of this.scene.things) {
      if (passenger.tag != "passenger" || passenger == this) continue;

      let distance = this.position.distanceTo(passenger.position);
      let radii = this.radius + passenger.radius;
      if (distance <= radii) { // colliding
        let direction = passenger.position.sub(this.position).normalize();
        direction = direction.jiggle();

        let pushStrength = radii/Math.max(distance, .1) * dt/100;
        pushStrength = Math.min(pushStrength, 1);

        force = force.sub(direction.mul(pushStrength));

        this.collisionsCounter++;
        passenger.collisionsCounter++;
      }
    }

    this.applyForce(force);
  }

  applyForce(force) {
    this.velocity = this.velocity.add(force);
  }
}

class Group {
  constructor(passengers) {
    this.passengers = passengers || [];
    this.strength = .3;
    for (let passenger of this.passengers) {
      passenger.group = this;
    }
  }

  draw() {

  }

  update(dt) {

  }
}
