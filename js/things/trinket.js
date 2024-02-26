class Trinket extends PhysicalThing {
    constructor(p) {
        super(p);
        p = p || {};
        this.linkedPassenger = null;
    }
  
    deselect() {
        this.linkedPassenger = null;
        player.wantsToLinkTo = null;
    }
  
    select() {
        if (this.linkedPassenger) {
            this.deselect();
        } else {
            player.wantsToLinkTo = this;
        }
    }
  
    drawLink() {
        if (this.linkedPassenger) {
            context.strokeStyle = GROUP_LINES_COLOR;
            let position = this.position;
            if (this.size) position = position.add(this.size.div(2));
            context.beginPath();
            context.moveTo(position.x, position.y);
            context.lineTo(this.linkedPassenger.position.x, this.linkedPassenger.position.y);
            context.stroke();
        }
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
        if (player && player.wantsToLinkTo == this && player.scene == this.scene) {
            if (this.radius) {
                if (this.position.distanceTo(player.position) <= this.radius + player.radius) {
                    this.linkedPassenger = player;
                    player.wantsToLinkTo = null;
                }
            } else {
                if (circleRect(player.position, player.radius, this.position, this.size)) {
                    this.linkedPassenger = player;
                    player.wantsToLinkTo = null;
                }
            }
        }
        
        if (this.linkedPassenger && !this.linkedPassenger.ghost && this.ghost) {
            this.ghost.uneat(this);
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
}

class Radio extends Trinket {
    constructor(p) {
        super(p);
    
        this.volumeRadius = 150;
        this.size = new Vector2(17, 10);
        this.label = "radio";

        this.musicTitle = soundslist["radio"][soundslist["radio"].length * Math.random() | 0];
        this.soundHowl = sounds["radio"][this.musicTitle];
    }

    draw() {
        this.drawLink();

        if (this.linkedPassenger) {
            let passenger = this.linkedPassenger;
            context.strokeStyle = passenger.ghost ? OGYGIA_COLOR : passenger.color.toString();
        } else {
            context.strokeStyle = this.ghost ? OGYGIA_COLOR : LINES_COLOR;
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

        this.drawLabel();
    }

    drawLabel() {
        if (this.hovered || this.soundId) {
            context.fillStyle = LINES_COLOR;
            if (this.soundId && !this.hovered) {
                let seek = this.soundHowl.seek(null, this.soundId);
                if (seek < 10) {
                    context.globalAlpha = lerp(1, 0, seek/10);
                } else {
                    return;
                }
            }

            if (this.soundId) {
                context.font = "italic 13px sans-serif";
            } else {
                context.font = "13px sans-serif";
            }
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
        this.label = "radio";
    }

    updateSound() {
        if (player && !this.soundId && subway.currentScene == this.scene && this.linkedPassenger) {
            this.startPlaying();
        } else if (this.soundId && (subway.currentScene != this.scene || !this.linkedPassenger)) {
            this.stopPlaying();
        }

        if (this.soundId && player) {
            let center = this.position.add(this.size.div(2));
            let distance = center.distanceTo(player.position);
            let normalizedDistance = distance/this.volumeRadius;
            
            let volume = 1 - Math.max(Math.min(normalizedDistance, 1), 0);
            let d = this.position.sub(player.position).normalize();
            let pan = Math.min(Math.max(d.x, -.5), .5);
        
            this.soundHowl.volume(volume, this.soundId);
            this.soundHowl.stereo(pan, this.soundId);
        }
    }
}