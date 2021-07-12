var camera, renderer;
var _obj, _texture;

var dummyScene, rtTexture;

function init() {
  camera = new THREE.PerspectiveCamera( 90, 1, 0.1, 1000 );
  camera.position.z = 7;
  camera.position.y = 3;
  renderer = new THREE.WebGLRenderer();

  renderer.setPixelRatio( window.devicePixelRatio );

  let width = window.innerHeight * 1.85;
  let height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize( width, height );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild( renderer.domElement );

  // window.onresize = function() {
  //   let width = window.innerWidth;
  //   let height = window.innerHeight;
  //   camera.aspect = width / height;
  //   camera.updateProjectionMatrix();
  //   renderer.setSize( width, height );
  // };

  // https://joooooo308.medium.com/three-js-pixelated-lo-fi-energy-look-298b8dc3eaad

  dummyCamera = new THREE.OrthographicCamera( width/-2, width/2, height/2, height/-2, -10000, 10000 );
  // dummyCamera.position.z = 1;
  dummyScene = new THREE.Scene();

  rtTexture = new THREE.WebGLRenderTarget( 
    width/Config.res, //resolution x
    height/Config.res, //resolution y
    { 
      minFilter: THREE.LinearFilter, 
      magFilter: THREE.NearestFilter, 
      format: THREE.RGBFormat 
    }
  );

  var materialScreen = new THREE.ShaderMaterial( {
    uniforms: { tDiffuse: { value: rtTexture.texture } },
    vertexShader: document.getElementById( 'vertexShader' ).textContent,
    fragmentShader: document.getElementById( 'fragment_shader_screen' ).textContent,
    depthWrite: false
  } );

  var plane = new THREE.PlaneGeometry( width, height );
  quad = new THREE.Mesh( plane, materialScreen );
  quad.position.z = - 100;
  dummyScene.add( quad );

  // loader

  _obj = new OBJLoader();
  _texture = new TextureLoader();

  // controls
  init_controls();

  //

  scene("main");

  // fog
  scene().fog = new THREE.FogExp2( Config.Black, 0.07 );

  add("mobs", new Mob({
    name: "ground",
    pos: new Vector3(0, -0.5, 0),
    dimensions: { x:10, y:0.5, z:10 },
    color: Config.LightGray,
  }));

  add("lights", new THREE.AmbientLight( Config.White, 1 ));
  // let light = new THREE.DirectionalLight( Config.White, 0.5 );
  let light = new THREE.SpotLight( Config.White );
  light.castShadow = true;
  // light.position.set( 1, 1, 1 );
  light.position.set( -1, 3, 1 );
  light.shadow.bias = 0.0001;
  add("lights", light);

  add("mobs", new Mob({
    name: "lightbulb",
    pos: new Vector3(-1, 3, 1),
    color: Config.White,
    dimensions: { x:0.1, y:0.1, z:0.1 }
  }));

  load("player", function(object) {
    add("mobs", new Mob({
      name: "player",
      mesh: object.children[0],
      pos: new Vector3(0, 0, 0),
    }));

    load("toast", function(object) {
      add("mobs", new Mob({
        name: "toast",
        mesh: object.children[0],
        pos: new Vector3(0, 0, 0),
      }));

      animate();
      update();
    });
  });
}

function animate() {
  // camera follows player
  let player = S[S.Current].mobs.player;
  camera.position.x = player.pos.x;
  camera.position.y = player.pos.y + player.height * 3/4; // position camera on top quarter of player
  camera.position.z = player.pos.z;
  // camera.rotation.y = player.mesh.rotation.y - Config.defaultRotation;

  //
  renderer.setRenderTarget( rtTexture );
  renderer.clear();
  renderer.render( scene(), camera );
  
  renderer.setRenderTarget( null );
  renderer.clear();
  renderer.render( dummyScene, dummyCamera );

  requestAnimationFrame(animate);
}

function update() {
  let s = S[S.Current];

  //

  for (let mob in s.mobs) {
    s.mobs[mob].update();
  }

  //

  Controls.key.update();

  requestAnimationFrame(update);
}

function load(name, func) {
  let path = 'assets/'+name+'/';
  _obj.setPath(path);

  _obj
    .load(name+'.obj', function(object) {
      _texture.setPath(path);
      var texture = _texture.load(name+'_tex.png');

      texture.generateMipmaps = false;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;

      object.traverse(function (child) {   // aka setTexture
        if (child instanceof THREE.Mesh) {
            child.material.map = texture;
        }
      });

      func(object);
    })
}

function scene(name) {
  if (name) {
    S.Current = name;
  }

  return S[S.Current].scene;
}

function add(category, value) {
  if (category == "mobs") {
    S[S.Current][category][value.name] = value;
    scene().add(value.mesh);
  } else {
    S[S.Current][category].push(value);
    scene().add(value);
  }
}

function randomColor() {
  let rand = Math.floor(Math.random() * 4);

  return Config[Config.Colors[rand]];
}