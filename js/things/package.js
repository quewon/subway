class Package extends PhysicalThing {
  constructor(p) {
    super(p);
    p = p || {};

    this.tag = "package";
    this.size = new Vector2(10, 10);
    // this.weight = .3;
    // this.frictionFactor = 1.03;

    this.hoverTimer = 0;
    this.hoverAlphaTime = 200;
    this.hover = false;
    this.active = false;
    this.prevActive = false;
    this.linkedToPlayer = true;

    //

    context.font = "13px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    let measurements = context.measureText("This is a package for:");
    let lineHeight = measurements.fontBoundingBoxDescent + 5;
    let w = measurements.width + 20;
    let h = lineHeight * 5;

    this.lineHeight = lineHeight;
    this.infoBoxSize = new Vector2(measurements.width, lineHeight * 3);
    this.infoBoxPadding = new Vector2(lineHeight, lineHeight);

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
  }

  find() {
    this.found = true;
    this.linkedToPlayer = false;
    this.isPhysical = false;
  }

  update(dt) {
    this.direction = new Vector2();
    this.hover = false;

    if (!this.found) {
      if (player && player.scene == this.scene && player.closestPackage == this) {
        this.hover = true;

        if (player.input.sqrMagnitude() == 0) {
          this.hoverTimer++;
        } else {
          this.hoverTimer = 0;
        }

        if (player.interactingThisFrame) {
          if (this.prevActive) {
            this.active = false;
            sounds.sfx["read note"].play();
            // this.linkedToPlayer = false;
          } else {
            this.active = true;
            sounds.sfx["read note"].play();
            // this.linkedToPlayer = true;
          }
        }
      } else {
        this.hoverTimer = 0;
        this.active = false;
      }

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
      this.position = this.position.lerp(this.recipient.position, dt/1000);
      if (this.position.add(this.size.div(2)).distanceTo(this.recipient.position) <= this.recipient.radius + this.recipient.avoidanceRadius) {
        this.exit();
        this.recipient.fulfillDelivery();
      }
    }

    this.prevActive = this.active;
  }

  followPlayer(dt) {
    let position = this.position.add(this.size.div(2));
    let distance = Math.max(position.distanceTo(player.position), .01);
    // let radius = this.radius + this.avoidanceRadius + player.radius;

    let direction = player.position.sub(position).normalize();

    this.direction = direction.mul(distance * dt/400);
  }

  draw() {
    context.fillStyle = LINES_COLOR;
    context.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);

    if (this.linkedToPlayer && player.scene == this.scene) {
      context.strokeStyle = GROUP_LINES_COLOR;
      let position = this.position.add(this.size.div(2));
      context.beginPath();
      context.moveTo(position.x, position.y);
      context.lineTo(player.position.x, player.position.y);
      context.stroke();
    }
  }

  drawUI() {
    if (this.active) {
      this.drawInfo();
    }

    if (this.hover) {
      context.globalAlpha = Math.max(0, (this.hoverAlphaTime-this.hoverTimer)/this.hoverAlphaTime);

      context.fillStyle = LINES_COLOR;
      context.font = "13px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText("[space] note", this.position.x + this.size.x/2, this.position.y);

      context.globalAlpha = 1;
    }
  }

  drawInfo() {
    let width = this.infoBoxSize.x + this.infoBoxPadding.x * 2;
    let height = this.infoBoxSize.y + this.infoBoxPadding.y * 2;

    let rx = this.position.x + this.size.x * 2;
    let ry = this.position.y - height - this.size.y;

    context.strokeStyle = LINES_COLOR;
    context.beginPath();
    context.moveTo(this.position.x + this.size.x, this.position.y);
    context.lineTo(rx, ry + height);
    context.stroke();

    context.beginPath();
    context.rect(rx, ry, width, height);

    context.fillStyle = BACKGROUND_COLOR;
    context.fill();

    context.setLineDash([3]);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = LINES_COLOR;
    context.font = "13px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";

    let x = rx + this.infoBoxSize.x/2 + this.infoBoxPadding.x;
    let y = ry + this.infoBoxPadding.y;

    context.fillText("This is a package for:", x, y);

    y += this.lineHeight;

    context.fillText(this.recipient.name.toUpperCase(), x, y);

    y += this.lineHeight;

    let stationName = this.recipient.home.name;
    stationName = stationName[0].toUpperCase() + stationName.substring(1);
    context.fillText("@ "+stationName+" Station", x, y);
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
        if (thing == player && this.package.linkedToPlayer && this.package.scene == player.scene) {
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
    console.log("yay!!");
  }
}
