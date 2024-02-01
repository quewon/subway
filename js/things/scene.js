class Scene {
  constructor(confiners, doors) {
    this.tag = "scene";
    this.things = [];
    this.linkedThings = [];
    this.color = new RGBA();
    this.confiners = confiners || [new RectConfiner()];
    this.doors = doors || [];
    this.setSize();

    for (let confiner of this.confiners) {
      confiner.scene = this;
    }
    for (let door of this.doors) {
      door.scene = this;
    }
  }

  drawWalls() {
    context.strokeStyle = "black";
    context.beginPath();
    context.rect(-this.size.x/2, -this.size.y/2, this.size.x, this.size.y);
    context.stroke();
  }

  setSize() {
    let min = new Vector2(Infinity, Infinity);
    let max = new Vector2(-Infinity, -Infinity);

    for (let confiner of this.confiners) {
      let bounds = confiner.getBounds();
      let position = bounds.position;
      let size = bounds.size;
      if (position.x < min.x) min.x = position.x;
      if (position.y < min.y) min.y = position.y;
      if (position.x + size.x > max.x) max.x = position.x + size.x;
      if (position.y + size.y > max.y) max.y = position.y + size.y;
    }

    this.size = max.sub(min);
    let halfback = new Vector2(this.size.x/2, this.size.y/2);

    for (let confiner of this.confiners) {
      confiner.position = confiner.position.sub(min).sub(halfback);
    }
  }

  draw() {
    this.camera();
    this.drawConfiners();
    this.drawThings();
  }

  drawConfiners() {
    for (let confiner of this.confiners) {
      confiner.drawWalls();
    }
    for (let confiner of this.confiners) {
      confiner.drawFloors();
      confiner.drawDoors();
    }
  }

  drawThings() {
    for (let thing of this.things) {
      thing.draw();
    }
  }

  drawLinkedThings() {
    for (let thing of this.linkedThings) {
      context.save();
      context.translate(thing.linkOffset.x, thing.linkOffset.y);
      thing.draw();
      context.restore();
    }
  }

  camera() {
    if (player && player.scene == this) {
      let ww = window.innerWidth;
      let wh = window.innerHeight;
      let sw = this.size.x;
      let sh = this.size.y;
      if (sw > ww) {
        let offset = 0;
        if (Math.abs(player.position.x) + ww/2 > sw/2) {
          offset = Math.sign(player.position.x) * (-sw/2 + ww/2) + player.position.x;
        }
        context.translate(-player.position.x + offset, 0);
      }

      if (sh > wh) {
        let offset = 0;
        if (Math.abs(player.position.y) + wh/2 > sh/2) {
          offset = Math.sign(player.position.y) * (-sh/2 + wh/2) + player.position.y;
        }
        context.translate(0, -player.position.y + offset);
      }
    }
  }

  update(dt) {
    this.updateThings(dt);
    this.confinePassengers(dt);
  }

  updateThings(dt) {
    for (let thing of this.things) {
      thing.update(dt);
    }
  }

  confinePassengers(dt) {
    let unconfinedPassengers = [];
    for (let passenger of this.things) {
      if (passenger.tag == "passenger") {
        unconfinedPassengers.push(passenger);
      }
    }

    for (let confiner of this.confiners) {
      for (let passenger of this.things) {
        if (passenger.tag == "passenger") {
          let index = unconfinedPassengers.indexOf(passenger);
          if (index == -1) continue;
          if (confiner.passengerConfined(passenger)) {
            passenger.previousConfiner = confiner;
            unconfinedPassengers.splice(index, 1);
          }
        }
      }
    }

    for (let passenger of unconfinedPassengers) {
      //WARNING: this does not account for previousConfiners from different scenes. might cause issues later. probably will.
      let confiner = passenger.previousConfiner || this.confiners[0];
      confiner.confine(dt, passenger);
    }

    for (let confiner of this.confiners) {
      for (let passenger of this.linkedThings) {
        if (confiner.passengerConfined(passenger, passenger.linkOffset)) {
          if (confiner.resolveVisitor) confiner.resolveVisitor(passenger);
        }
      }
    }
  }

  closeDoors() {
    for (let door of this.doors) {
      door.open = false;
    }
  }

  openDoors() {
    for (let door of this.doors) {
      door.open = true;
    }
  }

  openDoor(i) {
    if (this.doors[i]) this.doors[i].open = true;
  }

  closeDoor(i) {
    if (this.doors[i]) this.doors[i].open = false;
  }
}

