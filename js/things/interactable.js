class Interactable extends Thing {
  constructor(p) {
    super(p);
    p = p || {};

    this.tag = "interactable";
    this.promptText = "interact";

    this.color = new RGBA(255, 0, 0, 1);
    this.size = p.size || new Vector2(10, 10);
    this.position = this.position.sub(new Vector2(this.size.x/2, this.size.y/2));

    this.hover = false;
    this.active = false;
    this.toggled = false;
    this.hoveringPassengers = [];
    this.interactingPassengers = [];
  }

  draw() {
    this.drawBox();
    this.drawLabel();
  }

  drawBox() {
    context.fillStyle = context.strokeStyle = this.color.toString();
    context.beginPath();
    context.rect(this.position.x, this.position.y, this.size.x, this.size.y);
    if (this.toggled) {
      context.fill();
    } else {
      context.stroke();
    }
  }

  drawIcon() {
    let icon = this.iconImage;
    let width = icon.width;
    let height = icon.height;
    context.drawImage(icon, this.position.x + this.size.x/2 - width/2, this.position.y + this.size.y/2 - height/2);
  }

  drawPrompt() {
    if (player && player.scene == this.scene && this.hoveringPassengers.indexOf(player) != -1) {
      context.fillStyle = LINES_COLOR;
      context.font = "13px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";

      context.strokeStyle = BACKGROUND_COLOR;
      context.lineWidth = 3;
      context.strokeText("[space] "+this.promptText, this.position.x + this.size.x/2, this.position.y);
      context.lineWidth = 1;

      context.fillText("[space] "+this.promptText, this.position.x + this.size.x/2, this.position.y);
    }
  }

  drawUI() {
    this.drawPrompt();
  }

  update(dt) {
    this.hover = false;
    this.active = false;

    for (let passenger of this.scene.things) {
      if (passenger.tag != "passenger") continue;

      let margin = new Vector2(2, 2);
      let collides = circleRect(passenger.position, passenger.radius, this.position.sub(new Vector2(margin.x/2, margin.y/2)), this.size.add(margin));
      let index = this.hoveringPassengers.indexOf(passenger);

      if (collides) {
        this.hover = true;
        if (index == -1) {
          this.hoveringPassengers.push(passenger);
          this.onhover(passenger);
        }

        let interactIndex = this.interactingPassengers.indexOf(passenger);
        if (passenger.interacting) {
          this.active = true;
          if (interactIndex == -1) {
            this.interactingPassengers.push(passenger);
            this.oninteract(passenger);
            this.toggled = !this.toggled;
          }
        } else if (interactIndex != -1) {
          this.interactingPassengers.splice(interactIndex, 1);
          this.onuninteract(passenger);
        }
      } else if (index != -1) {
        this.hoveringPassengers.splice(index, 1);
        this.onleave(passenger);
        this.toggled = false;

        let interactIndex = this.interactingPassengers.indexOf(passenger);
        if (interactIndex != -1) {
          this.interactingPassengers.splice(interactIndex, 1);
          this.onuninteract(passenger);
        }
      }
    }
  }

  onhover(passenger) { }
  onleave(passenger) { }
  oninteract(passenger) { }
  onuninteract(passenger) { }
}

class Map extends Interactable {
  constructor(p) {
    p = p || {};
    p.size = new Vector2(30, 30);

    super(p);

    this.color = new RGBA(255, 150, 150, 1);

    this.promptText = "map";
    this.iconImage = images.map.star;
  }

  draw() {
    this.drawBox();
    if (!this.toggled) this.drawIcon();
  }

  oninteract(passenger) {
    if (passenger == player) {
      if (subway.mapOpen) {
        subway.closeMap();
        passenger.unpushable = false;
      } else {
        subway.openMap();
        passenger.unpushable = true;
      }
    }
  }

  onleave(passenger) {
    if (passenger == player && subway.mapOpen) {
      subway.closeMap();
      passenger.unpushable = false;
    }
  }
}

