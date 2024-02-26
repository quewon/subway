class Ghost extends PhysicalThing {
    constructor(p) {
        super(p);
        p = p || {};
        this.tag = "ghost";
        this.unpushable = true;

        this.radius = 30;
        this.speed = p.speed == null ? 3 : p.speed;

        this.stomach = [];
        this.stomachCapacity = 10;
    }

    drawSelf() {
        let color = OGYGIA_COLOR;

        context.fillStyle = color.toString();
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
        context.strokeStyle = context.fillStyle;
        context.stroke();
    }

    draw() {
        this.drawSelf();
    }

    update(dt) {
        this.direction = new Vector2();

        if (this.stomach.length < this.stomachCapacity) {
            for (let thing of this.scene.things) {
                if (thing == this || !thing.isPhysical) continue;
                let collides = false;
                if (thing.radius) {
                    collides = thing.position.distanceTo(this.position) <= thing.radius + this.radius;
                } else if (thing.size) {
                    collides = circleRect(this.position, this.radius, thing.position, thing.size);
                }
                if (collides) {
                    this.eat(thing);
                }
            }

            this.lookForFood();
        } else {
            this.lookForOgygia();
        }

        // this.headToDestination();

        this.move(dt);
    }

    eat(thing) {
        if (this.stomach.indexOf(thing) != -1) return;

        this.stomach.push(thing);
        thing.ghost = this;
    }

    uneat(thing) {
        let index = this.stomach.indexOf(thing);
        this.stomach.splice(index, 1);
        thing.ghost = null;
    }

    lookForFood() {
        let scene = this.scene;
        if (scene.tag == "train") {

        } else if (scene.tag == "station") {
            let closestTrainScene;
            let closestTrainDistance = Infinity;
            for (let info of scene.trainsHere) {
                if (info.data.doors_open) {
                    let distance = this.position.distanceTo(info.position);
                    if (distance < closestTrainDistance) {
                        closestTrainScene = info.scene;
                        closestTrainDistance = distance;
                    }
                }
            }

            if (closestTrainScene) {
                this.destination = closestTrainScene;
            } else {

            }
        }
    }

    lookForOgygia() {

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
}