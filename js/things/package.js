class Package extends Trinket {
  constructor(p) {
    super(p);
    p = p || {};

    this.tag = "package";
    this.size = new Vector2(15, 15);

    //

    this.createRecipient(p.recipientStation);

    this.linkHowl = sounds.sfx["pick up box"];
    this.unlinkHowl = sounds.sfx["drop box"];
  }

  find() {
    this.found = true;
    this.deselect();
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
        if (this.previousConfiner) {
            if (this.size) {
                player.playerDestination = this.position.add(this.size.div(2));
            } else {
                player.playerDestination = this.position;
            }
            player.playerDestinationScene = this.scene;
            player.playerDestinationConfiner = this.previousConfiner;
        }
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
    let recipientName = RECIPIENT_NAMES.splice(RECIPIENT_NAMES.length * Math.random() | 0, 1)[0];
    if (RECIPIENT_NAMES.length == 0) restockRecipientNames();

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

    let prompts = ["in case of loss, please return to:", "this is a package for:", "find me!"];
    this.prompt = prompts[prompts.length * Math.random() | 0];

    context.font = "11px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    let measurements = context.measureText(this.prompt);
    let lineHeight = measurements.fontBoundingBoxDescent + 5;

    this.lineHeight = lineHeight;
    this.infoBoxSize = new Vector2(measurements.width, lineHeight * 3 - 5);
    if (this.recipient.home.scene.isOgygiaScene) {
      this.infoBoxSize = new Vector2(measurements.width, lineHeight * 2 - 5);
    }
    this.infoBoxPadding = new Vector2(lineHeight/2, lineHeight/2);
  }

  draw() {
    this.drawLink();
    this.drawSelf();
  }

  drawSelf() {
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

  drawLabels() {
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

    context.fillText(this.prompt, x, y);

    y += this.lineHeight;

    context.fillText(this.recipient.name.toUpperCase(), x, y);

    let stationName = this.recipient.home.name;
    if (stationName != "") {
      y += this.lineHeight;
      stationName = stationName[0].toUpperCase() + stationName.slice(1);
      context.fillText("@ "+stationName, x, y);
    }
  }
}

class Recipient extends Passenger {
  constructor(p) {
    super(p);
  }

  deselect() {
    this.resetPlayer();
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

    let coin = new Coin({
      scene: this.scene,
      position: this.position,
      velocity: force
    });
    coin.previousConfiner = this.previousConfiner;

    this.package.exit();
    this.package = null;

    let potentialPassengers = [];
    for (let line of subway.lines) {
      for (let station of line.stations) {
        if (station.scene == this.scene) continue;
        for (let thing of station.scene.things) {
          if (thing != player && thing.tag == "passenger") potentialPassengers.push(thing);
        }
      }
      for (let train of line.trains) {
        if (train.scene == this.scene) continue;
        for (let thing of train.scene.things) {
          if (thing != player && thing.tag == "passenger") potentialPassengers.push(thing);
        }
      }
    }
    let a = potentialPassengers[potentialPassengers.length * Math.random() | 0];
    new Package({ scene: a.scene });
  }
}

class Coin extends Trinket {
  constructor(p) {
    p = p || {};
    super(p);

    this.tag = "coin";
    this.radius = 10;
    this.linkHowl = sounds["sfx"]["coin bump"];

    if (player && this.inSameScreen(player)) {
      let howl = sounds["sfx"]["coin toss"];
      let id = howl.play();
      applySpacialAudio(howl, id, this.getGlobalPosition(), player.getGlobalPosition(), 200);
    }
  }

  drawSelf() {
    if (this.ghost) {
        context.strokeStyle = OGYGIA_COLOR;
    } else if (this.linkedPassenger) {
        context.strokeStyle = this.linkedPassenger.color.toString();
    } else {
        context.strokeStyle = LINES_COLOR;
    }
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
    if (player.wantsToLinkTo == this) {
      context.fillStyle = context.strokeStyle = player.color.toString();
      context.fill();
    }
    context.stroke();

    if (player.wantsToLinkTo != this) {
      context.fillStyle = context.strokeStyle;
      context.font = "11px serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("100", this.position.x, this.position.y);
    }
  }
}