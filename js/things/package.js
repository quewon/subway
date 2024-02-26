class Package extends Trinket {
  constructor(p) {
    super(p);
    p = p || {};

    this.tag = "package";

    //

    this.createRecipient(p.recipientStation);
  }

  find() {
    this.found = true;
    this.linkedPassenger = null;
  }

  select() {
    if (this.found) return;
    if (this.linkedPassenger) {
      this.deselect();
    } else {
      if (player.wantsToLinkTo == this) {
        player.wantsToLinkTo = null;
      } else {
        player.wantsToLinkTo = this;
      }
    }
  }

  update(dt) {
    this.updateLink();
    if (!this.found) {
      this.followLink(dt);
    } else {
      this.position = this.position.lerp(this.recipient.position.sub(this.size.div(2)), dt/1000);
      if (circleRect(this.recipient.position, this.recipient.radius, this.position, this.size)) {
        this.recipient.fulfillDelivery();
        return;
      }
    }
    this.updateInteractionState();
  }

  createRecipient(station) {
    let ri = RECIPIENT_NAMES.length * Math.random() | 0;
    let recipientName = RECIPIENT_NAMES[ri];
    RECIPIENT_NAMES.splice(ri, 1);

    if (RECIPIENT_NAMES.length == 0) {
      restockRecipientNames();
    }

    if (!station) {
      let randomStations = [];
      for (let station of subway.stations) {
        if (this.scene.station == station) continue;
        randomStations.push(station);
      }
      station = randomStations[randomStations.length * Math.random() | 0];
    }

    this.recipient = new Recipient({ scene: station.scene, isTraveling: false });
    this.recipient.name = this.recipient.label = recipientName;

    this.recipient.package = this;

    this.found = false;

    //

    context.font = "11px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    let measurements = context.measureText("Wherever they may be");
    let lineHeight = measurements.fontBoundingBoxDescent + 5;

    this.lineHeight = lineHeight;
    this.infoBoxSize = new Vector2(measurements.width, lineHeight * 3 - 5);
    this.infoBoxPadding = new Vector2(lineHeight/2, lineHeight/2);
    this.size = new Vector2(15, 15);
  }

  draw() {
    this.drawLink();
    
    if (this.ghost) {
      context.strokeStyle = OGYGIA_COLOR;
    } else if (this.linkedPassenger) {
      context.strokeStyle = this.linkedPassenger.color.toString();
    } else {
      context.strokeStyle = LINES_COLOR;
    }

    context.beginPath();
    context.rect(this.position.x, this.position.y, this.size.x, this.size.y);
    context.moveTo(this.position.x, this.position.y);
    context.lineTo(this.position.x + this.size.x, this.position.y + this.size.y);
    context.moveTo(this.position.x + this.size.x, this.position.y);
    context.lineTo(this.position.x, this.position.y + this.size.y);

    if (player.wantsToLinkTo == this) {
      context.strokeStyle = context.fillStyle = player.ghost ? OGYGIA_COLOR : player.color.toString();
      context.fill();
    }

    context.stroke();
  }

  drawUI() {
    if (this.hovered) this.drawInfo();
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
    context.font = "11px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";

    let x = rx + this.infoBoxSize.x/2 + this.infoBoxPadding.x;
    let y = ry + this.infoBoxPadding.y;

    context.fillText("This is a package for:", x, y);

    y += this.lineHeight;

    context.fillText(this.recipient.name.toUpperCase(), x, y);

    y += this.lineHeight;

    let thirdline;

    let stationName = this.recipient.home.name;
    if (stationName) {
      stationName = stationName[0].toUpperCase() + stationName.substring(1);
      thirdline = "@ "+stationName+" Station";
    } else {
      thirdline = "Wherever they may be"
    }
    context.fillText(thirdline, x, y);
  }
}

class Recipient extends Passenger {
  constructor(p) {
    super(p);
  }

  deselect() {
    this.resetPlayer();

    // new

    if (this.package) this.label = this.name;
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
        if (this.package && !this.package.found && thing == this.package.linkedPassenger) {
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

    let force = new Vector2();
    if (this.package.linkedPassenger) {
      force = this.package.linkedPassenger.position.sub(this.position).div(100);
    }

    new Coin({
      scene: this.scene,
      position: this.position,
      velocity: force
    });

    this.package.exit();
    this.package = null;
    this.label = null;
  }
}

class Coin extends Trinket {
  constructor(p) {
    p = p || {};
    super(p);

    this.radius = 10;
    this.label = "coin";
  }

  draw() {
    this.drawLink();
    if (this.linkedPassenger) {
      context.strokeStyle = this.linkedPassenger.color.toString();
    } else {
      context.strokeStyle = LINES_COLOR;
    }
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
    context.stroke();
    if (player.wantsToLinkTo == this) {
      context.fillStyle = player.color.toString();
      context.fill();
    }

    if (this.hovered) {
      context.fillStyle = LINES_COLOR;
      context.font = "13px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";

      context.strokeStyle = BACKGROUND_COLOR;
      context.lineWidth = 3;
      context.strokeText(this.label, this.position.x, this.position.y + this.radius);
      context.lineWidth = 1;

      context.fillText(this.label, this.position.x, this.position.y + this.radius);
    }
  }
}