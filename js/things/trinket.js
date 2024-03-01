class Trinket extends PhysicalThing {
    constructor(p) {
        super(p);
        p = p || {};

        this.linkedPassenger = null;
        this.linkHowl = null;
        this.unlinkHowl = null;
    }
  
    deselect() {
        this.linkedPassenger = null;
        if (player) {
            player.wantsToLinkTo = null;
            if (this.unlinkHowl) {
                let id = this.unlinkHowl.play();
                let center = this.getGlobalPosition();
                if (this.size) center = center.add(this.size.div(2));
                applySpacialAudio(this.unlinkHowl, id, center, player.getGlobalPosition(), 200);
            }
        }
    }
  
    select() {
        if (this.linkedPassenger) {
            this.deselect();
        } else {
            player.wantsToLinkTo = this;
            if (this.previousConfiner) {
                if (this.size) {
                    player.playerDestination = this.position.add(this.size.div(2));
                } else {
                    player.playerDestination = this.position;
                }
                player.playerDestinationScene = this.scene;
                player.playerDestinationConfiner = this.previousConfiner;
            }
        }
    }

    drawSelf() {
        if (this.ghost) {
            context.strokeStyle = OGYGIA_COLOR;
        } else if (this.linkedPassenger) {
            context.strokeStyle = this.linkedPassenger.color.toString();
        } else {
            context.strokeStyle = LINES_COLOR;
        }
        context.beginPath();
        if (this.radius) {
            context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
        } else {
            context.rect(this.position.x, this.position.y, this.size.x, this.size.y);
        }
        if (player.wantsToLinkTo == this) {
          context.fillStyle = context.strokeStyle = player.color.toString();
          context.fill();
        }
        context.stroke();
    }
  
    drawLink() {
        if (this.linkedPassenger && this.linkedPassenger.scene == this.scene) {
            context.strokeStyle = GROUP_LINES_COLOR;
            let position = this.position;
            if (this.size) position = position.add(this.size.div(2));
            context.beginPath();
            context.moveTo(position.x, position.y);
            context.lineTo(this.linkedPassenger.position.x, this.linkedPassenger.position.y);
            context.stroke();
        }
    }

    draw() {
        this.drawLink();
        this.drawSelf();
    }
  
    followLink(dt) {
        this.direction = new Vector2();
        if (this.linkedPassenger) {
            let link = this.linkedPassenger;
    
            if (this.scene != link.scene) {
                this.exit(this.scene);
                this.enter(link.scene);
                this.position = link.position.add(new Vector2(-link.direction.x * 10, 0));
                this.previousConfiner = link.previousConfiner;
            }
            if (this.radius) {
                if (link.position.distanceTo(this.position) > link.radius + link.avoidanceRadius + this.radius) {
                    this.followPassenger(dt);
                }
            } else {
                if (!circleRect(link.position, link.radius + link.avoidanceRadius, this.position, this.size)) {
                    this.followPassenger(dt);
                }
            }
        }
        this.move(dt);
    }
  
    updateLink() {
        if (player && player.wantsToLinkTo == this && this.inSameScreen(player)) {
            let readyToLink = false;
            if (this.radius) {
                readyToLink = this.getGlobalPosition().distanceTo(player.getGlobalPosition()) <= this.radius + player.radius;
            } else if (this.size) {
                readyToLink = circleRect(player.getGlobalPosition(), player.radius, this.getGlobalPosition(), this.size);
            }

            if (readyToLink) {
                this.linkedPassenger = player;
                player.playerDestination = null;
                player.wantsToLinkTo = null;
                if (this.linkHowl) {
                    let id = this.linkHowl.play();
                    let center = this.getGlobalPosition();
                    if (this.size) center = center.add(this.size.div(2));
                    applySpacialAudio(this.linkHowl, id, center, player.getGlobalPosition(), 200);
                }
                this.onlink(player);
            }
        }

        if (this.linkedPassenger && !this.hasPathTo(this.linkedPassenger)) {
            this.deselect();
        }

        if (this.ghost && this.linkedPassenger) {
            if (!this.linkedPassenger.ghost) {
                this.ghost.uneat(this);
            } else if (this.linkedPassenger.ghost && this.linkedPassenger != player) {
                this.deselect();
            }
        }

        if (player && player.wantsToLinkTo == this && mouse.downThisFrame && !this.hovered) {
            player.wantsToLinkTo = null;
        }
    }
  
    update(dt) {
        this.updateLink();
        this.followLink(dt);
        this.updateInteractionState();
    }
  
    followPassenger(dt) {
        let link = this.linkedPassenger;
    
        let position = this.position;
        if (this.size) position = position.add(this.size.div(2));
        let distance = Math.max(position.distanceTo(link.position), .01);
        let direction = link.position.sub(position).normalize();
    
        this.direction = direction.mul(distance * dt/400);
    }

    drawLabel() {
        if (this.hovered) {
            context.fillStyle = LINES_COLOR;
            context.font = "13px sans-serif";
            context.textAlign = "center";
            context.textBaseline = "bottom";
        
            context.strokeStyle = BACKGROUND_COLOR;
            context.lineWidth = 3;
            context.strokeText(this.label, this.position.x + this.size.x/2, this.position.y);
            context.lineWidth = 1;
        
            context.fillText(this.label, this.position.x + this.size.x/2, this.position.y);
        }
    }

    onlink(passenger) { }
}

