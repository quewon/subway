class Subway {
  constructor() {
    this.timeScale = 3;
    this.time = 5 * 60 * 60;

    this.mapLineWidth = 2;
    this.mapStationRadius = 3;
    this.stationSpacing = 50;
    this.stationNameFont = "12px sans-serif";
    this.stationNameLineHeight = 12;

    this.durationMultiplier = 1;

    this.numOfLines = 5;

    this.generateMap();
    this.generateMapLines();
    this.generateTrains();

    this.mapOpen = false;
    this.mapTimer = 0;

    this.homebase = this.lines[0].stations[0].scene;
    // this.homebase = this.lines[0].ogygia.scene;
    // this.currentScene = this.lines[0].trains[0].scene;
    this.currentScene = this.lines[0].trains[0].scene;
  }

  setScene(scene) {
    let previousScene = this.currentScene;
    this.currentScene = scene;

    if (previousScene) {
      this.saveNotes(previousScene);
      previousScene.mute();
    }

    this.placeNotes();
    scene.unmute();
  }

  saveNotes(scene) {
    if (!subway.currentScene.notebookEdited) return;

    scene.notebook = noteContext.getImageData(0, 0, notebook.width, notebook.height);
    subway.currentScene.notebookEdited = false;
  }

  placeNotes() {
    noteContext.clearRect(0, 0, notebook.width, notebook.height);

    let data = this.currentScene.notebook;
    noteContext.putImageData(data, (notebook.width - data.width)/2, (notebook.height - data.height)/2);
  }

  generateMap() {
    console.log("generating map...");

    this.lines = [];
    var lines = this.numOfLines;

    let initialColor = new RGBA(240,200,120);
    let lastPosition = new Vector2();
    let min = new Vector2(Infinity, Infinity);
    let max = new Vector2(-Infinity, -Infinity);

    for (let i=0; i<lines; i++) {
      let color = initialColor.hueShift(360/lines * i);
      let line = new Line(this, lastPosition, color);
      lastPosition = line.linkingPosition();

      var linemin, linemax;
      if (line.type == "circle") {
        let rv2 = new Vector2(line.radius, line.radius);
        linemin = line.position.sub(rv2);
        linemax = line.position.add(rv2);
      } else {
        linemin = new Vector2(
          Math.min(line.p1.x, line.p2.x),
          Math.min(line.p1.y, line.p2.y)
        );
        linemax = new Vector2(
          Math.max(line.p1.x, line.p2.x),
          Math.max(line.p1.y, line.p2.y)
        );
      }

      if (linemin.x < min.x) min.x = linemin.x;
      if (linemin.y < min.y) min.y = linemin.y;
      if (linemax.x > max.x) max.x = linemax.x;
      if (linemax.y > max.y) max.y = linemax.y;
    }

    this.size = max.sub(min);

    this.stations = [];
    let hs = this.stationSpacing/2;
    for (let y=-this.size.y/2; y<this.size.y/2; y+=this.stationSpacing) {
      for (let x=-this.size.x/2; x<this.size.x/2; x+=this.stationSpacing) {
        let station = new Station(this, new Vector2(x+hs, y+hs));
      }
    }

    let offset = min.add(this.size.div(2));

    for (let i=this.lines.length-1; i>=0; i--) {
      let line = this.lines[i];
      if (line.type == "circle") {
        line.position = line.position.sub(offset);
      } else {
        line.p1 = line.p1.sub(offset);
        line.p2 = line.p2.sub(offset);
      }
      line.calculateStations();
    }

    min = new Vector2(Infinity, Infinity);
    max = new Vector2(-Infinity, -Infinity);
    context.font = this.stationNameFont;
    context.textAlign = "left";
    context.textBaseline = "top";
    for (let i=this.stations.length-1; i>=0; i--) {
      let station = this.stations[i];
      if (station.lines.length == 0) {
        this.stations.splice(i, 1);
        continue;
      }

      station.position = station.position.jiggle(10);
      station.createScene();

      let radius = this.mapStationRadius;
      let width = radius * 2 + context.measureText(station.name).width;
      let height = radius * 2 + this.stationNameLineHeight;

      if (station.position.x - radius < min.x) min.x = station.position.x - radius;
      if (station.position.y - radius < min.y) min.y = station.position.y - radius;
      if (station.position.x + width > max.x) max.x = station.position.x + width;
      if (station.position.y + height > max.y) max.y = station.position.y + height;
    }

    this.size = max.sub(min);

    let mino = min.add(this.size.div(2));
    for (let station of this.stations) {
      station.position = station.position.sub(mino);
    }
    mino = mino.sub(new Vector2(this.stationSpacing/4, this.stationSpacing/4));
    for (let line of this.lines) {
      if (line.type == "circle") {
        line.position = line.position.sub(mino);
      } else {
        line.p1 = line.p1.sub(mino);
        line.p2 = line.p2.sub(mino);
      }
    }
  }

  generateMapLines() {
    console.log("calculating map lines...");

    for (let line of this.lines) {
      line.generateSegments();
    }
    for (let line of this.lines) {
      for (let segment of line.segments) {
        if (segment.shifted) continue;

        let overlappingSegments = [segment];
        for (let otherline of this.lines) {
          if (line == otherline) continue;

          for (let othersegment of otherline.segments) {
            if (
              othersegment.a.distanceTo(segment.a) == 0 && othersegment.b.distanceTo(segment.b) == 0 ||
              othersegment.a.distanceTo(segment.b) == 0 && othersegment.b.distanceTo(segment.a) == 0
            ) {
              overlappingSegments.push(othersegment);
              continue;
            }
          }
        }

        if (overlappingSegments.length > 1) {
          let direction = segment.b.sub(segment.a).normalize();
          direction = new Vector2(direction.y, -direction.x);

          for (let i=0; i<overlappingSegments.length; i++) {
            let oseg = overlappingSegments[i];
            let shift = direction.mul(this.mapLineWidth * 2 * (i + .5 - overlappingSegments.length/2));
            oseg.a = oseg.a.add(shift);
            oseg.b = oseg.b.add(shift);
            oseg.shifted = true;
          }
        }
      }
    }

    for (let station of this.stations) {
      station.scene.generateFloorLines();
    }
    for (let line of this.lines) {
      line.ogygia.scene.generateFloorLines();
    }
  }

  generateTrains() {
    console.log("generating trains...")

    for (let line of this.lines) {
      line.generateTrains();
    }
  }

  getLargestStation() {
    let largestStation;
    let largestStationSize = 0;
    for (let station of this.stations) {
      if (station.lines.length > largestStationSize) {
        largestStation = station;
        largestStationSize = station.lines.length;
      }
    }

    return largestStation;
  }

  updateMap(dt) {
    if (this.mapOpen) {
      this.mapTimer += dt/1000 * 1.5;
    } else if (this.mapTimer > 0) {
      this.mapTimer -= dt/1000 * 3;
    }

    for (let line of this.lines) {
      line.updateTrains(dt);
    }
  }

  update(dt) {
    this.time += dt/1000 * this.timeScale;
    while (this.time > 24 * 60 * 60) {
      this.time -= 24 * 60 * 60;
    }

    this.updateMap(dt);

    for (let station of this.stations) {
      station.scene.update(dt);
    }
    for (let line of this.lines) {
      line.ogygia.scene.update(dt);
      for (let train of line.trains) {
        train.scene.update(dt);
      }
    }
  }

  drawStationInfo(station_name) {
    let x = window.innerWidth/2 * GAME_SCALE - 10;
    let y = window.innerHeight/2 * GAME_SCALE - 10;

    let time = this.getTimeString();

    context.fillStyle = LINES_COLOR;
    context.font = "italic 15px sans-serif";
    context.textAlign = "right";
    context.textBaseline = "bottom";

    context.fillText(time, x, y);

    if (station_name) {
      let lineHeight = context.measureText(time).fontBoundingBoxAscent;
      y -= lineHeight;

      context.fillText(station_name, x, y);
    }
  }

  draw() {
    if (this.currentScene) this.currentScene.draw();

    if (this.mapTimer > 0) this.drawMap();
  }

  drawMap() {
    let padded = this.size.add(new Vector2(this.stationSpacing, this.stationSpacing));

    context.beginPath();
    context.rect(-padded.x/2, -padded.y/2, padded.x, padded.y);
    context.fillStyle = BACKGROUND_COLOR;
    context.fill();

    context.strokeStyle = LINES_COLOR;
    context.stroke();

    for (let line of this.lines) {
      if (this.mapTimer < .3) {
        line.drawShape();
      } else {
        line.drawSegments();
      }
    }
    if (this.mapTimer > .5) {
      for (let station of this.stations) {
        station.draw();
      }

      for (let station of this.stations) {
        station.drawName();
      }
    }
  }

  getTimeString() {
    let hours = Math.floor(this.time / 60 / 60);
    if (hours < 10) hours = "0"+hours;
    let minutes = Math.floor(this.time / 60 % 60);
    if (minutes < 10) minutes = "0"+minutes;
    // let seconds = Math.floor(this.time % 60 % 60);
    // if (seconds < 10) seconds = "0"+seconds;
    // return hours+":"+minutes+":"+seconds;
    return hours+":"+minutes;
  }

  openMap() {
    if (this.mapOpen) return;
    this.mapOpen = true;
    this.mapTimer = 0;

    // sounds.sfx["open map"].play();
  }

  closeMap() {
    if (!this.mapOpen) return;
    this.mapOpen = false;
    this.mapTimer = .5;

    // sounds.sfx["close map"].play();
  }

  getStationByName(name) {
    for (let station of this.stations) {
      if (station.name == name) {
        return station;
      }
    }
    return null;
  }

  getAllRoutes(station1, station2, linesTaken) {
    linesTaken = linesTaken || [];
    let routes = [];

    let sharedLines = station1.sharedLines(station2);
    if (sharedLines.length > 0) {
      for (let line of sharedLines) {
        let route = line.getShortestRoute(station1, station2);
        routes.push({
          route: route,
          length: route ? route.length : -1,
          transfers: linesTaken.length
        });
      }
    } else {
      for (let line of station1.lines) {
        if (linesTaken.indexOf(line) != -1) continue;
        let transfers = line.getTransferStations();
        for (let transfer of transfers) {
          if (transfer == station1) continue;
          let routeToTransfer = line.getShortestRoute(station1, transfer, linesTaken);
          if (!routeToTransfer) continue;
          routeToTransfer.splice(routeToTransfer.length - 1, 1);

          let routesFromTransfer = this.getAllRoutes(transfer, station2, linesTaken.concat([line]));
          for (let route of routesFromTransfer) {
            let connected = routeToTransfer.concat(route.route);
            routes.push({
              route: connected,
              length: connected.length,
              transfers: route.transfers
            });
          }
        }
      }
    }

    return routes;
  }

  getShortestRoute(station1, station2) {
    let routes = this.getAllRoutes(station1, station2);

    let shortestRoutes = [];
    let shortestRouteLength = Infinity;
    for (let route of routes) {
      if (!route.route) continue;
      if (route.length <= shortestRouteLength) {
        shortestRoutes.push(route);
        shortestRouteLength = route.length;
      }
    }

    let simplestRoute;
    let fewestTransfers = Infinity;
    for (let route of shortestRoutes) {
      if (route.transfers < fewestTransfers) {
        simplestRoute = route;
        fewestTransfers = route.transfers;
      }
    }

    return simplestRoute;
  }

  getSimplestRoute(station1, station2) {
    let routes = this.getAllRoutes(station1, station2);

    let simplestRoutes = [];
    let fewestTransfers = Infinity;
    for (let route of routes) {
      if (!route.route) continue;
      if (route.transfers <= fewestTransfers) {
        simplestRoutes.push(route);
        fewestTransfers = route.transfers;
      }
    }

    let shortestRoute;
    let shortestRouteLength = Infinity;
    for (let route of simplestRoutes) {
      if (route.length < shortestRouteLength) {
        shortestRoute = route;
        shortestRouteLength = route.length;
      }
    }

    return shortestRoute;
  }

  setName(name, replacement) {
    let station = this.getStationByName(name);
    station.name = replacement;
    station.nameColor = player.color.toString();
  }

  shortRoute(name1, name2) {
    let station1 = this.getStationByName(name1);
    let station2 = this.getStationByName(name2);
    return this.getShortestRoute(station1, station2);
  }

  simpleRoute(name1, name2) {
    let station1 = this.getStationByName(name1);
    let station2 = this.getStationByName(name2);
    return this.getSimplestRoute(station1, station2);
  }
}

