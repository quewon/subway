class Passenger extends PhysicalThing {
  constructor(p) {
    super(p);

    p = p || {};
    this.tag = "passenger";
    this.name = p.name;
    this.label = p.label;

    this.colorOrigin = new RGBA();
    this.color = new RGBA(this.colorOrigin);

    this.radius = p.radius == null ? 5 : p.radius;
    this.avoidanceRadius = p.avoidanceRadius == null ? Math.random() * 15 + 5 : p.avoidanceRadius;
    this.avoidMultiplier = .3;
    this.navigationMultiplier = .3;

    let voice = "beep";
    let random = Math.random();
    if (random < .2) voice = "beep low";
    else if (random > .8) voice = "beep high";
    this.voice = sounds["sfx"][voice];
    this.dialogueRadius = 150;

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

    if (this.ghost && scene != this.ghost.scene) {
      this.ghost.uneat(this);
    }

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
      // destination

      if (this.playerDestination && this.playerDestinationConfiner && !this.interacting && !this.wantsToLinkTo) {
        let p = this.playerDestination;
        p = p.sub(this.scene.getOffset());

        let scene = this.playerDestinationScene;
        if (
          scene.tag == "train" && scene.linkedScene == this.scene.linkedScene ||
          scene.tag == "train" && scene.linkedScene == this.scene
        ) {
          p = p.add(scene.getOffset());
        }

        context.strokeStyle = this.ghost ? OGYGIA_COLOR : GROUP_LINES_COLOR;
        context.beginPath();
        context.arc(p.x, p.y, this.radius + this.avoidanceRadius, 0, TWOPI);
        context.stroke();
      }
      
      // mouse

      let p = mouse.gamePosition.sub(this.scene.getOffset());
      context.strokeStyle = "rgba(0,0,0,.3)";
      context.beginPath();
      context.arc(p.x, p.y, this.radius + this.avoidanceRadius, 0, TWOPI);
      context.setLineDash([3]);
      context.stroke();
      context.setLineDash([]);
    }

    this.drawSelf();
    this.drawAvoidanceRadius();

    if (this.group && !this.ghost) {
      this.drawGroupLines();
    }
  }

  drawLabels() {
    if (this.label) {
      context.fillStyle = this.ghost ? OGYGIA_COLOR : this.color.toString();
      context.font = "13px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(this.label, this.position.x, this.position.y + this.radius);
    }

    this.drawDialogue();
  }

  resetPlayer() {
    this.colorOrigin = new RGBA();
    this.label = this.name;
    this.selected = false;

    this.playerDestination = null;
    this.playerDestinationScene = null;
    this.playerDestinationConfiner = null;
    this.wantsToLinkTo = null;

    if (this.interacting) {
      this.interacting.onleave(this);
      this.interacting.deselect();
      this.interacting = null;
    }

    player = null;
  }

  deselect() {
    this.resetPlayer();
  }

  select() {
    player.deselect();
    player = this;
    this.colorOrigin = new RGBA(238,21,21);
    this.label = "you";
    this.selected = true;

    subway.currentScene = this.scene;
  }

  drawSelf() {
    let color = new RGBA(this.colorOrigin);

    if (this.collisionsCounter > 0) {
      color.r += this.collisionsCounter/60;
      color.g += this.collisionsCounter/300;
      color.b += this.collisionsCounter/600;
    }

    if (this.ghost) {
      context.fillStyle = OGYGIA_COLOR;
    } else {
      context.fillStyle = color.toString();
    }
    
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
    if (player == this) {
      context.fill();
    } else {
      context.strokeStyle = context.fillStyle;
      context.stroke();
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

    this.updateDialogue(dt);

    this.updateInteractionState();
  }

  updateDialogue(dt) {
    if (!this.dialogue && player != this && !this.ghost) {
      if (!this.dialoguePauseTimer) this.dialoguePauseTimer = 0;
      if (!this.dialoguePauseDuration) this.dialoguePauseDuration = 1000 + Math.random() * 30000;
      this.dialoguePauseTimer += dt;

      if (this.dialoguePauseTimer >= this.dialoguePauseDuration) {
        this.dialoguePauseTimer = 0;
        const dialogue = [
          "hmm",
          "sigh",
          "haha",
          "?",
          "!",
          "where am i?",
          "where do i go?",
          "where to go",
          "where am i going",
          "how to go home",
          "how to get home",
          "coming through",
          "gotta go",
          "oh my",
          "oh",
          "ha",
          "hello",
          "hi",
          "huh",
          "so lost",
          "hey",
          "ah",
          "zzz",
          "z"
        ]
        let string = dialogue[dialogue.length * Math.random() | 0];
        if (Math.random() > .5) string = "... "+string;
        let lastChar = string[string.length - 1];
        if (Math.random() > .5 && lastChar != "?" && lastChar != "!") {
          string += "...";
        }
        this.dialogue = string;
        this.dialogueTimer = 0;
        this.dialogueDuration = (string.length + 2) * 200;

        let scene = this.scene;
        this.exit();
        this.enter(scene);
        if (this.ghost) {
          this.ghost.exit();
          this.ghost.enter(scene);
        }
      }
    }
    
    if (this.dialogue) {
      this.dialogueTimer += dt;
      if (this.dialogueTimer >= this.dialogueDuration) {
        this.dialogue = null;
        this.dialoguePauseDuration = null;
      }
    }
  }

  drawDialogue() {
    if (this.dialogue) {
      let string = this.dialogue.substring(0, this.dialogue.length * (this.dialogueTimer*4/this.dialogueDuration));
      if (player && this.isAudibleTo(player)) {
        if (
          this.previousDialogueString && this.previousDialogueString != string || 
          !this.previousDialogueString && string.length > 0
        ) {
          let char = string[string.length - 1];
          if (char && char.match(/[a-z]/i)) {
            let howl = this.voice;
            let id = howl.play();
            applySpacialAudio(howl, id, this.getGlobalPosition(), player.getGlobalPosition(), this.dialogueRadius);
          }
        }
      }
      this.previousDialogueString = string;

      context.font = "italic 11px sans-serif";
      context.textAlign = "left";
      context.textBaseline = "top";
      let measurements = context.measureText(string);
      let width = measurements.width;
      let height = measurements.fontBoundingBoxDescent;

      let padding = new Vector2(3, 0);
      let box = new Vector2(width + padding.x * 2, height + padding.y * 2);

      let alpha = 0;
      if (player && this.inSameScreen(player)) {
        alpha = 1 - player.getScreenPosition().distanceTo(this.getScreenPosition())/this.dialogueRadius;
      }

      context.fillStyle = BACKGROUND_COLOR;
      context.strokeStyle = this.ghost ? OGYGIA_COLOR : this.color.toString();
      context.beginPath();
      let x = this.position.x - box.x/2;
      let y = this.position.y - this.radius * 2 - box.y;
      context.rect(x, y, box.x, box.y);
      if (alpha > .2) context.fill();

      context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
      context.stroke();

      context.fillStyle = this.color.toString();
      context.fillText(string, x + padding.x, y + padding.y);

      context.globalAlpha = 1;
    }
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
        if (!train) {
          this.playerDestination = null;
          this.playerDestinationScene = null;
          this.playerDestinationConfiner = null;
          return direction;
        }
        let line = train.line;
        if (!line) {
          this.playerDestination = null;
          this.playerDestinationScene = null;
          this.playerDestinationConfiner = null;
          return direction;
        }
        let lineIndex = this.scene.station.lines.indexOf(line);
        if (lineIndex == -1) {
          this.playerDestination = null;
          this.playerDestinationScene = null;
          this.playerDestinationConfiner = null;
          return direction;
        }

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
            let train;

            for (let t of this.scene.trainsHere) {
              let doorIndex = t.currentData.direction > 0 ? 1 : 0;
              if (t.scene == scene && t.scene.doors[doorIndex % 2].open) {
                train = t;
              }
            }

            if (train) {
              let desiredPosition = platformCenter.add(new Vector2((platform.size.x/2 + 30) * train.currentData.direction, 0));
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

            if (this.aimForHallCenter && hallCenter.distanceTo(this.position) < destination.distanceTo(this.position)) {
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
      if (thing.linkedPassenger == this) continue;
      if (thing == this.ghost) continue;

      let position;
      let radius;
      if (thing.size) {
        position = thing.position.add(thing.size.div(2));
        radius = Math.max(thing.size.x, thing.size.y)/2;
      } else if (thing.radius) {
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
        for (let train of this.scene.trainsHere) {
          let doorIndex = train.currentData.direction > 0 ? 1 : 0;
          if (
            train.scene.train.line == line &&
            train.scene.doors[doorIndex].open
          ) {
            trainHere = train.scene.train;
            direction = train.currentData.direction;
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
            for (let train of this.scene.trainsHere) {
              let doorIndex = train.currentData.direction > 0 ? 1 : 0;
              if (
                train.scene.train.line == line &&
                train.currentData.direction == direction &&
                train.scene.doors[doorIndex % 2].open
              ) {
                trainHere = train.scene.train;
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
