class Ghost extends PhysicalThing {
    constructor(p) {
        super(p);
        p = p || {};
        this.tag = "ghost";
        this.unpushable = true;

        this.radius = 30;
        this.volumeRadius = 300;
        this.speed = p.speed == null ? 3 : p.speed;

        this.stomach = [];
        this.stomachCapacity = 10;

        this.soundHowl = sounds["ghost"][sounds["ghost"].length * Math.random() | 0];

        this.direction = new Vector2();
    }

    drawSelf() {
        let distance = this.getGlobalPosition().distanceTo(player.getGlobalPosition());
        context.globalAlpha = Math.min(Math.max(1 - (distance - this.radius)/this.volumeRadius, 0), 1);

        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
        context.strokeStyle = OGYGIA_COLOR;
        context.stroke();
        context.globalAlpha = 1;
    }

    draw() {
        this.drawSelf();
    }

    update(dt) {
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

            // this.lookForFood();
        } else {
            if (this.stomach.length >= this.stomachCapacity) {
                let expelling = this.stomach[0];
                this.uneat(expelling);
                if (expelling.applyForce) {
                    let center = expelling.position;
                    if (expelling.size) center = center.add(expelling.size.div(2));
                    let force = center.sub(this.position).normalize().mul(2);
                    expelling.applyForce(force);
                }
            }

            // this.lookForOgygia();
        }
        
        // this.direction = this.direction.add(
        //     this.headToDestination()
        //     .mul(.3 * dt/10)
        // );

        this.direction = this.direction.add(new Vector2(
            Math.random() - .5,
            Math.random() - .5
        ).mul(dt/100));

        this.direction = this.direction.normalize();

        this.move(dt);

        this.updateSound();
    }

    eat(thing) {
        if (this.stomach.indexOf(thing) != -1) return;
        if (thing.tag == "ghost" || thing.unpushable) return;

        if (thing.ghost) thing.ghost.uneat(thing);

        this.stomach.push(thing);
        thing.ghost = this;

        let scene = this.scene;
        this.exit();
        this.enter(scene);
    }

    uneat(thing) {
        let index = this.stomach.indexOf(thing);
        this.stomach.splice(index, 1);
        thing.ghost = null;
    }

    // lookForFood() {
    //   let scene = this.scene;
    //   if (scene.tag == "train") {
    //     if (scene.linkedScene) {
    //         this.destination = scene.linkedScene;
    //     }
    //   } else if (scene.tag == "station") {
    //     let closestTrainScene;
    //     let closestTrainDistance = Infinity;
    //     for (let train of scene.trainsHere) {
    //         if (train.currentData.doors_open) {
    //             let position = scene.getTrainPosition(train).add(scene.getTrainTravelVector(train));
    //             let distance = this.position.distanceTo(position);
    //             if (distance < closestTrainDistance) {
    //                 closestTrainScene = train.scene;
    //                 closestTrainDistance = distance;
    //             }
    //         }
    //     }

    //     if (closestTrainScene) {
    //         this.destination = closestTrainScene;
    //     }
    //   }
    // }

    // lookForOgygia() {
    //     let station;
    //     if (scene.tag == "station") {
    //         station = scene.station;
    //     } else if (scene.tag == "train") {
    //         station = scene.getNearbyStop();
    //     }
    //     let route = subway.getSimplestOgygiaRoute(station);
    // }

    // headToDestination() {

    // }

    startSinging() {
        if (this.soundId) return;
        this.soundId = this.soundHowl.play();
        this.soundHowl.loop(true, this.soundId);
    }

    stopSinging() {
        if (!this.soundId) return;
        this.soundHowl.stop(this.soundId);
        this.soundId = null;
    }

    updateSound() {
        let withPlayer = player && this.isAudibleTo(player);
        if (withPlayer && !this.soundId) {
            this.startSinging();
        } else if (!withPlayer && this.soundId) {
            this.stopSinging();
        }

        if (this.soundId && player) {
            if (player.ghost == this) {
                this.soundHowl.volume(1, this.soundId);
                this.soundHowl.stereo(0, this.soundId);
            } else {
                applySpacialAudio(this.soundHowl, this.soundId, this.getGlobalPosition(), player.getGlobalPosition(), this.volumeRadius);
            }
        }
    }
}