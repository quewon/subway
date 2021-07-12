class Mob {
  constructor(o) {
    this.name = o.name || "";

    if (o.mesh) {
      this.mesh = o.mesh;
    } else {
      let geometry = new THREE.BoxGeometry(o.dimensions.x, o.dimensions.y, o.dimensions.z);
      let material = new THREE.MeshLambertMaterial( { color: o.color || randomColor() } );
      this.mesh = new THREE.Mesh( geometry, material );
    }

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.geometry.center();
    this.speed = 0.05;

    let box = new THREE.Box3().setFromObject( this.mesh );
    this.height = box.max.y - box.min.y;
    this.width = box.max.z - box.min.z;

    this.pos = o.pos || {x: Math.random() * 20 - 10, y: Math.random() * 20 - 10, z: Math.random() * 20 - 10};

    this.mesh.rotation.y -= Config.defaultRotation;
  }

  update() {
    this.mesh.position.set(this.pos.x, this.pos.y + this.height/2, this.pos.z);
  }

  turn(change) {
    this.mesh.rotation.y -= change;
  }

  move(dir, distance) {
    let direction = new Vector3();
    direction.copy(Config["Vector3"+dir]).transformDirection(this.mesh.matrixWorld).multiplyScalar(distance * this.speed);
    this.pos.add(direction.multiplyScalar(distance));
  }
}