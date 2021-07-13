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
    this.mesh.geometry.vertices = this.generateVertices();
    this.speed = 3;
    this.direction = new Vector3();

    let box = new THREE.Box3().setFromObject( this.mesh );
    this.height = box.max.y - box.min.y;
    this.width = box.max.z - box.min.z;

    this.pos = o.pos || {x: Math.random() * 20 - 10, y: Math.random() * 20 - 10, z: Math.random() * 20 - 10};

    this.mesh.rotation.y -= Config.defaultRotation;
  }

  generateVertices() {
    let array = [];

    const position = this.mesh.geometry.attributes.position;
    const vector = new THREE.Vector3();

    for ( let i = 0, l = position.count; i < l; i ++ ) {
      vector.fromBufferAttribute( position, i );
      vector.applyMatrix4( this.mesh.matrixWorld );
      array.push(vector);
    }

    return array
  }

  update(delta) {
    this.mesh.position.set(this.pos.x, this.pos.y + this.height/2, this.pos.z);

    if (this.direction.x != 0 || this.direction.y != 0 || this.direction.z != 0) {
      console.log(this.direction);
    }

    this.step(delta*this.speed);
    this.direction.x = 0;
    this.direction.y = 0;
    this.direction.z = 0;
  }

  turn(change) {
    this.mesh.rotation.y -= change;
  }

  move(dir) {
    this.direction.add(Config["Vector3"+dir]).normalize();
  }

  step(distance) {
    let d = new Vector3();
    d.copy(this.direction).transformDirection(this.mesh.matrixWorld).multiplyScalar(distance);
    this.pos.add(d);
  }

  colliding() { //return name of  object that this is colliding with
    let m = S[S.Current].mobs;

    let mobs = [];
    for (let i in m) {
      if (m[i].name != this.name) {
        mobs.push(m[i].mesh)
      }
    }

    for (let v=0; v<this.mesh.geometry.vertices.length; v++) {
      let localVertex = this.mesh.geometry.vertices[v].clone();
      let globalVertex = localVertex.applyMatrix4(this.mesh.matrix);
      let directionVector = globalVertex.sub(this.pos);

      let ray = new THREE.Raycaster(this.pos, directionVector.clone().normalize());

      let col = ray.intersectObjects(mobs, true);
      if (col.length > 0 && col[0].distance < directionVector.length()) {
        return col[0]
      }
    }

    return false
  }
}