class Line {
  constructor(subway, lastPosition, color) {
    this.subway = subway;
    this.type = Math.random() > .5 ? "circle" : "line";
    this.color = color || new RGBA();

    switch (this.type) {
      case "circle":
        this.radius = this.subway.stationSpacing + Math.random() * (this.subway.stationSpacing * 1.5);
        this.position = lastPosition.add(
          new Vector2(Math.random(), Math.random())
          .normalize()
          .mul(this.radius)
        );
        break;

      case "line":
        this.p1 = lastPosition;
        let width = this.subway.stationSpacing * 7;
        this.p2 = new Vector2(Math.random() * width - width/2, Math.random() * width - width/2);
        break;
    }

    this.stations = [];

    this.hallShape = Math.random() > .5 ? "circle" : "rect";
    this.trainSize = new Vector2(
      50 + Math.round(Math.random() * 50),
      70 + Math.round(Math.random() * 50)
    );
    this.stopTime = 30;
    this.doorTime = 5;
    this.durationMultiplier = this.subway.durationMultiplier || 1; //train slowness

    this.subway.lines.push(this);
  }

  calculateStations() {
    let stationsOffset = new Vector2(this.subway.stationSpacing/2, this.subway.stationSpacing/2);
    let stationSize = new Vector2(this.subway.stationSpacing, this.subway.stationSpacing);

    for (let station of this.subway.stations) {
      let sp = station.position.sub(stationsOffset);

      if (
        (
          this.type == "circle" &&
          rectCircleBorder(sp, stationSize, this.position, this.radius)
        ) ||
        (
          this.type == "line" &&
          lineRect(this.p1, this.p2, sp, stationSize)
        )
      ) {
        this.stations.push(station);
        station.lines.push(this);
      }
    }

    if (this.stations.length < 2) {
      this.subway.lines.splice(this.subway.lines.indexOf(this), 1);
      for (let station of this.stations) {
        station.lines.splice(station.lines.indexOf(this), 1);
      }
      return;
    }

    if (this.type == "circle") {
      // sort stations clockwise

      let center = this.position;
      this.stations.sort(function(a,b) {
        return clockwiseSort(a.position, b.position, center)
      });
    } else {
      // sort stations by distance to p1

      let point = this.p1.y < this.p2.y ? this.p1 : this.p2;
      this.stations.sort(function(a,b) {
        return a.position.distanceTo(point) > b.position.distanceTo(point) ? 1 : -1;
      });
    }

    this.ogygia = new Ogygia(this);
  }

