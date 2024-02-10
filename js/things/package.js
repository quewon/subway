class Package extends PhysicalThing {
  constructor(p) {
    super(p);
    p = p || {};

    this.tag = "package";
    this.linkedToPlayer = true;

    //

    this.createRecipient();
  }

  createRecipient() {
    let ri = RECIPIENT_NAMES.length * Math.random() | 0;
    let recipientName = RECIPIENT_NAMES[ri];
    RECIPIENT_NAMES.splice(ri, 1);

    if (RECIPIENT_NAMES.length == 0) {
      restockRecipientNames();
    }

    let randomStations = [];
    for (let station of subway.stations) {
      if (this.scene.station == station) continue;
      randomStations.push(station);
    }
    let randomStation = randomStations[randomStations.length * Math.random() | 0];

    this.recipient = new Recipient({ scene: randomStation.scene, isTraveling: false });
    this.recipient.name = this.recipient.label = recipientName;

    this.recipient.package = this;

    this.found = false;

    //

    context.font = "10px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    let measurements = context.measureText(this.recipient.home.name);
    let lineHeight = measurements.fontBoundingBoxDescent;

    this.lineHeight = lineHeight;
    this.infoBoxSize = new Vector2(measurements.width, lineHeight);
    this.infoBoxPadding = new Vector2(3, 3);

    this.size = this.infoBoxSize.add(this.infoBoxPadding);
  }

  find() {
    this.found = true;
    this.linkedToPlayer = false;
  }

  update(dt) {
    this.direction = new Vector2();

    if (!this.found) {
      if (player && this.linkedToPlayer) {
        if (this.scene != player.scene) {
          this.exit(this.scene);
          this.enter(player.scene);
          this.position = player.position.add(new Vector2(-player.direction.x * 10, 0));
          this.previousConfiner = player.previousConfiner;
        }
        if (!circleRect(player.position, player.radius + player.avoidanceRadius, this.position, this.size)) {
          this.followPlayer(dt);
        }
      }

      this.move(dt);
    }

    if (this.found) {
      this.position = this.position.lerp(this.recipient.position.sub(this.size.div(2)), dt/1000);
    }
  }

  followPlayer(dt) {
    let position = this.position.add(this.size.div(2));
    let distance = Math.max(position.distanceTo(player.position), .01);
    // let radius = this.radius + this.avoidanceRadius + player.radius;

    let direction = player.position.sub(position).normalize();

    this.direction = direction.mul(distance * dt/400);
  }

  draw() {
    if (this.linkedToPlayer && player.scene == this.scene) {
      context.strokeStyle = GROUP_LINES_COLOR;
      let position = this.position.add(this.size.div(2));
      context.beginPath();
      context.moveTo(position.x, position.y);
      context.lineTo(player.position.x, player.position.y);
      context.stroke();
    }

    context.fillStyle = BACKGROUND_COLOR;
    context.strokeStyle = LINES_COLOR;
    context.beginPath();
    context.rect(this.position.x, this.position.y, this.size.x, this.size.y);
    context.fill();
    context.stroke();

    context.fillStyle = LINES_COLOR;
    context.font = "10px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(this.recipient.home.name, this.position.x + this.infoBoxPadding.x/2, this.position.y + this.infoBoxPadding.y/2);
  }
}

class Recipient extends Passenger {
  constructor(p) {
    super(p);
  }

  setDestination() {
    this.destination = this.home;
  }

  avoidPhysicalThings() {
    let desiredDirection = new Vector2();

    for (let thing of this.scene.things) {
      if (!thing.isPhysical || thing == this || thing == this.package) continue;

      let position;
      let radius;
      if (!thing.radius) {
        position = thing.position.add(thing.size.div(2));
        radius = Math.max(thing.size.x, thing.size.y)/2;
      } else {
        position = thing.position;
        radius = thing.radius;
      }

      let distance = Math.max(this.position.distanceTo(position), .01);

      radius = this.radius + this.avoidanceRadius + radius;
      if (distance <= radius) {
        if (!this.package.found && thing == player && this.package.linkedToPlayer) {
          this.package.find();
        }

        let direction = position.sub(this.position).jiggle(distance).normalize();

        let avoidStrength = radius/distance;

        if (this.group && thing.group != this.group) {
          avoidStrength *= 5;
        }

        desiredDirection = desiredDirection.sub(direction.mul(avoidStrength));
      }
    }

    return desiredDirection.normalize();
  }

  fulfillDelivery() {
    this.package.exit();
    this.package = null;

    console.log("yay!!");
  }
}
