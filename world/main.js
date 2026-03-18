import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AssetManager } from './AssetManager.js';
import { World } from './World.js';

const CONFIG = {
    radius: 600,
    heightScale: 30,
    waterLevel: 602,
    resolution: 1024,
    map: 'imgs/topography_2k.png'
};

let scene, camera, renderer, controls, world, assets;
const clock = new THREE.Clock();

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 0, CONFIG.radius * 2);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Initialize World
    world = new World(scene, CONFIG);
    await world.init(CONFIG.map);

    // Initialize Assets
    assets = new AssetManager(scene);
    populateWorld();

    // Lights
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(1000, 1000, 1000);
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.4));

    animate();
}

function populateWorld() {
    const trees = [];
    const houses = [];
    
    for (let i = 0; i < 15000; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const h = world.getSampledHeight(phi, theta);

        // Using our height logic from the shader
        if (h > 0.1 && h < 0.45) {
            const r = CONFIG.radius + (h * CONFIG.heightScale);
            trees.push(new THREE.Vector3().setFromSphericalCoords(r, phi, theta));
        } else if (h >= 0.4 && h < 0.6) {
            const r = CONFIG.radius + (h * CONFIG.heightScale);
            houses.push(new THREE.Vector3().setFromSphericalCoords(r, phi, theta));
        }
    }
    assets.createInstancedTrees(trees);
    assets.createInstancedHouses(houses);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getElapsedTime();
    
    /* const time = clock.getElapsedTime() * 0.2; // Speed
    sun.position.x = Math.cos(time) * 1000;
    sun.position.z = Math.sin(time) * 1000; */

    world.update(delta); // Updates the water shader
    controls.update();
    renderer.render(scene, camera);
}

init();