var camera, renderer;
var _obj, _texture;

var dummyScene, rtTexture;

function init() {
  camera = new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 );
  camera.position.z = 7;
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

  //

  scene("main");

  add("mobs", new Mob({
    name: "ground",
    pos: { x:0, y:-5, z:0 },
    dimensions: { x:10, y:1, z:10 }
  }));

  add("lights", new THREE.AmbientLight( 0x404040, 3 ));
  let light = new THREE.DirectionalLight( 0xffffff, 0.5 );
  light.castShadow = true;
  light.position.set( 1, 1, 1 );
  // light.shadow.bias = 0.0001;
  add("lights", light);

  // fog
  scene().fog = new THREE.FogExp2( 0x000000, 0.07 );

  animate()
  update();

  // load("player", function(object) {
  //   add("mobs", new Mob({
  //     name: name,
  //     mesh: object.children[0],
  //     pos: { x:0, y:0, z:0 }
  //   }));
  // });

  load("toast", function(object) {
    add("mobs", new Mob({
      name: name,
      mesh: object.children[0],
      pos: { x:0, y:-4, z:0 }
    }));
  });
}

function animate() {
  renderer.render(scene(), camera);

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

  for (let i in s.mobs) {
    s.mobs[i].update();
  }

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

function add(cat, value) {
  S[S.Current][cat].push(value);

  if (cat == "mobs") {
    scene().add(value.mesh);
  } else {
    scene().add(value);
  }
}

function randomColor() {
  return (0x1000000+Math.random()*0xffffff);
}