class StationScene extends Scene {
  constructor(station) {
    // create confiners

    let confiners = [];
    let doors = [];

    let lineIndex = 0;
    let xEdge = 0;
    let prevRadius;
    for (let i=0; i<Math.ceil(station.lines.length/2); i++) {
      let line1 = station.lines[lineIndex];
      let line2 = station.lines[lineIndex+1];
      if (!line2) {
        line2 = {
          trainSize: new Vector2()
        }
      }

      let hallRadius = Math.max(line1.trainSize.x, line2.trainSize.x) + 5;
      let hallPosition = new Vector2(xEdge + hallRadius, 0);
      let hall = new CircleConfiner(hallPosition, hallRadius);

      if (line1.hallShape == "rect") {
        let hsize = new Vector2(hallRadius, hallRadius * 2);
        let hp = hallPosition.sub(new Vector2(hallRadius/2, hallRadius));
        hall = new RectConfiner(hp, hsize);
      }

      hall.isHall = true;
      confiners.push(hall);

      if (i > 0) {
        let bridge = new RectConfiner(
          new Vector2(xEdge - prevRadius * 2, hallPosition.y - hallRadius/2),
          new Vector2(prevRadius * 2 + hallRadius, hallRadius)
        );
        confiners.push(bridge);
      }

      let rect1 = new RectConfiner(
        new Vector2(hallPosition.x - hallRadius/2, hallRadius/1.5),
        new Vector2(hallRadius, line1.trainSize.y + line1.trainSize.x + 5)
      );
      rect1.isPlatform = true;

      confiners.push(rect1);
      doors.push(new Door(rect1, new Vector2(0, .5), new Vector2(0, 2.5)));
      doors.push(new Door(rect1, new Vector2(1, .5), new Vector2(0, 2.5)));

      if (lineIndex+1 < station.lines.length) {
        let rect2 = new RectConfiner(
          new Vector2(hallPosition.x - hallRadius/2, -hallRadius/1.5 - (line2.trainSize.y + line2.trainSize.x + 5)),
          new Vector2(hallRadius, line2.trainSize.y + line2.trainSize.x + 5)
        )
        rect2.isPlatform = true;

        confiners.push(rect2);
        doors.push(new Door(rect2, new Vector2(0, .5), new Vector2(0, -2.5)));
        doors.push(new Door(rect2, new Vector2(1, .5), new Vector2(0, -2.5)));
      }

      lineIndex += 2;
      xEdge += hallRadius * 2 + hallRadius;
      prevRadius = hallRadius;
    }

    super(confiners, doors);

    this.tag = "station";
    this.station = station;

    this.trainPositions = [];

    lineIndex = 0;
    for (let confiner of confiners) {
      if (confiner.isPlatform) {
        let line = station.lines[lineIndex];
        let yo = 5;

        if (lineIndex%2==1) yo = 0;

        this.trainPositions.push(new Vector2(
          confiner.position.x - line.trainSize.x/2 - 5,
          confiner.position.y + line.trainSize.y/2 + line.trainSize.x/2 + yo
        ));
        this.trainPositions.push(new Vector2(
          confiner.position.x + confiner.size.x + line.trainSize.x/2 + 5,
          confiner.position.y + line.trainSize.y/2 + line.trainSize.x/2 + yo
        ));

        lineIndex++;
      } else if (confiner.isHall) {
        let position = confiner.position;
        if (confiner.shape == "rect") {
          position = confiner.position.add(confiner.size.mul(.5));
        }
        new Map({ scene: this, position: position });
      }
    }

    this.trainsHere = [];
  }

  getTrainsHere() {
    this.trainsHere = [];
    let lines = this.station.lines;
    let lineIndex = 0;
    for (let line of lines) {
      for (let train of line.trains) {
        let data = train.currentData;
        if (!data) continue;
        if (
          data.prev_stop == this.station && !data.stopped ||
          data.this_stop == this.station
        ) {
          let trainIndex = lineIndex * 2;
          if (data.direction > 0) {
            trainIndex++;
          }

          let playerHere = player.scene == this;
          let offset = new Vector2();
          if (!data.stopped) {
            let t = data.t;

            if (data.this_stop == this.station) {
              t -= 1;
            }

            let totalDistance;
            if (data.prev_stop == null || data.this_stop == null) {
              totalDistance = train.line.subway.stationSpacing;
            } else {
              totalDistance = data.prev_stop.position.sub(data.this_stop.position).magnitude();
            }

            let traveled = lerp(0, totalDistance, t);

            const worldScale = 70;

            offset.y = data.direction * traveled * worldScale;
          }
          offset = offset.add(this.trainPositions[trainIndex]);

          train.scene.anticipatedStationOffset = offset;

          this.trainsHere.push({
            scene: train.scene,
            position: offset,
            data: data,
            index: trainIndex
          });
        }
      }
      lineIndex++;
    }
  }

  update(dt) {
    this.getTrainsHere();
    this.updateDoors(dt);
    this.updateThings(dt);
    this.confinePassengers(dt);
  }

  draw() {
    this.camera();
    this.drawTrains();
    this.drawConfiners();
    this.drawTrainsThings();
    this.drawThings();
  }