class Radio extends Trinket {
    constructor(p) {
        super(p);
    
        this.volumeRadius = 200;
        this.size = new Vector2(17, 10);
        this.label = "radio";

        this.musicTitle = UNFOUND_MUSIC.splice(UNFOUND_MUSIC.length * Math.random() | 0, 1)[0];
        if (UNFOUND_MUSIC.length == 0) restockMusic();
        this.soundHowl = sounds["radio"][this.musicTitle];

        this.linkHowl = sounds.sfx["click3"];
        this.unlinkHowl = sounds.sfx["click1"];
    }

    drawSelf() {
        if (this.ghost) {
            context.strokeStyle = OGYGIA_COLOR;
        } else if (this.linkedPassenger) {
            context.strokeStyle = this.linkedPassenger.color.toString();
        } else {
            context.strokeStyle = LINES_COLOR;
        }

        context.beginPath();
        context.rect(this.position.x, this.position.y, this.size.x, this.size.y);

        if (player.wantsToLinkTo == this) {
            context.strokeStyle = context.fillStyle = player.ghost ? OGYGIA_COLOR : player.color.toString();
            context.fill();
        }

        context.stroke();

        let r = this.size.y/3;
        context.beginPath();
        context.moveTo(this.position.x + 2, this.position.y);
        context.lineTo(this.position.x + 2, this.position.y - this.size.y/2);
        context.stroke();
        context.beginPath();
        context.arc(this.position.x + r, this.position.y + this.size.y/2, r, 0, TWOPI);
        context.stroke();
        context.beginPath();
        context.arc(this.position.x + this.size.x - r, this.position.y + this.size.y/2, r, 0, TWOPI);
        context.stroke();
    }

    drawLabels() {
        if (this.soundId) {
            context.fillStyle = LINES_COLOR;
            if (!this.hovered) {
                let seek = this.soundHowl.seek(null, this.soundId);
                if (seek < 10) {
                    context.globalAlpha = lerp(1, 0, seek/10);
                } else {
                    return;
                }
            }

            context.font = "italic 13px sans-serif";
            context.textAlign = "center";
            context.textBaseline = "bottom";
        
            context.strokeStyle = BACKGROUND_COLOR;
            context.lineWidth = 3;
            context.strokeText(this.label, this.position.x + this.size.x/2, this.position.y - this.size.y/2);
            context.lineWidth = 1;

            context.fillText(this.label, this.position.x + this.size.x/2, this.position.y - this.size.y/2);

            context.globalAlpha = 1;
        }
    }

    update(dt) {
        this.updateLink();
        this.followLink(dt);
        this.updateInteractionState();
        this.updateSound();
    }

    startPlaying() {
        if (this.soundId) return;
        this.soundId = this.soundHowl.play();
        this.soundHowl.loop(true, this.soundId);
        this.label = "now playing - "+this.musicTitle;
    }

    stopPlaying() {
        if (!this.soundId) return;
        this.soundHowl.stop(this.soundId);
        this.soundId = null;
    }

    updateSound() {
        let withPlayer = player && this.isAudibleTo(player);
        if (withPlayer && !this.soundId && this.linkedPassenger) {
            this.startPlaying();
        } else if (this.soundId && (!withPlayer || !this.linkedPassenger)) {
            this.stopPlaying();
        }

        if (this.soundId && player) {
            let center = this.getGlobalPosition().add(this.size.div(2));
            applySpacialAudio(this.soundHowl, this.soundId, center, player.getGlobalPosition(), this.volumeRadius);
        }
    }
}

class Soda extends Trinket {
    constructor(p) {
        super(p);

        this.label = "soda";
        this.size = new Vector2(10, 15);
    }
}

class Mop extends Trinket {
    constructor(p) {
        super(p);
        this.size = new Vector2(15, 30);
        this.tag = "mop";

        this.wet = 0;
        this.interval = 0;
        this.speed = 10;
    }

    drawLink() {
        if (this.linkedPassenger && this.linkedPassenger.scene == this.scene) {
            context.strokeStyle = GROUP_LINES_COLOR;
            let position = this.position.add(new Vector2(this.size.x/2, this.size.y * 2/3));
            context.beginPath();
            context.moveTo(position.x, position.y);
            context.lineTo(this.linkedPassenger.position.x, this.linkedPassenger.position.y);
            context.stroke();
        }
    }