class TrainTracker extends Interactable {
  constructor(p) {
    p = p || {};
    p.size = new Vector2(18, 30);
    super(p);

    this.line = p.line;
    this.direction = p.direction;
    this.trackerOpen = false;

    this.color = this.line.color;

    this.promptText = "track";
    this.iconImage = images.icons.train;

    //

    this.this_stop = this.scene.station;
    this.prev_stop = this.line.getPreviousStop(this.this_stop, this.direction);
    this.next_stop = this.line.getNextStop(this.this_stop, this.direction);
    this.stops = [
      this.prev_stop,
      this.this_stop,
      this.next_stop
    ];

    let names = [this.this_stop.name];
    if (this.prev_stop) names.push(this.prev_stop.name);
    if (this.next_stop) names.push(this.next_stop.name);

    let longestName;
    let longestNameLength = 0;
    for (let name of names) {
      if (name.length > longestNameLength) {
        longestName = name;
        longestNameLength = name.length;
      }
    }
    this.longestName = longestName;
  }

  draw() {
    this.drawBox();
    if (!this.toggled) this.drawIcon();
  }

  drawUI() {
    this.drawPrompt();
    if (this.trackerOpen) this.drawTracker();
  }

  drawTracker() {
    context.font = "13px monospace";
    context.textAlign = "center";
    context.textBaseline = "top";

    let measurement = context.measureText(this.longestName);
    let textWidth = measurement.width + 20;
    let textHeight = measurement.fontBoundingBoxDescent;

    let width = textWidth * 3;
    let height = textHeight * 7;

    context.beginPath();
    context.rect(-width/2, -height/2, width, height);
    context.fillStyle = BACKGROUND_COLOR;
    context.fill();
    context.strokeStyle = LINES_COLOR;
    context.stroke();

    let y = -height/2 + textHeight * 5;

    context.fillStyle = LINES_COLOR;
    let a = new Vector2(-width/2 + 10, y-5);
    let b = new Vector2( width/2 - 10, y-5);
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
    context.fillText(subway.getTimeString(), 0, -height/2 + textHeight);

    for (let i=0; i<this.stops.length; i++) {
      let station = this.stops[i];
      if (station) {
        if (station == this.this_stop || station == this.next_stop) {
          context.font = "bold 13px sans-serif";
        } else {
          context.font = "13px sans-serif";
        }

        if (station == this.next_stop) {
          context.fillStyle = this.line.color.toString();
        } else {
          context.fillStyle = LINES_COLOR;
        }

        let x = -width/2 + textWidth * i + textWidth/2;
        context.fillText(station.name, x, y);

        context.beginPath();
        context.arc(x, y-5, 3, 0, Math.PI*2);
        context.fill();
      }
    }

    a = new Vector2(-width/2 + textWidth/2, a.y);
    b = new Vector2(-width/2 + textWidth * 2.5, b.y);

    let img = images.icons["rtrain"];
    for (let train of this.line.trains) {
      let data = train.currentData;
      if (!data.active) continue;

      let t = null;
      if (data.this_stop == this.prev_stop && data.next_stop == this.this_stop && data.stopped) {
        t = 0;
      } else if (data.this_stop == this.this_stop && data.prev_stop == this.prev_stop) {
        t = data.stopped ? .5 : lerp(0, .5, data.t);
      } else if (data.this_stop == this.next_stop && data.prev_stop == this.this_stop) {
        t = data.stopped ? 1 : lerp(.5, 1, data.t);
      }

      if (t != null) {
        let trainPosition = a.lerp(b, t);
        context.drawImage(img, trainPosition.x - img.width/2, trainPosition.y - img.height);
      }
    }
  }

  oninteract(passenger) {
    if (passenger == player) {
      this.trackerOpen = !this.toggled;
      passenger.unpushable = this.trackerOpen;
    }
  }

  onleave(passenger) {
    if (passenger == player && this.trackerOpen) {
      this.trackerOpen = false;
      passenger.unpushable = false;
    }
  }
}

class VendingMachine extends Interactable {
  constructor() {

  }
}