  updateDoors(dt) {
    for (let info of this.trainsHere) {
      let data = info.data;
      if (data.stopped && data.this_stop == this.station) {
        let index = info.index;

        if (data.doors_open) {
          info.scene.openDoor(index % 2);
          this.openDoor(index);

          this.doors[index].linkToScene(info.scene, info.position.mul(-1));
          info.scene.doors[index%2].linkToScene(this, info.position);

          info.scene.linkToScene(this, info.position);
        } else {
          info.scene.closeDoors();
          this.closeDoor(index);
          info.scene.unlink();
          for (let thing of this.things) {
            if (thing.linkedScene == info.scene) thing.unlink();
          }
        }
      }
    }
  }

  drawTrains() {
    for (let info of this.trainsHere) {
      this.drawTrain(info);
    }
  }

  drawTrain(info) {
    let data = info.data;
    let offset = info.position;
    let scene = info.scene;

    context.save();

    context.translate(offset.x, offset.y);

    if (!info.data.stopped) {
      let t = info.data.t;
      if (info.data.this_stop != this.station) t -= 1;
      context.globalAlpha = lerp(0, 1, t);
    }

    if (scene.doors[info.index % 2].open) {
      scene.drawTrain();
      scene.drawConfiners();
    } else {
      scene.drawTrain(true);
    }

    context.restore();
  }

  drawTrainsThings() {
    for (let info of this.trainsHere) {
      if (!info.scene.doors[info.index % 2].open) continue;
      let offset = info.position;
      context.save();
      context.translate(offset.x, offset.y);
      info.scene.drawThings();
      context.restore();
    }
  }
}

class TrainScene extends Scene {
  constructor(train) {
    let confiners = [new RectConfiner(null, new Vector2(train.line.trainSize.x, train.line.trainSize.y))];
    let doors = [];

    for (let confiner of confiners) {
      confiner.wallColor = train.line.color.toString();
      doors.push(new Door(confiner, new Vector2(1, .5)));
      doors.push(new Door(confiner, new Vector2(0, .5)));
    }

    super(confiners, doors);

    this.train = train;
    this.line = train.line;
    this.tag = "train";
    this.jiggleOffset = new Vector2();
    this.jiggleSpeed = .01;
    this.jiggleAmount = 1;
    this.timer = 0;

    this.linkedStationScene = null;
  }

  linkToScene(scene, offset) {
    this.linkedScene = scene;
    this.linkOffset = offset;
  }

  unlink() {
    this.linkedScene = null;
    this.linkOffset = null;
    for (let thing of this.things) {
      thing.unlink();
    }
  }

  draw() {
    if (this.linkedScene) {
      this.linkedScene.draw();
    } else {
      this.camera();

      let data = this.train.currentData;
      if (data && this.anticipatedStationOffset) {
        let offset = new Vector2();
        offset = offset.lerp(this.anticipatedStationOffset, data.door_t);
        context.translate(offset.x, offset.y);
      }

      this.drawTrack();
      this.drawTrain();
      this.drawConfiners();
      this.drawThings();
    }
  }

  drawTrack() {
    let data = this.train.currentData;

    let color = new RGBA(this.line.color);
    color.a = data ? lerp(.3, 0, data.door_t) : .3;
    context.strokeStyle = color.toString();

    context.beginPath();
    context.moveTo(0, - window.innerHeight);
    context.lineTo(0, window.innerHeight);
    context.stroke();
  }

  drawTrain(covered) {
    let color = new RGBA(this.line.color);
    color.a = .3;

    context.translate(this.jiggleOffset.x, this.jiggleOffset.y);

    context.fillStyle = color.toString();
    context.beginPath();
    context.arc(0, -this.size.y/2, this.size.x/2, 0, Math.PI*2);
    context.fill();
    context.beginPath();
    context.arc(0, this.size.y/2, this.size.x/2, 0, Math.PI*2);
    context.fill();

    if (covered) {
      context.fillStyle = this.line.color.toString();
      context.fillRect(-this.size.x/2, -this.size.y/2, this.size.x, this.size.y);
    }
  }

  update(dt) {
    let train = this.train;
    let data = train.currentData;

    if (data) {
      if (data.stopped) {
        this.timer = 0;
        this.jiggleOffset = new Vector2();
      } else {
        this.timer += dt;
        this.jiggleOffset = new Vector2(
          Math.sin(this.jiggleSpeed * this.timer) * this.jiggleAmount,
          Math.cos(this.jiggleSpeed * this.timer) * this.jiggleAmount
        );
      }
    }

    this.updateThings(dt);
    this.confinePassengers(dt);
  }

  updateThings(dt) {
    for (let thing of this.things) {
      thing.update(dt);
      if (thing.tag == "passenger") {
        thing.applyForce(this.jiggleOffset.mul(-1 * dt/1000));
      }
    }
  }
}
