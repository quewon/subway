class Passenger extends PhysicalThing {
  constructor(p) {
    super(p);

    p = p || {};
    this.tag = "passenger";

    this.radius = p.radius == null ? 5 : p.radius;
    this.avoidanceRadius = p.avoidanceRadius == null ? Math.random() * 15 + 5 : p.avoidanceRadius;
    this.avoidMultiplier = .3;
    this.navigationMultiplier = .3;

    if (Math.random() > .5) {
      this.speakingRadius = 50;
      this.volumeRadius = 150;
      this.dialogueHowl = sounds["dialogue/stranger/solo"][sounds["dialogue/stranger/solo"].length * Math.random() | 0];
    }

    this.routePreference = Math.random() > .5 ? "simple" : "short";
    this.aimForHallCenter = true;

    this.home = this.scene.station;
    this.isTraveling = p.isTraveling != null ? p.isTraveling : true;

    this.interacting = false;

    this.deselect();
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

    if (scene.tag == "station") {
      this.route = null;
      if (scene == this.home) {
        this.destination = null;
      }
    }

    if (this == player) {
      subway.setScene(scene);
    }
  }

  draw() {
    if (player && player == this) {
      if (this.playerDestination && this.playerDestinationConfiner && !this.interacting) {
        let p = this.playerDestination;
        if (this.scene != this.playerDestinationScene) {
          if (this.scene.tag == "train") {
            p = p.sub(this.scene.cameraOffset);
          } else {
            p = p.add(this.playerDestinationScene.cameraOffset);
          }
        }
        context.strokeStyle = GROUP_LINES_COLOR;
        context.beginPath();
        context.arc(p.x, p.y, this.radius + this.avoidanceRadius, 0, TWOPI);
        context.stroke();
      }
      
      let p = mouse.gamePosition.sub(this.scene.cameraOffset);
      context.strokeStyle = "rgba(0,0,0,.3)";
      context.beginPath();
      context.arc(p.x, p.y, this.radius + this.avoidanceRadius, 0, TWOPI);
      context.setLineDash([3]);
      context.stroke();
      context.setLineDash([]);
    }

    this.drawSelf();
    this.drawAvoidanceRadius();

    if (this.group) {
      this.drawGroupLines();
    }

    if (this.dialogueId) this.drawSpeakingRadius();
  }

  deselect() {
    if (this == player) player = null;
    this.colorOrigin = new RGBA();
    this.label = null;
    this.selected = false;

    this.playerDestination = null;
    this.playerDestinationScene = null;
    this.playerDestinationConfiner = null;
    this.interacting = null;
  }

  select() {
    player.deselect();
    player = this;
    this.colorOrigin = new RGBA(238,21,21);
    this.label = "you";
    if (this.dialogueId) {
      this.stopSpeaking();
    }
    this.selected = true;

    subway.currentScene = this.scene;
  }

  drawSpeakingRadius() {
    // LABEL OPTION

    context.font = "13px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";

    context.fillStyle = "rgba(157, 193, 201, "+Math.max(this.dialogueHowl.volume(null, this.dialogueId), .2)+")";
    context.fillText("talking", this.position.x, this.position.y - this.radius);
  }

  drawSelf() {
    let color = new RGBA(this.colorOrigin);

    if (this.collisionsCounter > 0) {
      this.collisionsCounter--;

      color.r += this.collisionsCounter/60;
      color.g += this.collisionsCounter/300;
      color.b += this.collisionsCounter/600;
    }

    context.fillStyle = color.toString();
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
    if (player == this) {
      context.fill();
    } else {
      context.strokeStyle = context.fillStyle;
      context.stroke();
    }

    // context.font = "13px sans-serif";
    // context.textAlign = "center";
    // context.textBaseline = "middle";
    // context.fillText(this.icon, this.position.x, this.position.y);

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
    context.arc(this.position.x, this.position.y, this.radius + this.avoidanceRadius, 0, TWOPI);
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
        .mul(this.avoidMultiplier * dt/10)
      );
    }

    if (player != this) {
      if (this.group) {
        this.direction = this.direction.add(
          this.followGroup()
          .mul(this.group.strength * dt/10)
        );
      }
  
      if (this.isTraveling) {
        this.direction = this.direction.add(
          this.headToDestination()
          .mul(this.navigationMultiplier * dt/10)
        );
      }
    } else {
      this.direction = this.headToPlayerDestination();
    }

    this.direction = this.direction.normalize();

    this.move(dt);

    if (player != this && this.dialogueHowl) this.speak();

    this.updateInteractionState();
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

  headToPlayerDestination() {
    let direction = new Vector2();

    let destination = this.playerDestination;
    let scene = this.playerDestinationScene;

    if (scene && this.scene != scene) {
      if (this.scene.tag == "train") {
        let train = this.scene.train;
        let data = train.currentData;
        let confiner = this.scene.confiners[0];
        let confinerCenter = confiner.position.add(confiner.size.div(2));

        if (data.doors_open) {
          let desiredPosition = new Vector2(confiner.size.x/2 * data.direction * -1, 0).add(confinerCenter);
          direction = desiredPosition.sub(this.position);

          let linkedScene = train.scene.linkedScene;
          let station = linkedScene.station;

          if (this.linkedScene == linkedScene) {
            this.moveToLinkedScene();
            let platform = linkedScene.platformConfiners[station.lines.indexOf(train.line)];
            this.previousConfiner = platform;
          }
        }
      } else if (this.scene.tag == "station") {
        let train = scene.train;
        let line = train.line;
        let lineIndex = this.scene.station.lines.indexOf(line);
        let platform = this.scene.platformConfiners[lineIndex];

        let confiner = this.previousConfiner;
        if (confiner.isHall) {
          let hall = confiner;
          let hallCenter = hall.position;
          if (this.aimForHallCenter) {
            let hallRadius;
            if (hall.radius) {
              hallRadius = hall.radius;
            } else {
              hallRadius = Math.min(hall.size.y/2, hall.size.x/2);
              hallCenter = hall.position.add(hall.size.div(2));
            }

            if (this.position.distanceTo(hallCenter) <= hallRadius/2) {
              this.aimForHallCenter = false;
            }

            direction = hallCenter.sub(this.position);
          } else {
            let platformCenter = platform.position.add(platform.size.div(2));
            let distance = platformCenter.sub(this.position);

            if (Math.abs(distance.x) > platform.size.x) {
              direction = new Vector2(distance.x, hallCenter.y - this.position.y);
            } else {
              direction = distance;
            }
          }
        } else if (confiner.isPlatform) {
          if (confiner == platform) {
            let platformCenter = platform.position.add(platform.size.div(2));
            let info = null;

            for (let i of this.scene.trainsHere) {
              if (i.scene == scene && i.scene.doors[i.index % 2].open) {
                info = i;
              }
            }

            if (info) {
              let desiredPosition = platformCenter.add(new Vector2((platform.size.x/2 + 30) * info.data.direction, 0));
              direction = desiredPosition.sub(this.position);

              if (this.linkedScene == scene) {
                this.moveToLinkedScene();
                this.previousConfiner = scene.confiners[0];
              }
            } else {
              this.playerDestination = null;
              this.playerDestinationScene = null;
              this.playerDestinationConfiner = null;
            }
          } else {
            this.aimForHallCenter = true;
            let confinerCenter = confiner.position.add(confiner.size.div(2));
            direction = new Vector2(0, Math.sign(-confinerCenter.y));
          }
        } else { //bridge
          let platformCenter = platform.position.add(platform.size.div(2));
          direction = platformCenter.sub(this.position);
          direction = new Vector2(direction.x, 0);

          this.aimForHallCenter = true;
        }
      }
    } else if (destination && this.playerDestinationConfiner) {
      let confiner = this.previousConfiner;
      let dconfiner = this.playerDestinationConfiner;

      if (confiner == dconfiner) {
        direction = destination.sub(this.position);

        if (this.position.distanceTo(destination) <= this.radius) {
          this.playerDestination = null;
          this.playerDestinationScene = null;
          this.playerDestinationConfiner = null;
        }
      } else {
        if (this.scene.tag == "station" && dconfiner) {
          if (confiner.isHall) {
            let hall = confiner;
            let hallCenter = hall.position;

            if (this.aimForHallCenter) {
              let hallRadius;
              if (hall.radius) {
                hallRadius = hall.radius;
              } else {
                hallRadius = Math.min(hall.size.y/2, hall.size.x/2);
                hallCenter = hall.position.add(hall.size.div(2));
              }
  
              if (this.position.distanceTo(hallCenter) <= hallRadius/2) {
                this.aimForHallCenter = false;
              }
  
              direction = hallCenter.sub(this.position);
            } else {
              let center = dconfiner.position;
              if (!dconfiner.radius) {
                center = center.add(dconfiner.size.div(2));
              }
              let distance = center.sub(this.position);

              if (dconfiner.isPlatform && Math.abs(distance.x) > dconfiner.size.x) {
                direction = new Vector2(distance.x, hallCenter.y - this.position.y);
              } else {
                direction = distance;
              }
            }
          } else if (confiner.isPlatform) {
            this.aimForHallCenter = true;

            if (dconfiner.isHall) {
              if (dconfiner.radius) {
                this.aimForHallCenter = !circleRect(dconfiner.position, dconfiner.radius, confiner.position, confiner.size);
              } else {
                this.aimForHallCenter = !rectRect(confiner.position, confiner.size, dconfiner.position, dconfiner.size);
              }
            }

            let confinerCenter = confiner.position.add(confiner.size.div(2));
            direction = new Vector2(0, Math.sign(-confinerCenter.y));
          } else { //bridge
            let center = dconfiner.position;
            if (!dconfiner.radius) {
              center = center.add(dconfiner.size.div(2));
            }
            direction = center.sub(this.position);
            direction = new Vector2(direction.x, 0);
  
            this.aimForHallCenter = true;
          }
        }
      }
    }

    return direction;
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

    if (this.scene.tag == "ogygia" && this.previousConfiner) {
      let line = this.scene.station.lines[0];
      let ogygia = this.scene.station;
      let platform = this.scene.platformConfiners[0];

      let inPlatform = this.previousConfiner.isPlatform;

      if (inPlatform) {
        let platformCenter = platform.position.add(platform.size.div(2));

        let trainHere = null;
        let direction;
        for (let info of this.scene.trainsHere) {
          if (
            info.scene.train.line == line &&
            info.scene.doors[info.index % 2].open
          ) {
            trainHere = info.scene.train;
            direction = info.data.direction;
            break;
          }
        }

        if (trainHere) {
          let desiredPosition = platformCenter.add(new Vector2((platform.size.x/2 + 30) * direction, 0));
          desiredDirection = desiredPosition.sub(this.position);

          if (this.linkedScene == trainHere.scene) {
            this.moveToLinkedScene();
            this.previousConfiner = trainHere.scene.confiners[0];
          }
        } else {
          let desiredPosition = platformCenter;
          return desiredPosition.sub(this.position).normalize().mul(.5);
        }
      } else {
        return new Vector2(1, 0);
      }

      return;
    }

    if (
      !this.destination ||
      this.scene.tag == "station" && this.destination == this.scene.station
    ) {
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

    if (this.destination) {
      if (!this.route) {
        let station;
        if (this.scene.tag == "station") {
          station = this.scene.station;
        } else {
          station = this.scene.train.currentData.this_stop;
        }

        if (station) {
          if (this.routePreference == "simple") {
            this.route = subway.getSimplestRoute(station, this.destination);
          } else {
            this.route = subway.getShortestRoute(station, this.destination);
          }
        } else {
          this.route = null;
        }
      }

      if (this.route) {
        let route = this.route.route;
        let direction = route[0].direction;

        if (this.scene.tag == "train") {
          let train = this.scene.train;
          let data = train.currentData;
          let confiner = this.scene.confiners[0];
          let confinerCenter = confiner.position.add(confiner.size.div(2));

          if (route.length == 1) {
            if (data.doors_open) {
              let desiredPosition = new Vector2(confiner.size.x/2 * direction * -1, 0).add(confinerCenter);
              desiredDirection = desiredPosition.sub(this.position);

              if (this.linkedScene == this.destination.scene) {
                this.moveToLinkedScene();
                let platform = this.destination.scene.platformConfiners[this.destination.lines.indexOf(train.line)];
                this.previousConfiner = platform;
              }
            }
          } else {
            let nextStation = route[1].station;

            if (data.doors_open) {
              let desiredPosition = new Vector2(confiner.size.x/2 * data.direction, 0).add(confinerCenter);
              return desiredPosition.sub(this.position).normalize().mul(.5);
            }
          }
        } else if (this.scene.tag == "station" && this.previousConfiner) {
          let line = route[0].line;
          let station = this.scene.station;
          let lineIndex = station.lines.indexOf(line);
          let platform = this.scene.platformConfiners[lineIndex];

          let inPlatform = this.previousConfiner.isPlatform;

          if (inPlatform && this.previousConfiner != platform) {
            // in a different platform

            this.aimForHallCenter = true;

            let confinerCenter = this.previousConfiner.position.add(this.previousConfiner.size.div(2));
            direction = new Vector2(0, Math.sign(-confinerCenter.y));
          } else if (!inPlatform) {
            let hall = this.previousConfiner;

            if (hall.isHall) {
              let hall = this.previousConfiner;
              let hallCenter = hall.position;
              if (this.aimForHallCenter) {
                let hallRadius;
                if (hall.radius) {
                  hallRadius = hall.radius;
                } else {
                  hallRadius = Math.min(hall.size.y/2, hall.size.x/2);
                  hallCenter = hall.position.add(hall.size.div(2));
                }

                if (this.position.distanceTo(hallCenter) <= hallRadius/2) {
                  this.aimForHallCenter = false;
                }

                desiredDirection = hallCenter.sub(this.position);
              } else {
                let platformCenter = platform.position.add(platform.size.div(2));
                let distance = platformCenter.sub(this.position);

                if (Math.abs(distance.x) > platform.size.x) {
                  desiredDirection = new Vector2(distance.x, hallCenter.y - this.position.y);
                } else {
                  desiredDirection = distance;
                }
              }
            } else {
              // bridge

              let platformCenter = platform.position.add(platform.size.div(2));
              desiredDirection = platformCenter.sub(this.position);
              desiredDirection = new Vector2(desiredDirection.x, 0);

              this.aimForHallCenter = true;
            }
          } else {
            // in the right platform

            let platformCenter = platform.position.add(platform.size.div(2));

            let trainHere = null;
            // let trainDoor;
            for (let info of this.scene.trainsHere) {
              if (
                info.scene.train.line == line &&
                info.data.direction == direction &&
                info.scene.doors[info.index % 2].open
              ) {
                trainHere = info.scene.train;
                break;
              }
            }

            if (trainHere) {
              let desiredPosition = platformCenter.add(new Vector2((platform.size.x/2 + 30) * direction, 0));
              desiredDirection = desiredPosition.sub(this.position);

              if (this.linkedScene == trainHere.scene) {
                this.moveToLinkedScene();
                this.previousConfiner = trainHere.scene.confiners[0];
              }
            } else {
              let desiredPosition = platformCenter.add(new Vector2(platform.size.x/4 * direction, 0));
              return desiredPosition.sub(this.position).normalize().mul(.5);
            }
          }
        }
      }
    }

    return desiredDirection.normalize();
  }
}

class Group {
  constructor(passengers) {
    this.passengers = passengers || [];
    this.strength = .05;
    this.head = this.passengers[0];

    for (let passenger of this.passengers) {
      passenger.group = this;
      passenger.routePreference = this.head.routePreference;
    }
  }
}
