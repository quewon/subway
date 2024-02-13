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
    this.updateState();
  }

  updateState() {
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
            this.toggled = !this.toggled;
            this.oninteract(passenger);
          }
        } else if (interactIndex != -1) {
          this.interactingPassengers.splice(interactIndex, 1);
          this.onuninteract(passenger);
        }
      } else if (index != -1) {
        this.hoveringPassengers.splice(index, 1);
        this.toggled = false;
        this.onleave(passenger);

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

class LineMap extends Interactable {
  constructor(p) {
    p = p || {};
    p.size = new Vector2(30, 20);
    super(p);
    this.line = p.line;
    this.color = new RGBA(255, 150, 150, 1);
    this.position = new Vector2(0, -this.scene.confiners[0].size.y/2).sub(this.size.div(2));
    this.promptText = "map";
    this.iconImage = images.map.star;

    //

    let subway = this.line.subway;
    let radius = subway.mapStationRadius;
    context.font = subway.stationNameFont;
    context.textAlign = "left";
    context.textBaseline = "top";

    let min = new Vector2(Infinity, Infinity);
    let max = new Vector2(-Infinity, -Infinity);

    this.nodes = [];
    for (let i=0; i<this.line.stations.length; i++) {
      let station = this.line.stations[i];
      let position = new Vector2(i * subway.stationSpacing, 0);

      if (this.line.type == "circle" && i >= this.line.stations.length/2) {
        position = new Vector2(Math.ceil(this.line.stations.length - i) * subway.stationSpacing, subway.stationSpacing);
      }

      this.nodes.push({
        station: station,
        position: position,
      });

      let smin = new Vector2(position.x - radius, position.y - radius);
      let smax = new Vector2(position.x + radius * 2 +  context.measureText(station.name).width, position.y + radius * 2 +  subway.stationNameLineHeight);

      if (smin.x < min.x) min.x = smin.x;
      if (smin.y < min.y) min.y = smin.y;
      if (smax.x > max.x) max.x = smax.x;
      if (smax.y > max.y) max.y = smax.y;
    }

    this.mapSize = max.sub(min);
    let mino = min.add(this.mapSize.div(2));

    for (let node of this.nodes) {
      node.position = node.position.sub(mino);
    }
  }

  draw() {
    this.drawBox();
    if (!this.toggled) this.drawIcon();
  }

  drawUI() {
    this.drawPrompt();
    if (this.toggled) this.drawMap();
  }

  drawMap() {
    context.fillStyle = BACKGROUND_COLOR;
    context.strokeStyle = LINES_COLOR;
    let padded = this.mapSize.add(new Vector2(subway.stationSpacing, subway.stationSpacing));

    context.beginPath();
    context.rect(-padded.x/2, -padded.y/2, padded.x, padded.y);
    context.fill();
    context.stroke();

    context.strokeStyle = this.line.color.toString();
    context.lineWidth = subway.mapLineWidth;
    for (let i=0; i<this.nodes.length; i++) {
      let node = this.nodes[i];
      let next = i<this.nodes.length-1 ? this.nodes[i+1] : this.nodes[0];

      context.beginPath();
      context.moveTo(node.position.x, node.position.y);
      context.lineTo(next.position.x, next.position.y);
      context.stroke();
    }
    context.lineWidth = 1;

    context.font = subway.stationNameFont;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = LINES_COLOR;
    let radius = subway.mapStationRadius;
    for (let node of this.nodes) {
      context.beginPath();
      context.arc(node.position.x, node.position.y, radius, 0, TWOPI);
      context.fill();

      let index = 1;
      for (let line of node.station.lines) {
        if (line == this.line) continue;

        context.strokeStyle = line.color.toString();
        context.beginPath();
        context.arc(node.position.x, node.position.y, radius + index * 2, 0, TWOPI);
        context.stroke();

        index++;
      }

      context.fillText(node.station.name, node.position.x + radius, node.position.y + radius);
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
    if (this.toggled) this.drawTracker();
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
        context.arc(x, y-5, 3, 0, TWOPI);
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
      passenger.unpushable = this.toggled;
    }
  }

  onleave(passenger) {
    if (passenger == player) {
      passenger.unpushable = false;
    }
  }
}

class VendingMachine extends Interactable {
  constructor() {

  }
}
