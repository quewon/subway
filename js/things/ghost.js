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
            let closestTrain;
            let closestTrainDistance;
            for (let info of scene.trainsHere) {
                if (info.data.doors_open) {
                    let distance = 0;
                }
            }

            if (closestTrain) {

            } else {

            }
        }
    }

    lookForOgygia() {

    }
}