  generateSegments() {
    this.segments = [];

    for (let i=0; i<this.stations.length; i++) {
      let station = this.stations[i];
      let nextstation = i+1 < this.stations.length ? this.stations[i+1] : null;
      if (nextstation == null && this.type == "circle") nextstation = this.stations[0];
      if (nextstation) {
        this.segments.push({
          a: station.position,
          b: nextstation.position
        })
      }
    }
  }

  generateTrains() {
    this.trains = [];
    let trains = Math.ceil(this.stations.length / 2);

    let cycleLength = 0;
    for (let i=0; i<this.stations.length; i++) {
      let station = this.stations[i];
      let next = i+1 < this.stations.length ? this.stations[i+1] : null;
      if (next == null && this.type == "circle") {
        next = this.stations[0];
      }
      if (next) {
        cycleLength += this.stopTime + this.doorTime * 2;
        cycleLength += station.position.distanceTo(next.position) * this.durationMultiplier;
      }
    }
    let cycleFraction = Math.round(cycleLength / trains);

    for (let i=0; i<trains; i++) {
      let direction;
      if (i%2==1) {
        direction = -1;
      }

      new Train(this, i * cycleFraction, direction); // 30 minutes
    }
  }

  linkingPosition() {
    switch (this.type) {
      case "circle":
        let randomPoint =
          new Vector2(Math.random(), Math.random())
          .normalize()
          .mul(this.radius)
          .add(this.position);

        return randomPoint;
        break;

      case "line":
        return this.p2;
        break;
    }
  }

