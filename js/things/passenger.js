class Passenger extends PhysicalThing {
  constructor(p) {
    super(p);

    p = p || {};
    this.tag = "passenger";

    this.colorOrigin = p.color || new RGBA(30, 30, 30);
    this.fill = p.fill == null ? false : p.fill;

    this.radius = p.radius == null ? 5 : p.radius;
    this.avoidanceRadius = p.avoidanceRadius == null ? Math.random() * 15 + 5 : p.avoidanceRadius;

    if (Math.random() > .5) {
      // this.speakingRadius = 50;
      this.volumeRadius = 150;
      // this.dialogueHowl = sounds["dialogue-random"][sounds["dialogue-random"].length * Math.random() | 0];
    }

    this.routePreference = Math.random() > .5 ? "simple" : "short";

    this.home = this.scene.station;
    this.isTraveling = p.isTraveling != null ? p.isTraveling : true;

    this.interacting = false;
  }

  setDestination() {
    if (this.scene.tag == "station" && this.scene.station == this.home) {
      let potentialDestinations = [];
      for (let station of subway.stations) {
        if (station == this.home) continue;
        for (let i=0; i<station.lines.length; i++) {
          potentialDestinations.push(station);
        }
      }
      this.destination = potentialDestinations[potentialDestinations.length * Math.random() | 0];
    } else {
      this.destination = this.home;
    }

    if (this.group && this == this.group.head) {
      for (let passenger of this.group.passengers) {
        if (passenger == this) continue;
        passenger.destination = this.destination;
      }
    }
  }

  enter(scene) {
    if (scene == this.scene) return;

    this.scene = scene;
    this.scene.things.push(this);

    if (this == player) {
      subway.setScene(scene);
    }

    if (scene.tag == "station") {
      this.route = null;
      if (scene == this.home) {
        this.destination = null;
      }
    }
  }

  draw() {
    this.drawSelf();
    this.drawAvoidanceRadius();

    if (this.group) {
      this.drawGroupLines();
    }

    if (this.dialogueId) this.drawSpeakingRadius();
  }

  drawSpeakingRadius() {
    // RADIUS OPTION 1

    // let rings = 3;
    //
    // let minRadius = this.avoidanceRadius + this.radius;
    // let maxRadius = this.radius + this.volumeRadius;
    // for (let i=this.dialogue.currentTime%1; i<=rings; i++) {
    //   let radius = minRadius + ((maxRadius - this.avoidanceRadius) * i/rings);
    //   let alpha = (1 - (i - 1)/rings)/2;
    //   context.strokeStyle = "rgba(191, 212, 217, "+alpha+")";
    //   context.beginPath();
    //   context.arc(this.position.x, this.position.y, radius, 0, Math.PI*2);
    //   context.stroke();
    // }

    // RADIUS OPTION 1+

    // let radius = minRadius;
    // let alpha = 1;
    // context.strokeStyle = "rgba(191, 212, 217, "+alpha+")";
    // context.beginPath();
    // context.arc(this.position.x, this.position.y, radius, 0, Math.PI*2);
    // context.stroke();


    // RADIUS OPTION 2

    // let x = this.position.x;
    // let y = this.position.y;
    //
    // let gradient = context.createRadialGradient(x, y, 0, x, y, this.volumeRadius * 1.5);
    // gradient.addColorStop(0, "rgba(191, 212, 217, .1)");
    // gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    //
    // context.fillStyle = gradient;
    // context.beginPath();
    // context.arc(x, y, this.radius + this.volumeRadius, 0, Math.PI * 2);
    // context.fill();

    // RADIUS OPTION 2+

    // context.strokeStyle = "rgba(191, 212, 217, .3)";
    // context.stroke();


    // LABEL OPTION

    context.font = "13px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";

    // let ellipses = "";
    // let ellipseSpeed = 2;
    // for (let i=1; i<(this.dialogue.currentTime * ellipseSpeed)%4; i++) {
    //   ellipses += ".";
    // }

    context.fillStyle = "rgba(157, 193, 201, "+Math.max(this.dialogueHowl.volume(null, this.dialogueId), .2)+")";
    context.fillText("talking", this.position.x, this.position.y - this.radius);
  }

  drawSelf() {
    let color = new RGBA(this.colorOrigin);

    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);

    if (this.collisionsCounter > 0) {
      this.collisionsCounter--;

      color.r += this.collisionsCounter/60;
      color.g += this.collisionsCounter/300;
      color.b += this.collisionsCounter/600;
    }

    context.fillStyle = color.toString();
    if (this.fill) {
      context.fill();
    } else {
      context.strokeStyle = color.toString();
      context.stroke();
    }

    if (this.label) {
      context.font = "13px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(this.label, this.position.x, this.position.y + this.radius);
    }

    this.color = color;
  }

  drawAvoidanceRadius() {
    let color = this.color;

    context.strokeStyle = new RGBA(color.r, color.g, color.b, .05).toString();
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius + this.avoidanceRadius, 0, Math.PI * 2);
    context.stroke();
  }

  drawGroupLines() {
    context.strokeStyle = GROUP_LINES_COLOR;

    for (let passenger of this.group.passengers) {
      if (passenger == this || passenger.scene != this.scene) continue;

      let distance = Math.max(this.position.distanceTo(passenger.position), .01);
      let radius = this.radius + this.avoidanceRadius + passenger.radius;

      if (distance < radius) {
        let direction = passenger.position.sub(this.position).jiggle(1).normalize();
        // let p1 = new Vector2(this.position.x, this.position.y).add(direction.mul(this.radius));
        // let p2 = new Vector2(passenger.position.x, passenger.position.y).sub(direction.mul(passenger.radius));
        let p1 = this.position;
        let p2 = passenger.position;

        context.beginPath();
        context.moveTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
      }
    }
  }

  update(dt) {
    this.direction = new Vector2();

    if (!this.unpushable && this.avoidanceRadius > 0) {
      this.direction = this.direction.add(
        this.avoidPhysicalThings()
        .mul(.3 * dt/10)
      );
    }

    if (!this.dialogueId) {
      if (this.group) {
        this.direction = this.direction.add(
          this.followGroup()
          .mul(this.group.strength * dt/10)
        );
      }

      if (this.isTraveling) {
        this.direction = this.direction.add(
          this.headToDestination()
          .mul(dt/10)
        );
      }
    }

    this.direction = this.direction.normalize();

    this.move(dt);

    if (this.dialogueHowl) this.speak();
  }

  speak() {
    if (player && player.scene == this.scene) {
      if (!this.dialogueEnded && !this.dialogueId) {
        let someoneElseTalking = false;

        for (let passenger of this.scene.things) {
          if (passenger.tag != "passenger" || passenger == this) continue;
          if (
            passenger.dialogueId &&
            passenger.position.distanceTo(this.position) <= this.radius + this.volumeRadius + passenger.radius + passenger.volumeRadius
          ) {
            someoneElseTalking = true;
            break;
          }
        }

        if (!someoneElseTalking) {
          let distance = this.position.distanceTo(player.position);

          if (this.speakingRadius) {
            let radius = this.radius + this.speakingRadius + player.radius;
            if (distance <= this.radius + this.speakingRadius + player.radius) {
              this.startSpeaking();
            }
          } else {
            this.startSpeaking();
          }
        }
      }
    } else {
      this.stopSpeaking();
    }

    if (this.dialogueId) {
      let mar = Math.max(this.avoidanceRadius, player.avoidanceRadius);
      let distance = this.position.distanceTo(player.position) - mar;
      let radius = this.radius + this.volumeRadius + player.radius - mar;
      let volume = 1 - Math.max(Math.min((distance - this.radius)/radius, 1), 0);

      let d = this.position.sub(player.position).normalize();
      let pan = Math.min(Math.max(d.x, -.5), .5);

      this.dialogueHowl.volume(volume, this.dialogueId);
      this.dialogueHowl.stereo(pan, this.dialogueId);
    }
  }

  startSpeaking() {
    if (this.dialogueId) return;

    this.dialogueId = this.dialogueHowl.play();
    this.dialogueHowl.once("end", function() {
      this.dialogueEnded = true;
      this.stopSpeaking();
    }.bind(this), this.dialogueId);
  }

  stopSpeaking() {
    if (!this.dialogueId) return;

    this.dialogueHowl.stop(this.dialogueId);
    this.dialogueId = null;
  }

  avoidPhysicalThings() {
    let desiredDirection = new Vector2();

    for (let thing of this.scene.things) {
      if (!thing.isPhysical || thing == this) continue;
      if (player == this && !thing.radius) continue;

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

  followGroup() {
    let desiredDirection = new Vector2();

    for (let passenger of this.group.passengers) {
      if (passenger == this || passenger.scene != this.scene) continue;

      let distance = Math.max(this.position.distanceTo(passenger.position), .01);
      let radius = this.radius + this.avoidanceRadius + passenger.radius;
      if (distance > radius) {
        let direction = passenger.position.sub(this.position).jiggle(1).normalize();
        let followStrength = distance;
        desiredDirection = desiredDirection.add(direction.mul(followStrength));
      }
    }

    return desiredDirection.normalize();
  }

  headToDestination() {
    let desiredDirection = new Vector2();

    if (this.isTraveling && !this.destination) {
      if (this.group) {
        if (this == this.group.head) {
          let groupTogether = true;
          for (let passenger of this.group.passengers) {
            if (passenger.scene != this.scene) {
              groupTogether = false;
              break;
            }
          }
          if (groupTogether) {
            this.setDestination();
          }
        }
      } else {
        this.setDestination();
      }
    }

    if (this.destination && !this.route && this.scene.tag == "station") {
      let station = this.scene.station;
      if (this.routePreference == "simple") {
        this.route = subway.getSimplestRoute(station, this.destination);
      } else {
        this.route = subway.getShortestRoute(station, this.destination);
      }
    }

    if (this.route) {
      let route = this.route.route;
      let direction = route[0].direction;

      if (!route[1] || !route[1].station) {
        console.log(this.home, this.destination, this.route);
      }

      let nextStation = route[1].station;

      if (this.scene.tag == "train") {
        let train = this.scene.train;
        // are the doors open ?
        // is the train stopped at the station i need to get off at?
        // which way do i walk to get out of the train?

        // if the doors are not open, just sort of wander...
      } else {
        let line = route[1].line;
        let station = this.scene.station;
        let doors = station.doors;

        // which door ?
        // pathfinding to door

        // if the door's open, i wanna enter
        // if not, wander around it ..? or stop in front of it
      }
    }

    return desiredDirection;
  }
}

class Group {
  constructor(passengers) {
    this.passengers = passengers || [];
    this.strength = .3;
    this.head = this.passengers[0];

    for (let passenger of this.passengers) {
      passenger.group = this;
      passenger.routePreference = this.head.routePreference;
    }
  }
}
