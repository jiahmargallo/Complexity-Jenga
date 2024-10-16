import * as THREE from './node_modules/three';

import Stats from './public/libs/stats.module.js';

import { OrbitControls } from './public/libs/OrbitControls.js';

// Graphics variables
let container, stats;
let camera, controls, scene, renderer;
let textureLoader;
const clock = new THREE.Clock();

// Physics variables
const gravityConstant = - 9.8;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let softBodySolver;
let physicsWorld;
const rigidBodies = [];
const margin = 0.05;
let hinge;
let rope;
let transformAux1;

let armMovement = 0;

let timeDiv = 1

Ammo().then(function (AmmoLib) {

  Ammo = AmmoLib;

  init();

});

function init() {

  initGraphics();

  initPhysics();

  createObjects();

  initInput();

}

function initGraphics() {

  container = document.getElementById('container');

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  camera.position.set(- 7, 5, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.update();

  textureLoader = new THREE.TextureLoader();

  const ambientLight = new THREE.AmbientLight(0xbbbbbb);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(- 10, 10, 5);
  light.castShadow = true;
  const d = 10;
  light.shadow.camera.left = - d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = - d;

  light.shadow.camera.near = 2;
  light.shadow.camera.far = 50;

  light.shadow.mapSize.x = 1024;
  light.shadow.mapSize.y = 1024;

  scene.add(light);

  // stats = new Stats();
  // stats.domElement.style.position = 'absolute';
  // stats.domElement.style.top = '0px';
  // container.appendChild( stats.domElement );

  //

  window.addEventListener('resize', onWindowResize);

}

function initPhysics() {

  // Physics configuration

  collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  softBodySolver = new Ammo.btDefaultSoftBodySolver();
  physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
  physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
  physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

  transformAux1 = new Ammo.btTransform();

}

function createObjects() {

  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  // Ground
  pos.set(0, - 0.5, 0);
  quat.set(0, 0, 0, 1);
  const ground = createParalellepiped(40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF }));
  ground.castShadow = true;
  ground.receiveShadow = true;
  textureLoader.load('public/textures/grid.png', function (texture) {

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    ground.material.map = texture;
    ground.material.needsUpdate = true;

  });

  // Jenga Block Dimensions

  const brickMass = 0.5;
  const brickLength = 1.2;  // Longest dimension of the brick
  const brickDepth = brickLength / 3;   // Width of the brick, so that 3 blocks side by side equal the brick length
  const brickHeight = 0.3;  // Shortest dimension, height of the brick
  const numBricksPerLayer = 3; // Each Jenga layer has 3 blocks
  const numLayers = 18; // Define the number of layers for the tower
  // const removed = Math.int(Math.random() * numLayers)

  for (let j = 0; j < numLayers; j++) {
    // Determine layer rotation and positioning
    const isOddLayer = j % 2 !== 0;
    const x0 = isOddLayer ? - (numBricksPerLayer * brickDepth / numBricksPerLayer) : 0;
    const z0 = isOddLayer ? - (brickLength / numBricksPerLayer - brickDepth / numBricksPerLayer) : - (numBricksPerLayer * brickDepth / numBricksPerLayer);

    pos.set(isOddLayer ? x0 : 0, brickHeight * (j + 0.5), isOddLayer ? 0 : z0); // Adjust the initial position for each layer
    quat.set(0, isOddLayer ? 0.7071 : 0, 0, isOddLayer ? 0.7071 : 1); // Rotate 90 degrees for odd layers

    for (let i = 0; i < numBricksPerLayer; i++) {
      // if (Math.random() < .8) {
        const brick = createParalellepiped(
          brickLength, // Length of the brick
          brickHeight, // Height of the brick
          brickDepth,  // Depth of the brick
          brickMass,   // Mass of the brick
          pos,         // Position of the brick
          quat,        // Rotation
          createMaterial() // Material of the brick
        );
        brick.castShadow = true;
        brick.receiveShadow = true;
      // }

      if (isOddLayer) {
        pos.x += brickDepth; // Move the position to place the next brick side by side along the x-axis
        // pos.z = pos.z + brickLength/3
      } else {
        pos.z += brickDepth; // Move the position to place the next brick side by side along the z-axis
        // pos.x = pos.x + brickLength/3
      }

      // pos.z = pos.z * 1.2
    }
  }





}

function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {

  const threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
  const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
  shape.setMargin(margin);

  createRigidBody(threeObject, shape, mass, pos, quat);

  return threeObject;

}

function createRigidBody(threeObject, physicsShape, mass, pos, quat) {

  threeObject.position.copy(pos);
  threeObject.quaternion.copy(quat);

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  const motionState = new Ammo.btDefaultMotionState(transform);

  const localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
  const body = new Ammo.btRigidBody(rbInfo);

  threeObject.userData.physicsBody = body;

  scene.add(threeObject);

  if (mass > 0) {

    rigidBodies.push(threeObject);

    // Disable deactivation
    body.setActivationState(4);

  }

  physicsWorld.addRigidBody(body);

}

function createRandomColor() {

  // gets random colors from black all the way to white
  return Math.floor(Math.random() * (1 << 12) * 1000000);

  // return Math.floor( Math.random() * ( 1 << 12 ) );

}

function createMaterial(c = -1) {
  const keys = [
    "africa",
    "americas",
    "asia",
    "australia",
    "europe"
  ];
  const colors = {
    africa: 0x23BD23,
    americas: 0xED832B,
    asia: 0xEDDE2B,
    australia: 0x1A8E8E,
    europe: 0xED2B2B
  }
  
  const matColor = c > -1 ? c : Math.floor(Math.random() * 5);

  return new THREE.MeshPhongMaterial({ color: colors[keys[matColor]] });

}

function initInput() {

  window.addEventListener('keydown', function (event) {

    switch (event.keyCode) {

      // Q
      case 81:
        armMovement = 1;
        break;

      // A
      case 65:
        armMovement = - 1;
        break;

    }

  });

  window.addEventListener('keyup', function () {

    armMovement = 0;

  });

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  render();
  // stats.update();

}

function render() {

  const deltaTime = clock.getDelta();

  updatePhysics(deltaTime);

  renderer.render(scene, camera);

}

function updatePhysics(deltaTime) {

  // Hinge control
  // hinge.enableAngularMotor( true, 1.5 * armMovement, 50 );

  // Step world
  physicsWorld.stepSimulation(deltaTime / timeDiv, 10);

  // Update rigid bodies
  for (let i = 0, il = rigidBodies.length; i < il; i++) {

    const objThree = rigidBodies[i];
    const objPhys = objThree.userData.physicsBody;
    const ms = objPhys.getMotionState();
    if (ms) {

      ms.getWorldTransform(transformAux1);
      const p = transformAux1.getOrigin();
      const q = transformAux1.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

    }

  }

}

// let timeDiv = 1;

document.addEventListener('mousedown', () => timeDiv = 10);
document.addEventListener('mouseup', () => timeDiv = 1);

function removeAllBlocks() {
  // Remove rigid bodies from the physics world
  rigidBodies.forEach(obj => {
    physicsWorld.removeRigidBody(obj.userData.physicsBody);
    scene.remove(obj);
  });
  rigidBodies.length = 0;  // Clear the array
}

// Function to handle the spacebar press
document.addEventListener('keydown', (event) => {
  if (event.key === " " || event.keyCode === 32) {
    removeAllBlocks();  // Clear previous blocks
    createObjects();    // Create new blocks
  }
});
