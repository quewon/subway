class Mob {
  constructor(o) {
    this.name = o.name || "";

    if (o.mesh) {
      this.mesh = o.mesh;
    } else {
      let geometry = new THREE.BoxGeometry(o.dimensions.x, o.dimensions.y, o.dimensions.z);
      let material = new THREE.MeshLambertMaterial( { color: randomColor() } );
      this.mesh = new THREE.Mesh( geometry, material );
    }

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.pos = o.pos || {x: Math.random() * 20 - 10, y: Math.random() * 20 - 10, z: Math.random() * 20 - 10};

    this.mesh.rotation.y -= 89.5;
  }

  update() {
    this.mesh.rotation.y += 0.01;

    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
  }
}