  drawShape() {
    context.strokeStyle = this.color.toString();

    switch (this.type) {
      case "circle":
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
        context.stroke();
        break;

      case "line":
        context.beginPath();
        context.moveTo(this.p1.x, this.p1.y);
        context.lineTo(this.p2.x, this.p2.y);
        context.stroke();
        break;
    }
  }

  drawSegments() {
    if (!this.segments) return;

    context.strokeStyle = this.color.toString();

    context.lineWidth = this.subway.mapLineWidth;

    for (let segment of this.segments) {
      context.beginPath();
      context.moveTo(segment.a.x, segment.a.y);
      context.lineTo(segment.b.x, segment.b.y);
      context.stroke();
    }

    context.lineWidth = 1;
  }

  drawStations() {
    for (let station of this.stations) {
      station.draw();
    }
  }

  drawTrains() {
    for (let train of this.trains) {
      train.draw();
    }
  }

  updateTrains(dt) {
    for (let train of this.trains) {
      train.update(dt);
    }
  }

  getTransferStations() {
    let transfers = [];
    for (let station of this.stations) {
      if (station.lines.length > 1) transfers.push(station);
    }
    return transfers;
  }

  getRoute(station1, station2, direction) {
    if (
      this.stations.indexOf(station1) == -1 ||
      this.stations.indexOf(station2) == -1
    ) {
      return null;
    }

    let route = [];

    let stationIndex = this.stations.indexOf(station1) - direction;
    let station;

    while (station != station2) {
      stationIndex += direction;

      if (this.type == "line") {
        if (stationIndex < 0 || stationIndex >= this.stations.length)
          return null;
      } else {
        if (stationIndex < 0) stationIndex = this.stations.length - 1;
        if (stationIndex >= this.stations.length) stationIndex = 0;
      }

      station = this.stations[stationIndex];
      route.push({
        station: station,
        line: this,
        direction: direction
      });
    }

    return route;
  }

