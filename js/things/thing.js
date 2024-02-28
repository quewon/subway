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

  updateInteractionState() {
    this.hovered = false;

    if (this.mouseCollides()) {
      document.body.classList.add("pointer");
      
      this.hovered = true;

      if (mouse.downThisFrame && !this.selected) {
        this.select();
      }
    }
  }

  mouseCollides() {
    if (this == player) return false;

    let covered = this.scene.tag == "train" && !this.scene.linkedScene && this.scene != subway.currentScene;
    if (player && !covered && this.inSameScreen(player)) {
      let position = this.getScreenPosition();
      let m = mouse.gamePosition;

      if (position && m) {
        if (this.radius) {
          return pointInCircle(m, position, this.radius);
        } else if (this.size) {
          return m.x >= position.x && m.y >= position.y && m.x <= position.x + this.size.x && m.y <= position.y + this.size.y;
        }
      }
    }
  }

  select() {
    this.selected = true;
  }

  exit() {
    this.scene.things.splice(this.scene.things.indexOf(this), 1);
    this.scene = null;
  }

  enter(scene) {
    if (scene == this.scene) return;

    this.scene = scene;
    this.scene.things.push(this);
  }

  drawLabels() {}
  drawUI() {}

  getGlobalPosition() {
    let scene = this.scene;

    if (scene.tag == "station") {
      return this.position;
    } else if (scene.tag == "train") {
      let stationScene = scene.getNearbyStop().scene;
      let stationOffset = stationScene.getTrainPosition(scene.train).add(stationScene.getTrainTravelVector(scene.train));
      return this.position.add(stationOffset);
    }
  }

  getScreenPosition() {
    return this.position.add(this.scene.getOffset());
  }

  inSameScreen(thing) {
    return this.scene.inSameScreen(thing.scene);
  }

  isAudibleTo(thing) {
    return this.scene.isAudibleTo(thing.scene);
  }

  hasPathTo(thing) {
    return this.scene.hasPathTo(thing.scene);
  }
}

class PhysicalThing extends Thing {
  constructor(p) {
    super(p);

    p = p || {};
    this.isPhysical = true;
    this.group = p.group || null;

    this.speed = p.speed == null ? 2 + Math.random() * 4 : p.speed;
    this.direction = p.direction || new Vector2();
    this.velocity = p.velocity || new Vector2();
    this.weight = p.weight || 1;
    this.frictionFactor = p.frictionFactor || 1.1;
    this.unpushable = p.unpushable || false;
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
    if (this.ghost) {
      let contained = false;
      if (this.radius) {
        contained = this.position.distanceTo(this.ghost.position) <= this.ghost.radius - this.radius;
      } else if (this.size) {
        let position = this.position;
        let points = [
          position,
          position.add(new Vector2(this.size.x, 0)),
          position.add(this.size),
          position.add(new Vector2(0, this.size.y))
        ];
        for (let point of points) {
          if (!pointInCircle(point, this.position, this.radius)) {
            contained = false;
            break;
          } else {
            contained = true;
          }
        }
      }
      if (!contained) {
        let center = this.position;
        if (this.size) center = center.add(this.size.div(2));
        this.direction = this.ghost.position.sub(center).normalize();
      }
    }

    this.velocity = this.velocity.div(this.frictionFactor);
    this.velocity = this.velocity.add(this.direction.mul(this.speed * dt/1000));
    this.position = this.position.add(this.velocity);

    if (!this.unpushable) this.collideWithThings(dt);
  }

  collideWithThings(dt) {
    let force = new Vector2();

    for (let thing of this.scene.things) {
      if (!thing.isPhysical || thing == this) continue;
      if (thing == this.ghost) continue;

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
      } else if (this.collisionsCounter > 0 && !this.dontCoolDown) {
        this.collisionsCounter--;
      }
    }

    force = force.div(this.weight);

    this.applyForce(force);
  }

  applyForce(force) {
    this.velocity = this.velocity.add(force);
  }
}