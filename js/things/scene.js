class Scene {
  constructor(confiners, doors) {
    this.tag = "scene";
    this.things = [];
    this.linkedThings = [];
    this.color = new RGBA();
    this.confiners = confiners || [new RectConfiner()];
    this.doors = doors || [];
    this.setSize();

    this.notebook = new ImageData(1, 1);

    for (let confiner of this.confiners) {
      confiner.scene = this;
    }
    for (let door of this.doors) {
      door.scene = this;
    }
  }

  drawLabels() {
    for (let thing of this.things) {
      thing.drawLabels();
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
    this.drawConfiners();
    this.drawThings();
    this.drawUI();
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

  getOffset() {
    let offset = new Vector2();
    let currentScene = subway.currentScene;

    if (currentScene == this) {
      if (this.tag == "train") {
        return this.getTrainOffset();
      }
    } else {
      if (currentScene.tag == "station") {
        if (this.tag == "train") {
          return currentScene.getTrainPosition(this.train).add(currentScene.getTrainTravelVector(this.train));
        }
      } else if (currentScene.tag == "train") {
        if (this.tag == "station") {
          return currentScene.getDrawOffset();
        } else if (this.tag == "train") {
          let a = this.getNearbyStop().scene;
          let b = currentScene.getNearbyStop().scene;
          if (a == b) {
            return a.getTrainPosition(this.train).add(a.getTrainTravelVector(this.train));
          }
        }
      }
    }

    return offset;
  }

  getConfinerAtMouse() {
    let offset = this.getOffset();
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

  update(dt) {
    this.updateThings(dt);
    this.confineThings(dt);
    this.updateMouseInteraction();
  }

  updateMouseInteraction() {
    if (mouse.confinerScene) {
      if (player && mouse.down) {
        player.playerDestination = mouse.gamePosition.sub(mouse.confinerScene.getOffset());
        player.playerDestinationScene = mouse.confinerScene;
        player.playerDestinationConfiner = mouse.confiner;

        if (player.ghost) {
          player.ghost.uneat(player);
          player.applyForce(mouse.gamePosition.sub(player.getScreenPosition()).normalize().div(300));
        }
      }
    }

    if (player && player.playerDestinationScene && !player.playerDestinationScene.hasPathTo(subway.currentScene)) {
      player.playerDestination = null;
      player.playerDestinationScene = null;
      player.playerDestinationConfiner = null;
    }
    if (player && player.interacting && player.interacting.hasPathTo(player)) {
      player.interacting.select();
    }
    if (player && player.wantsToLinkTo && player.wantsToLinkTo.hasPathTo(player)) {
      let thing = player.wantsToLinkTo;
      if (thing.previousConfiner) {
          if (thing.size) {
              player.playerDestination = thing.position.add(thing.size.div(2));
          } else {
              player.playerDestination = thing.position;
          }
          player.playerDestinationScene = thing.scene;
          player.playerDestinationConfiner = thing.previousConfiner;
      }
    }
  }

  inSameScreen(scene) {
    if (scene == this) return true;
    if (scene.tag == "station") {
      if (this.tag == "station") {
        return false;
      } else if (this.tag == "train" && this.getNearbyStop().scene == scene) {
        return true;
      }
    } else {
      if (this.tag == "station") {
        return scene.getNearbyStop().scene == this;
      } else if (this.tag == "train") {
        return this.getNearbyStop() == scene.getNearbyStop();
      }
    }

    return false;
  }
  
  isAudibleTo(scene) {
    if (!this.inSameScreen(scene)) return false;
    if (scene == this) return true;
    
    if (scene.tag == "train" && scene.linkedScene) {
      if (this.tag == "station" && this == scene.linkedScene) {
        return true;
      } else if (this.tag == "train" && this.linkedScene == scene.linkedScene) {
        return true;
      }
    } else if (scene.tag == "station") {
      if (this.tag == "train" && this.linkedScene == scene) {
        return true;
      }
    }
    
    return false;
  }

  hasPathTo(scene) {
    return this.isAudibleTo(scene);
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

      if (width > 80 && !this.isOgygiaScene) {
        new VendingMachine({
          scene: this,
          position: new Vector2(x + width/2 - 15, y + (lineIndex%2==0 ? 20 : height - 20) - 20)
        });
      }

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
    for (let lineIndex = 0; lineIndex < this.station.lines.length; lineIndex++) {
      let line = this.station.lines[lineIndex];
      for (let train of line.trains) {
        let trainStop = train.scene.getNearbyStop();
        if (trainStop == this.station) {
          this.trainsHere.push(train);
        }
      }
    }
  }

  getTrainPosition(train) {
    let lineIndex = this.station.lines.indexOf(train.line);
    let index = lineIndex * 2;
    if (train.currentData && train.currentData.direction == 1) index++;
    return this.trainPositions[index];
  }

  getTrainTravelVector(train) {
    let travel = new Vector2();
    let data = train.currentData;

    if (!data.stopped) {
      let t = data.t;
      if (
        data.this_stop == this.station ||
        !data.this_stop && this.isOgygiaScene
      ) {
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

      travel.y = data.direction * traveled * worldScale;
    }

    return travel;
  }

  setConfinerScene() {
    mouse.confiner = this.getConfinerAtMouse();
    if (mouse.confiner) {
      mouse.confinerScene = this;
    } else {
      for (let train of this.trainsHere) {
        if (!train.currentData.doors_open && train.scene != subway.currentScene) continue;
        mouse.confiner = train.scene.getConfinerAtMouse();
        if (mouse.confiner) {
          mouse.confinerScene = train.scene;
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

    this.updateMouseInteraction();
  }

  draw() {
    this.drawName();

    this.drawTrains();
    this.drawTrainsThings();
    this.drawConfiners();
    this.drawFloorLines();
    this.drawLinkedTrainsThings();
    this.drawThings();
    
    this.drawUI();
  }

  drawName() {
    subway.drawStationInfo(this.station.name+" station");
  }

  updateDoors(dt) {
    for (let train of this.trainsHere) {
      let data = train.currentData;
      if (
        data.stopped && 
        (
          !this.isOgygiaScene && data.this_stop == this.station ||
          this.isOgygiaScene && !data.this_stop
        )
      ) {
        let scene = train.scene;
        let position = this.getTrainPosition(train).add(this.getTrainTravelVector(train));
        let doorIndex = data.direction > 0 ? 1 : 0;
        let stationDoorIndex = this.station.lines.indexOf(train.line) * 2 + doorIndex;

        if (data.doors_open) {
          scene.openDoor(doorIndex % 2);
          this.openDoor(stationDoorIndex);

          this.doors[stationDoorIndex].linkToScene(scene, position.mul(-1));
          scene.doors[doorIndex%2].linkToScene(this, position);
          scene.linkToScene(this, position);
        } else {
          this.closeDoor(stationDoorIndex);
          if (scene.linkedScene == this) {
            scene.closeDoors();
            scene.unlink();
            for (let thing of this.things) {
              if (thing.linkedScene == scene) thing.unlink();
            }
          }
        }
      }
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
      thing.drawLabels();
    }

    for (let train of this.trainsHere) {
      let offset = this.getTrainPosition(train).add(this.getTrainTravelVector(train));
      context.save();
      context.translate(offset.x, offset.y);
      context.translate(train.scene.jiggleOffset.x, train.scene.jiggleOffset.y);
      train.scene.drawLabels();
      context.restore();
    }

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

    for (let thing of this.things) {
      thing.drawUI();
    }

    for (let train of this.trainsHere) {
      let offset = this.getTrainPosition(train).add(this.getTrainTravelVector(train));

      context.save();
      context.translate(offset.x, offset.y);
      context.translate(train.scene.jiggleOffset.x, train.scene.jiggleOffset.y);
      train.scene.drawUI();
      context.restore();
    }
  }

  drawTrains() {
    for (let train of this.trainsHere) {
      let offset = this.getTrainPosition(train).add(this.getTrainTravelVector(train));

      context.save();
      context.translate(offset.x, offset.y);
      context.translate(train.scene.jiggleOffset.x, train.scene.jiggleOffset.y);

      let data = train.currentData;
      if (data && !data.stopped && train.scene != subway.currentScene) {
        let t = data.unsmoothed_t;
        if (t > .5) {
          t = 1 - t;
        }
        t = Math.min(1, t * 3);
        t = smoothstep(t);

        context.globalAlpha = 1 - t;
      }

      let scene = train.scene;
      let doorIndex = data.direction > 0 ? 1 : 0;
      if (scene.doors[doorIndex].open || scene == subway.currentScene) {
        scene.drawTrain();
        scene.drawConfiners();
      } else {
        scene.drawTrain(true);
      }

      context.globalAlpha = 1;

      context.restore();
    }
  }

  drawTrainsThings() {
    for (let train of this.trainsHere) {
      let scene = train.scene;
      let doorIndex = train.currentData.direction > 0 ? 1 : 0;
      if (!scene.doors[doorIndex].open && scene != subway.currentScene) continue;

      let offset = this.getTrainPosition(train).add(this.getTrainTravelVector(train));
      context.save();
      context.translate(offset.x, offset.y);
      context.translate(train.scene.jiggleOffset.x, train.scene.jiggleOffset.y);
      scene.drawThings();
      context.restore();
    }
  }

  drawLinkedTrainsThings() {
    for (let train of this.trainsHere) {
      let scene = train.scene;
      let doorIndex = train.currentData.direction > 0 ? 1 : 0;
      if (!scene.doors[doorIndex].open && scene != subway.currentScene) continue;

      let offset = this.getTrainPosition(train).add(this.getTrainTravelVector(train));
      context.save();
      context.translate(offset.x, offset.y);
      context.translate(train.scene.jiggleOffset.x, train.scene.jiggleOffset.y);
      
      for (let thing of scene.things) {
        if (thing.linkedScene == this) {
          thing.draw();
        }
      }

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

    this.isOgygiaScene = true;

    for (let confiner of this.confiners) {
      confiner.wallColor = OGYGIA_COLOR;
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
    subway.drawStationInfo("station?");
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
    if (!this.linkedScene) return;
    this.linkedScene = null;
    this.linkOffset = null;
    for (let thing of this.things) {
      if (thing.unlink) thing.unlink();
    }
  }

  getNearbyStop() {
    let data = this.train.currentData;
    let t = data.unsmoothed_t;
    let stop;

    if (data.stopped) {
      stop = data.this_stop;
    } else {
      if (t > .5) {
        stop = data.this_stop;
      } else {
        stop = data.prev_stop;
      }
    }
    if (!stop) stop = this.line.ogygia;

    return stop;
  }

  getTrainOffset() {
    let offset = new Vector2();
    let data = this.train.currentData;

    if (data) {
      let t = data.unsmoothed_t;
      let stop = this.getNearbyStop();

      if (!data.stopped && t > .5) {
        t = 1 - t;
      }

      let trainPosition = stop.scene.getTrainPosition(this.train);
      t = Math.min(1, t * 7);
      t = smoothstep(t);
      offset = trainPosition.lerp(offset, t);

      this.subtleFactor = t;
    }

    return offset;
  }

  getDrawOffset() {
    let stop = this.getNearbyStop();
    let trainPosition = stop.scene.getTrainPosition(this.train);
    let scene = stop.scene;
    let a = scene.getTrainTravelVector(this.train).add(new Vector2().lerp(trainPosition, this.subtleFactor));
    let b = this.getTrainOffset().sub(trainPosition);
    return new Vector2(b.x, -a.y);
  }

  draw() {
    let offset = this.getDrawOffset();
    let stop = this.getNearbyStop();
    let scene = stop.scene;

    if (!this.train.currentData.stopped) {
      context.save();
      let to = this.getTrainOffset();
      context.translate(to.x, to.y);
      this.drawTrack();
      context.restore();
    }

    context.save();
    context.translate(offset.x, offset.y);
    scene.draw();
    context.restore();
  }

  drawTrack() {
    let color = new RGBA(this.line.color);
    color.a = this.subtleFactor ? lerp(0, .3, this.subtleFactor) : .3;
    context.strokeStyle = color.toString();

    context.beginPath();
    context.moveTo(0, -window.innerHeight * GAME_SCALE);
    context.lineTo(0, window.innerHeight * GAME_SCALE);
    context.stroke();
  }

  drawTrain(covered) {
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
      let stationScene = this.getNearbyStop().scene;
      stationScene.setConfinerScene();
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

    if (!player || !this.inSameScreen(player.scene)) return;

    if (this.previousDoorsOpen && !data.doors_open) {
      sounds.sfx["doors close"].play();
    } else if (!this.previousDoorsOpen && data.doors_open) {
      sounds.sfx["doors open"].play();
    }

    this.previousDoorsOpen = data.doors_open;

    if (!player || !this.isAudibleTo(player.scene)) return;

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
      let tunnelVolume = t<.5 ? lerp(0, 1, t * 2) : lerp(1, 0, (t-.5) * 2);
      this.setNoiseLayersVolume(
        1,
        t<.5 ? lerp(1, 0, t * 2) : lerp(0, 1, (t-.5) * 2),
        tunnelVolume
      );

      this.tunnelFactor = tunnelVolume;
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