    drawSelf() {
        if (this.ghost) {
            context.strokeStyle = OGYGIA_COLOR;
        } else if (this.linkedPassenger) {
            context.strokeStyle = this.linkedPassenger.color.toString();
        } else {
            context.strokeStyle = LINES_COLOR;
        }

        context.beginPath();
        context.rect(this.position.x, this.position.y + this.size.y - (this.wet/100 * this.size.y * 1/3), this.size.x, this.size.y * 1/3 * this.wet/100);
        context.fillStyle = OGYGIA_COLOR;
        context.fill();

        context.beginPath();
        context.moveTo(this.position.x + this.size.x/2, this.position.y);
        context.lineTo(this.position.x + this.size.x/2, this.position.y + this.size.y);
        context.rect(this.position.x, this.position.y + this.size.y * 2/3, this.size.x, this.size.y * 1/3);
        context.moveTo(this.position.x + this.size.x/4, this.position.y + this.size.y * 2/3);
        context.lineTo(this.position.x + this.size.x/4, this.position.y + this.size.y);
        context.moveTo(this.position.x + this.size.x * 3/4, this.position.y + this.size.y * 2/3);
        context.lineTo(this.position.x + this.size.x * 3/4, this.position.y + this.size.y);
        if (player.wantsToLinkTo == this) {
            context.fillStyle = context.strokeStyle = player.color.toString();
            context.fill();
        }
        context.stroke();
    }

    update(dt) {
        this.updateLink();
        this.followLink(dt);
        this.updateInteractionState();

        if (this.wet > 0 && this.velocity.sqrMagnitude() > .1) {
            this.interval += dt;
            if (this.interval >= 100) {
                this.interval = 0;
                this.wet--;
                let force = this.velocity.mul(-1).add(new Vector2(
                    Math.random() - .5,
                    Math.random() - .5
                ).mul(2));
                new Bubble({
                    scene: this.scene,
                    position: this.position.add(new Vector2(this.size.x/2, this.size.y)),
                    velocity: force
                });
            }
        }
    }
}

class Bucket extends Trinket {
    constructor(p) {
        super(p);
        this.size = new Vector2(16, 25);
        this.water = 1000;
    }

    drawLink() {
        if (this.linkedPassenger && this.linkedPassenger.scene == this.scene) {
            context.strokeStyle = GROUP_LINES_COLOR;
            let position = this.position.add(new Vector2(this.size.x/2, 0));
            context.beginPath();
            context.moveTo(position.x, position.y);
            context.lineTo(this.linkedPassenger.position.x, this.linkedPassenger.position.y);
            context.stroke();
        }
    }

    drawSelf() {
        context.beginPath();
        context.rect(this.position.x, this.position.y + this.size.y - (this.water/1000 * (this.size.y - this.size.x/2)), this.size.x, (this.size.y - this.size.x/2) * this.water/1000);
        context.fillStyle = OGYGIA_COLOR;
        context.fill();

        if (this.ghost) {
            context.strokeStyle = OGYGIA_COLOR;
        } else if (this.linkedPassenger) {
            context.strokeStyle = this.linkedPassenger.color.toString();
        } else {
            context.strokeStyle = LINES_COLOR;
        }

        context.beginPath();
        context.rect(this.position.x, this.position.y + this.size.x/2, this.size.x, this.size.y - this.size.x/2);
        if (player.wantsToLinkTo == this) {
            context.fillStyle = context.strokeStyle = player.color.toString();
            context.fill();
        }
        context.arc(this.position.x + this.size.x/2, this.position.y + this.size.x/2, this.size.x/2, Math.PI, TWOPI);
        context.stroke();
    }

    update(dt) {
        this.updateLink();
        this.followLink(dt);
        this.updateInteractionState();

        if (this.water > 0 && this.linkedPassenger) {
            let mop;
            for (let thing of this.linkedPassenger.scene.things) {
                if (thing.tag == "mop" && thing.linkedPassenger == this.linkedPassenger) {
                    mop = thing;
                    break;
                }
            }

            if (mop && mop.wet < 100) {
                mop.wet += dt/10;
                this.water -= dt/10;
            }
        }
    }

    onlink(passenger) {
        // if (this.water <= 0) return;

        // let mop;
        // for (let thing of passenger.scene.things) {
        //     if (thing.tag == "mop" && thing.linkedPassenger == passenger) {
        //         mop = thing;
        //         break;
        //     }
        // }
        // if (mop) {
        //     mop.wet = 100;
        //     this.water--;
        //     passenger.setDialogue("mop is wet");
        //     this.deselect();
        // }
    }
}

class Bubble extends PhysicalThing {
    constructor(p) {
        super(p);

        this.radius = 2 + Math.random() * 4;
        this.colorOrigin = OGYGIA_RGB;
        this.color = OGYGIA_RGB;

        this.isPhysical = false;
        this.dontCoolDown = true;
    }

    update(dt) {
        this.direction = new Vector2();
        this.move(dt);

        if (this.collisionsCounter >= 50) {
            this.exit();
        }

        this.collisionsCounter += dt/100;
    }

    draw() {
        context.globalAlpha = 1 - this.collisionsCounter/50;
        context.beginPath();
        context.strokeStyle = OGYGIA_COLOR;
        context.arc(this.position.x, this.position.y, this.radius, 0, TWOPI);
        context.stroke();
        context.globalAlpha = 1;
    }
}