  getShortestRoute(station1, station2) {
    let routes = [];

    let route1 = this.getRoute(station1, station2, 1);
    if (route1) routes.push(route1);

    if (this.trains.length > 1) {
      let route2 = this.getRoute(station1, station2, -1);
      if (route2) routes.push(route2);
    }

    let shortestRoute = null;
    let shortestRouteLength = Infinity;

    for (let route of routes) {
      if (!route) continue;
      if (route.length < shortestRouteLength) {
        shortestRoute = route;
        shortestRouteLength = route.length;
      }
    }

    return shortestRoute;
  }

  getPreviousStop(station, direction) {
    let index = this.stations.indexOf(station);

    if (this.type == "line") {
      if (index - direction < this.stations.length && index - direction >= 0)
        return this.stations[index - direction];
    } else if (this.type == "circle") {
      if (direction > 0) {
        return this.stations[index-direction] || this.stations[this.stations.length-1];
      } else {
        return this.stations[index-direction] || this.stations[0];
      }
    }

    return null;
  }

  getNextStop(station, direction) {
    let index = this.stations.indexOf(station);

    if (this.type == "line") {
      if (index + direction < this.stations.length && index + direction >= 0)
        return this.stations[index + direction];
    } else if (this.type == "circle") {
      if (direction > 0) {
        return this.stations[index+direction] || this.stations[0];
      } else {
        return this.stations[index+direction] || this.stations[this.stations.length-1];
      }
    }

    return null;
  }
}

