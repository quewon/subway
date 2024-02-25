class Scene {
  constructor(confiners, doors) {
    this.tag = "scene";
    this.things = [];
    this.linkedThings = [];
    this.color = new RGBA();
    this.confiners = confiners || [new RectConfiner()];
    this.doors = doors || [];
    this.cameraOffset = new Vector2();
    this.setSize();

    this.notebook = new ImageData(1, 1);

    for (let confiner of this.confiners) {
      confiner.scene = this;
    }
    for (let door of this.doors) {
      door.scene = this;
    }
  }

  drawUI() {
    for (let thing of this.things) {
      thing.drawUI();
    }
  }

  drawWalls() {
    context.strokeStyle = LINES_COLOR;
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
    this.drawThingsUI();
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

  getConfinerAtMouse() {
    let offset = this.cameraOffset;
    if (this.linkedScene) {
      offset = offset.add(this.linkedScene.cameraOffset);
    }
    for (let confiner of this.confiners) {
      if (confiner.containsMouse(offset)) {
        return confiner;
      }
    }
    return null;
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
  
  getCameraOffset() {
    let cameraOffset = new Vector2();

    let ww = window.innerWidth * GAME_SCALE;
    let wh = window.innerHeight * GAME_SCALE;
    let sw = this.size.x;
    let sh = this.size.y;
    if (sw > ww) {
      let offset = 0;
      if (Math.abs(player.position.x) + ww/2 > sw/2) {
        offset = Math.sign(player.position.x) * (-sw/2 + ww/2) + player.position.x;
      }
      cameraOffset = new Vector2(-player.position.x + offset, 0);
    }

    if (sh > wh) {
      let offset = 0;
      if (Math.abs(player.position.y) + wh/2 > sh/2) {
        offset = Math.sign(player.position.y) * (-sh/2 + wh/2) + player.position.y;
      }
      cameraOffset = new Vector2(0, -player.position.y + offset);
    }

    return cameraOffset;
  }

  camera() {
    this.cameraOffset = this.getCameraOffset();

    if (player && player.scene == this) {
      context.translate(this.cameraOffset.x, this.cameraOffset.y);
    }
  }

  update(dt) {
    this.updateThings(dt);
    this.confineThings(dt);
    this.updateMouseInteraction();
  }

  updateMouseInteraction() {
    if (
      subway.currentScene == this ||
      subway.currentScene.tag == "station" && this.tag == "train"   && this.linkedScene == subway.currentScene ||
      subway.currentScene.tag == "train"   && this.tag == "station" && this == subway.currentScene.linkedScene ||
      subway.currentScene.tag == "train"   && this.tag == "train"   && this.linkedScene == subway.currentScene.linkedScene
    ) {
      
    } else {
      return;
    }

    if (mouse.confinerScene) {
      let m = mouse.gamePosition.sub(mouse.confinerScene.cameraOffset);
      if (player && m.distanceTo(player.position) >= player.avoidanceRadius && mouse.down && !player.interacting) {
        let scene = mouse.confinerScene;

        player.playerDestination = m;
        player.playerDestinationScene = scene;
        player.playerDestinationConfiner = mouse.confiner;
      }
    }
  }

  updateThings(dt) {
    for (let thing of this.things) {
      thing.update(dt);
    }
  }

  confineThings(dt) {
    let unconfinedThings = [];
    for (let thing of this.things) {
      if (thing.isPhysical) {
        unconfinedThings.push(thing);
      }
    }

    for (let confiner of this.confiners) {
      for (let thing of this.things) {
        if (thing.isPhysical) {
          let index = unconfinedThings.indexOf(thing);
          if (index == -1) continue;
          if (confiner.thingConfined(thing)) {
            thing.previousConfiner = confiner;
            unconfinedThings.splice(index, 1);
          }
        }
      }
    }

    for (let thing of unconfinedThings) {
      let confiner = thing.previousConfiner || this.confiners[0];
      confiner.confine(dt, thing);
    }

    for (let confiner of this.confiners) {
      for (let thing of this.linkedThings) {
        if (confiner.resolveVisitor) confiner.resolveVisitor(thing);
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

  mute() { }
  unmute() { }
}

class StationScene extends Scene {
  constructor(station) {
    // create confiners

    let confiners = [];
    let doors = [];
    let platformConfiners = [];

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
      platformConfiners.push(rect1);
      doors.push(new Door(rect1, new Vector2(0, .5), new Vector2(0, 2.5)));
      doors.push(new Door(rect1, new Vector2(1, .5), new Vector2(0, 2.5)));

      if (lineIndex+1 < station.lines.length) {
        let rect2 = new RectConfiner(
          new Vector2(hallPosition.x - hallRadius/2, -hallRadius/1.5 - (line2.trainSize.y + line2.trainSize.x + 5)),
          new Vector2(hallRadius, line2.trainSize.y + line2.trainSize.x + 5)
        )
        rect2.isPlatform = true;

        confiners.push(rect2);
        platformConfiners.push(rect2);
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
    this.ambience = sounds.ambience.heathrow;
    this.platformConfiners = platformConfiners;

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

        if (confiner == confiners[0]) {
          let radius = confiner.radius ? confiner.radius : confiner.size.x/2;
          new LightSwitch({ scene: this, position: new Vector2(position.x - radius, position.y) });
        }
      }
    }

    this.trainsHere = [];
  }

  generateFloorLines() {
    this.floorLines = [];

    let lineIndex = 0;
    for (let confiner of this.platformConfiners) {
      let line = this.station.lines[lineIndex];

      let x = confiner.position.x;
      let y = confiner.position.y;
      let width = confiner.size.x;
      let height = confiner.size.y;

      let padding = new Vector2(5, 15);

      this.floorLines.push({
        color: line.color.toString(),
        p1: new Vector2(x + padding.x, y + padding.y),
        p2: new Vector2(x + padding.x, y + height - padding.y)
      });
      this.floorLines.push({
        color: line.color.toString(),
        p1: new Vector2(x + width - padding.x, y + padding.y),
        p2: new Vector2(x + width - padding.x, y + height - padding.y)
      });

      //

      let oy = height/3.5;
      if (lineIndex % 2 == 0) {
        oy *= -1;
      }

      new TrainTracker({
        scene: this,
        line: line,
        position: new Vector2(x + width - 14, y + height/2 - oy),
        direction: 1
      });
      new TrainTracker({
        scene: this,
        line: line,
        position: new Vector2(x + 14, y + height/2 - oy),
        direction: -1
      });

      lineIndex++;
    }
  }

  drawFloorLines() {
    for (let line of this.floorLines) {
      let p1 = line.p1;
      let p2 = line.p2;

      context.strokeStyle = line.color;
      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.lineTo(p2.x, p2.y);
      context.stroke();
    }
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

  setConfinerScene() {
    mouse.confiner = this.getConfinerAtMouse();
    if (mouse.confiner) {
      mouse.confinerScene = this;
    } else {
      for (let info of this.trainsHere) {
        if (!info.data.doors_open) continue;
        mouse.confiner = info.scene.getConfinerAtMouse();
        if (mouse.confiner) {
          mouse.confinerScene = info.scene;
          return;
        }
      }

      mouse.confinerScene = null;
    }
  }

  update(dt) {
    this.getTrainsHere();
    this.updateDoors(dt);

    if (subway.currentScene == this) {
      this.setConfinerScene();
    }

    this.updateThings(dt);
    this.confineThings(dt);

    for (let info of this.trainsHere) {
      info.scene.updateSound();
    }

    this.updateMouseInteraction();
  }

  draw() {
    this.camera();

    this.drawName();

    if (subway.shadowsEnabled) {
      this.drawConfinerShadows();
      this.drawTrainsShadows();
    }
    this.drawTrains();
    this.drawConfiners();
    this.drawFloorLines();
    this.drawTrainsThings();
    this.drawThings();

    if (mouse.confinerScene == this) {
      for (let i=0; i<this.platformConfiners.length; i++) {
        let platform = this.platformConfiners[i];
        if (mouse.confiner == platform) {
          let line = this.station.lines[i];
          this.drawPlatformInfo(platform, line, 1);
          this.drawPlatformInfo(platform, line, -1);
        }
      }
    }

    this.drawUI();
  }

  drawName() {
    subway.drawStationInfo("this stop is", this.station.name+" station");
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

  drawConfinerShadows() {
    for (let confiner of this.confiners) {
      confiner.drawShadow();
    }
  }

  drawTrainsShadows() {
    for (let info of this.trainsHere) {
      this.drawTrainShadow(info);
    }
  }

  drawTrains() {
    for (let info of this.trainsHere) {
      let offset = info.scene.getCameraOffset().add(info.scene.getTrainOffset());
      if (subway.currentScene.tag == "train") {
        // offset = offset.sub(info.scene.getTrainOffset());
      }
      info.scene.cameraOffset = offset;
      this.drawTrain(info);
    }
  }

  drawPlatformInfo(platform, line, direction) {
    let this_stop = this.station;
    let prev_stop = line.getPreviousStop(this_stop, direction);
    let next_stop = line.getNextStop(this_stop, direction);

    context.font = "13px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";

    let padding = new Vector2(5, 5);
    let arrow = "→";

    let string1 = "";
    let string2 = this_stop.name;
    if (prev_stop) string1 = prev_stop.name+" "+arrow+" ";
    let string3 = "";
    if (next_stop) {
      string2 += " "+arrow+" ";
      string3 = next_stop.name;
    }

    let width1 = context.measureText(string1).width;
    context.font = "bold 13px sans-serif";
    let width2 = context.measureText(string2).width;
    let width3 = context.measureText(string3).width;
    let width = padding.x * 2 + width1 + width2 + width3;
    let height = padding.y * 2 + context.measureText(string1).fontBoundingBoxDescent;
    let px = platform.position.x + platform.size.x/2 + direction * (platform.size.x/2 + 20);
    if (direction < 0) px -= width;
    let py = platform.position.y + platform.size.y/2 - height/2;

    context.strokeStyle = new RGBA(0,0,0,.3).toString();
    context.setLineDash([2]);
    context.beginPath();
    context.moveTo(direction > 0 ? platform.position.x + platform.size.x : platform.position.x, py + height/2);
    context.lineTo(px, py + height/2);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = LINES_COLOR;
    context.fillStyle = BACKGROUND_COLOR;
    context.beginPath();
    context.rect(px, py, width, height);
    context.fill();
    context.stroke();

    context.font = "13px sans-serif";
    context.fillStyle = LINES_COLOR;
    context.fillText(string1, px + padding.x, py + padding.y);

    context.font = "bold 13px sans-serif";
    context.fillText(string2, px + padding.x + width1, py + padding.y);

    context.fillStyle = line.color.toString();
    context.fillText(string3, px + padding.x + width1 + width2, py + padding.y);
  }

  drawUI() {
    for (let thing of this.things) {
      thing.drawUI();
    }

    for (let info of this.trainsHere) {
      let data = info.data;
      let offset = info.position;
      let scene = info.scene;

      context.save();

      context.translate(offset.x, offset.y);

      scene.drawUI();

      context.restore();
    }
  }

  drawTrainShadow(info) {
    let data = info.data;
    let offset = info.position;
    let scene = info.scene;

    context.save();

    context.translate(offset.x, offset.y);

    if (!info.data.stopped) {
      let t = info.data.t;
      if (info.data.this_stop != this.station) t -= 1;
      context.globalAlpha = lerp(0, 1, t * 2);
    }

    scene.drawShadow();

    context.restore();
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
      context.globalAlpha = lerp(0, 1, t * 2);
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

  mute() {
    this.ambience.pause();
  }

  unmute() {
    if (!this.ambience.playing()) {
      this.ambience.play();
    }
  }
}

class OgygiaScene extends StationScene {
  constructor(ogygia) {
    super(ogygia);

    for (let confiner of this.confiners) {
      confiner.wallColor = OGYGIA_COLOR;
    }
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
          !data.prev_stop && !data.stopped ||
          !data.this_stop
        ) {
          let trainIndex = lineIndex * 2;
          if (data.direction > 0) {
            trainIndex++;
          }

          let offset = new Vector2();
          if (!data.stopped) {
            let t = data.t;

            if (!data.this_stop) {
              t -= 1;
            }

            let totalDistance = train.line.subway.stationSpacing;

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

  drawPlatformInfo(platform, line, direction) {
    let stop;
    if (direction > 0) {
      stop = line.stations[0];
    } else {
      stop = line.stations[line.stations.length - 1];
    }

    context.font = "13px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";

    let padding = new Vector2(5, 5);
    let string1 = "→ ";
    let string2 = stop.name;

    let width1 = context.measureText(string1).width;
    context.font = "bold 13px sans-serif";
    let width2 = context.measureText(string2).width;
    let width = padding.x * 2 + width1 + width2;
    let height = padding.y * 2 + context.measureText(string1).fontBoundingBoxDescent;
    let px = platform.position.x + platform.size.x/2 + direction * (platform.size.x/2 + 20);
    if (direction < 0) px -= width;
    let py = platform.position.y + platform.size.y/2 - height/2;

    context.strokeStyle = new RGBA(0,0,0,.3).toString();
    context.setLineDash([2]);
    context.beginPath();
    context.moveTo(direction > 0 ? platform.position.x + platform.size.x : platform.position.x, py + height/2);
    context.lineTo(px, py + height/2);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = LINES_COLOR;
    context.fillStyle = BACKGROUND_COLOR;
    context.beginPath();
    context.rect(px, py, width, height);
    context.fill();
    context.stroke();

    context.font = "13px sans-serif";
    context.fillStyle = LINES_COLOR;
    context.fillText(string1, px + padding.x, py + padding.y);

    context.font = "bold 13px sans-serif";
    context.fillStyle = line.color.toString();
    context.fillText(string2, px + padding.x + width1, py + padding.y);
  }

  drawName() {
    subway.drawStationInfo("this stop is", "station?");
  }

  updateDoors(dt) {
    for (let info of this.trainsHere) {
      let data = info.data;
      if (data.stopped && !data.this_stop) {
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

    new LineMap({
      scene: this,
      line: this.line
    });

    this.audioIds = {};
    this.noiseLayers = [
      {
        sound: sounds.sfx["train layer 1"],
        id: sounds.sfx["train layer 1"].play()
      },
      {
        sound: sounds.sfx["train layer 2"],
        id: sounds.sfx["train layer 2"].play()
      },
      {
        sound: sounds.sfx["train layer 3"],
        id: sounds.sfx["train layer 3"].play()
      }
    ];
    this.mute();
  }

  linkToScene(scene, offset) {
    this.linkedScene = scene;
    this.linkOffset = offset;
  }

  unlink() {
    this.linkedScene = null;
    this.linkOffset = null;
    for (let thing of this.things) {
      if (thing.unlink) thing.unlink();
    }
  }

  getTrainOffset() {
    let offset = new Vector2();
    let data = this.train.currentData;
    if (data && this.anticipatedStationOffset) {
      offset = offset.lerp(this.anticipatedStationOffset, data.door_t);
    }
    return offset;
  }

  draw() {
    if (this.linkedScene) {
      this.linkedScene.draw();
    } else {
      this.camera();
      this.cameraOffset = this.cameraOffset.add(this.getTrainOffset());
      context.translate(this.cameraOffset.x, this.cameraOffset.y);
      this.drawTrack();
      if (subway.shadowsEnabled) this.drawShadow();
      this.drawTrain();
      this.drawConfiners();
      this.drawThings();
      this.drawUI();
    }
  }

  drawTrack() {
    let data = this.train.currentData;

    let color = new RGBA(this.line.color);
    color.a = data ? lerp(.3, 0, data.door_t) : .3;
    context.strokeStyle = color.toString();

    context.beginPath();
    context.moveTo(0, -window.innerHeight * GAME_SCALE);
    context.lineTo(0, window.innerHeight * GAME_SCALE);
    context.stroke();
  }

  drawShadow() {
    context.translate(this.jiggleOffset.x, this.jiggleOffset.y);

    context.fillStyle = SHADOW_COLOR;
    context.beginPath();
    context.arc(SHADOW_DEPTH/2, -this.size.y/2 + SHADOW_DEPTH/2, this.size.x/2, 0, TWOPI);
    context.arc(SHADOW_DEPTH/2, this.size.y/2 + SHADOW_DEPTH/2, this.size.x/2, 0, TWOPI);
    context.rect(-this.size.x/2 + SHADOW_DEPTH/2, -this.size.y/2 + SHADOW_DEPTH/2, this.size.x, this.size.y);
    context.fill();
  }

  drawTrain(covered) {
    context.translate(this.jiggleOffset.x, this.jiggleOffset.y);

    context.fillStyle = BACKGROUND_COLOR;
    context.strokeStyle = this.line.color.toString();
    context.beginPath();
    context.arc(0, -this.size.y/2, this.size.x/2, 0, TWOPI);
    context.arc(0, this.size.y/2, this.size.x/2, 0, TWOPI);
    context.fill();
    context.stroke();

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
        let t = data.t;
        if (data.t >= .75) {
          this.jiggleAmount = lerp(1, 0, (t-.75) * 4);
        } else if (data.t <= .25) {
          this.jiggleAmount = lerp(0, 1, t * 4);
        } else {
          this.jiggleAmount = 1;
        }

        this.timer += dt;
        this.jiggleOffset = new Vector2(
          Math.sin(this.jiggleSpeed * this.timer) * this.jiggleAmount,
          Math.cos(this.jiggleSpeed * this.timer) * this.jiggleAmount
        );
      }

      this.updateSound();
    }

    if (subway.currentScene == this) {
      if (this.linkedScene) {
        this.linkedScene.setConfinerScene();
      } else {
        mouse.confiner = this.getConfinerAtMouse(this.cameraOffset);
      }
    }
 
    this.updateThings(dt);
    this.confineThings(dt);

    this.updateMouseInteraction();
  }

  updateThings(dt) {
    for (let thing of this.things) {
      thing.update(dt);
      if (thing.tag == "passenger") {
        thing.applyForce(this.jiggleOffset.mul(-1 * dt/1000));
      }
    }
  }

  updateSound() {
    let data = this.train.currentData;

    if (player && (player.scene == this || this.linkedScene == player.scene)) {
      if (data.stopped) {
        delete this.audioIds.thisStop;

        if (data.doors_closing && !this.audioIds.doorsClosing) {
          this.audioIds.doorsClosing = sounds.cannedvoice["doors closing"].play();
        }
      } else {
        delete this.audioIds.doorsClosing;

        if (data.t > .9) {
          if (!this.audioIds.thisStop && this.train.currentData.this_stop) {
            this.audioIds.thisStop = sounds.cannedvoice["this stop is"].play();
            sounds.cannedvoice["this stop is"].once("end", function() {
              let stopname = this.train.currentData.this_stop.name.replace(".", "");
              this.audioIds.stationName = sounds.cannedvoice[stopname].play();

              sounds.cannedvoice[stopname].once("end", function() {
                this.audioIds.station = sounds.cannedvoice["station"].play();

                if (this.train.currentData.next_stop) {
                  sounds.cannedvoice["station"].once("end", function() {
                    this.audioIds.nextStop = sounds.cannedvoice["the next stop is"].play();

                    sounds.cannedvoice["the next stop is"].once("end", function() {
                      sounds.cannedvoice[this.train.currentData.next_stop.name.replace(".", "")].play();
                    }.bind(this), this.audioIds.nextStop);
                  }.bind(this), this.audioIds.station);
                } else {
                  sounds.cannedvoice["station"].once("end", function() {
                    sounds.cannedvoice["this is the final stop"].play();
                  }.bind(this), this.audioIds.station);
                }
              }.bind(this), this.audioIds.stationName);
            }.bind(this), this.audioIds.thisStop);
          }
        }
      }
    }

    if (!player || player.scene != this) return;

    let t = data.t;

    if (data.stopped && data.doors_open) {
      this.mute();

      if (!sounds.ambience.heathrow.playing()) {
        sounds.ambience.heathrow.play();
      }
    } else {
      let n = this.noiseLayers[0];
      if (!n.sound.playing(n.id)) {
        for (let layer of this.noiseLayers) {
          layer.sound.seek(0, layer.id);
          layer.sound.play(layer.id);
        }
      }

      if (sounds.ambience.heathrow.playing()) {
        sounds.ambience.heathrow.pause();
      }
    }

    if (data.stopped) {
      if (!data.doors_open) {
        t = data.door_t;
        this.setNoiseLayersVolume(
          1,
          lerp(1, 0, t),
          0
        );
      }
    } else {
      this.setNoiseLayersVolume(
        1,
        t<.5 ? lerp(1, 0, t * 2) : lerp(0, 1, (t-.5) * 2),
        t<.5 ? lerp(0, 1, t * 2) : lerp(1, 0, (t-.5) * 2)
      );
    }
  }

  setNoiseLayersVolume(v1, v2, v3) {
    let n1 = this.noiseLayers[0];
    let n2 = this.noiseLayers[1];
    let n3 = this.noiseLayers[2];
    if (v1 != null) n1.sound.volume(v1, n1.id);
    if (v2 != null) n2.sound.volume(v2, n2.id);
    if (v3 != null) n3.sound.volume(v3, n3.id);
  }

  mute() {
    this.setNoiseLayersVolume(0, 0, 0);
    for (let layer of this.noiseLayers) {
      layer.sound.pause(layer.id);
    }
  }
}
