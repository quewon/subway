class Ghost extends PhysicalThing {
    constructor(p) {
        super(p);
        p = p || {};
        this.tag = "ghost";

        this.colorOrigin = new RGBA();
        this.radius = 30;
        this.speed = p.speed == null ? 3 : p.speed;
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
}