class Train {
  constructor(line, timeOffset, direction) {
    this.line = line;
    this.position = new Vector2();
    this.currentData = null;

    this.scene = new TrainScene(this);

    this.generateTimetable(timeOffset, direction);

    this.line.trains.push(this);
  }

  generateTimetable(timeOffset, direction) {
    let stations = this.line.stations;
    let startTime = 5 * 60 * 60 + timeOffset;
    let endTime = startTime + 20 * 60 * 60; // 20 hours

    this.timetable = [];

    //

    let time = startTime;
    let prev_stop = null;
    direction = direction === -1 ? -1 : 1;

    let stationIndex = 0;
    if (direction == -1 && this.line.type == "line") {
      stationIndex = stations.length - 1;
    }

    let this_stop = stations[stationIndex];
    let initialStationIndex = stationIndex;

    let reachedFinalStop = false;

    while (!reachedFinalStop) {
      // determining the next stop...

      stationIndex += direction;

      if (stationIndex >= stations.length || stationIndex < 0) {
        if (this.line.type == "line") {
          direction = direction * -1;
        } else {
          if (stationIndex >= stations.length) stationIndex = 0;
          if (stationIndex < 0) stationIndex = stations.length-1;
        }
      }

      let next_stop = stations[stationIndex];

      // we are now departing [prev_stop] station.

      let subwaytime = time;
      while (subwaytime >= 24 * 60 * 60) subwaytime -= 24 * 60 * 60;

      this.timetable.push({
        type: "departure",
        time: subwaytime,
        prev_stop: prev_stop, //departure from
        this_stop: this_stop, //headed to
        next_stop: next_stop,
        direction: direction
      });

      if ((!next_stop || !this_stop) && this.line.type == "line") {
        this.timetable[this.timetable.length - 1].direction *= -1;
      }

      // train is moving...

      let distance = 0;
      if (!prev_stop || !this_stop) {
        distance = this.line.subway.stationSpacing;
      } else {
        distance = prev_stop.position.distanceTo(this_stop.position);
      }
      time += distance * this.line.durationMultiplier;

      // we have arrived at [this_stop] station.

      subwaytime = time;
      while (subwaytime >= 24 * 60 * 60) subwaytime -= 24 * 60 * 60;

      this.timetable.push({
        type: "arrival",
        time: subwaytime,
        prev_stop: prev_stop,
        this_stop: this_stop, //arrived at
        next_stop: next_stop, //next destination
        direction: direction,
        last_stop: !next_stop //end of the line...
      });

      if (!next_stop && this.line.type == "line") {
        this.timetable[this.timetable.length - 1].direction *= -1;
      }

      // train is stopped...

      time += this.line.doorTime;
      time += this.line.stopTime;
      time += this.line.doorTime;

      //

      prev_stop = this_stop;
      this_stop = next_stop;

      if (time >= endTime) {
        if (
          this.line.type == "line" && next_stop == null ||
          this.line.type == "circle" && stationIndex == initialStationIndex
        ) {
          reachedFinalStop = true;

          this.timetable[this.timetable.length - 1].last_stop = true;

          subwaytime = time;
          while (subwaytime >= 24 * 60 * 60) subwaytime -= 24 * 60 * 60;

          this.timetable.push({
            type: "departure",
            time: subwaytime,
            prev_stop: prev_stop,
            this_stop: null,
            next_stop: stations[initialStationIndex],
            direction: direction * -1
          });

          time += this.line.subway.stationSpacing * this.line.durationMultiplier;

          subwaytime = time;
          while (subwaytime >= 24 * 60 * 60) subwaytime -= 24 * 60 * 60;

          this.timetable.push({
            type: "arrival",
            time: subwaytime,
            prev_stop: prev_stop,
            this_stop: null,
            next_stop: stations[initialStationIndex],
            direction: direction * -1
          })
        }
      }
    }
  }

  draw() {
    if (this.position) {
      context.fillStyle = this.line.color.toString();
      context.fillRect(this.position.x - 5, this.position.y - 5, 10, 10);
    }
  }

  locationAtTime(time) {
    while (time > 24 * 60 * 60) time -= 24 * 60 * 60;

    for (let i=0; i<this.timetable.length; i++) {
      let earlier = this.timetable[i];
      let later = i+1<this.timetable.length ? this.timetable[i+1] : this.timetable[0];

      let et = earlier.time;

      if (earlier.time > later.time) {
        et -= 24 * 60 * 60;
      }

      if (time >= et && time < later.time) {
        let active = !!earlier.this_stop;
        let stopped = earlier.type == "arrival";
        let elapsed = time - et;
        let t = stopped ? 0 : elapsed / (later.time - et);
        let doors_open = elapsed >= this.line.doorTime && elapsed < (later.time - et) - this.line.doorTime && stopped;

        let door_t = 0;
        if (stopped) {
          door_t = 1;

          if (!doors_open) {
            if (elapsed < this.line.doorTime) {
              door_t = elapsed / this.line.doorTime;
            } else {
              door_t = (later.time - time) / this.line.doorTime;
            }
          }
        }

        let doors_closing = later.time - time < this.line.doorTime + 5;

        return {
          active: active,
          stopped: stopped,
          prev_stop: earlier.prev_stop,
          this_stop: earlier.this_stop,
          next_stop: earlier.next_stop,
          direction: earlier.direction,
          doors_open: doors_open,
          doors_closing: doors_closing,
          t: smoothstep(t),
          unsmoothed_t: t,
          door_t: smoothstep(door_t),
        }
      }
    }
  }

  update(dt) {
    let data = this.locationAtTime(this.line.subway.time);

    if (data.active && data.this_stop) {
      if (data.stopped) {
        this.position = data.this_stop.position;
      } else if (data.prev_stop) {
        this.position = data.prev_stop.position.lerp(data.this_stop.position, data.t);
      } else {
        this.position = null;
      }
    } else {
      this.position = null;
    }

    this.currentData = data;
  }
}

class Station {
  constructor(subway, position) {
    this.subway = subway;
    this.position = position;
    this.lines = [];

    this.dotImage = images.dots[images.dots.length * Math.random() | 0];
    this.dotOffset = new Vector2(Math.random() - .5, Math.random() - .5).normalize().mul(2);

    this.nameColor = LINES_COLOR;

    this.subway.stations.push(this);
  }

  createScene() {
    let ri = STATION_NAMES.length * Math.random() | 0;
    this.name = STATION_NAMES[ri];
    STATION_NAMES.splice(ri, 1);

    let lines = this.lines.length;

    this.scene = new StationScene(this);

    if (STATION_NAMES.length == 0) {
      restockStationNames();
    }
  }

  draw() {
    if (subway.currentScene == this.scene) {
      let star = images.map.star;
      let width = star.width;
      let height = star.height;
      context.drawImage(star, this.position.x - width/2, this.position.y - height/2);
    } else {
      let w = this.dotImage.width/1.5;
      let h = this.dotImage.height/1.5;
      context.drawImage(this.dotImage, this.position.x - w/2 + this.dotOffset.x, this.position.y - h/2 + this.dotOffset.y, w, h);
    }
  }

  drawName() {
    context.fillStyle = this.nameColor;
    context.font = subway.stationNameFont;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(this.name, this.position.x + subway.mapStationRadius + this.dotOffset.x, this.position.y + subway.mapStationRadius + this.dotOffset.y);
  }

  sharedLines(station) {
    let sharedLines = [];

    for (let line of this.lines) {
      if (station.lines.indexOf(line) != -1) {
        sharedLines.push(line);
      }
    }

    return sharedLines;
  }
}

class Ogygia {
  constructor(line) {
    this.subway = line.subway;
    this.lines = [line];
    this.name = "";
    this.scene = new OgygiaScene(this);
  }

  sharedLines(station) {
    let sharedLines = [];

    for (let line of this.lines) {
      if (station.lines.indexOf(line) != -1) {
        sharedLines.push(line);
      }
    }

    return sharedLines;
  }
}
