import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AssetManager } from './AssetManager.js';
import { World } from './World.js';
import { WORLD_DATA } from './locations.js';

const CONFIG = {
    radius: 1100,
    heightScale: 50,
    waterLevel: 1113,
    resolution: 1024,
    map: 'imgs/topography_2k_2.png'
};

let scene, camera, renderer, controls, world, assets, sun;
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
    sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(1000, 1000, 1000);
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.2));

    animate();
}

function populateWorld() {
    const trees = [];
    const stones = [];
    const houses = [];
    const towers = [];

    const boats = [];
    const clouds = [];
    const horses = [];

    
    for (let i = 0; i < 20000; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const h = world.getSampledHeight(phi, theta);

        // Using our height logic from the shader
        if (h > 0.31 && h < 0.45) {
            const r = CONFIG.radius + (h * CONFIG.heightScale);
            if (i % 2 === 0) 
                trees.push(new THREE.Vector3().setFromSphericalCoords(r, phi, theta));
            else
                stones.push(new THREE.Vector3().setFromSphericalCoords(r, phi, theta));
        } else if (h >= 0.4 && h < 0.55) {
            const r = CONFIG.radius + (h * CONFIG.heightScale);
            houses.push(new THREE.Vector3().setFromSphericalCoords(r, phi, theta));
        }  else if (h >= 0.55 && h < 0.6) {
            const r = CONFIG.radius + (h * CONFIG.heightScale);
            towers.push(new THREE.Vector3().setFromSphericalCoords(r, phi, theta));
        }
    }
    assets.addStaticBatch('oaks','./world/models/Oak.glb', trees,{
        randomRotation: Math.PI * 2,
        scale: 0.7
    });
    assets.addStaticBatch('stones', './world/models/Stone.glb',stones,{
        randomRotation: Math.PI * 2,
        scale: 2.5
    });
    assets.addStaticBatch('houses','./world/models/LHouse.glb', houses,{
        randomRotation: Math.PI * 2,
        scale: 1.5
    });
    assets.addStaticBatch('towers','./world/models/ChessTower.glb', towers,{
        randomRotation: Math.PI * 2,
        scale: 1.0
    });

    //boats
    for (let i = 0; i < 250; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const h = world.getSampledHeight(phi, theta);

        if (h == 0.0) {
            const r = CONFIG.radius + (h * CONFIG.heightScale);
            boats.push(new THREE.Vector3().setFromSphericalCoords(r + 12.0, phi, theta));
        }
    }
    assets.addStaticBatch('boats','./world/models/Boat.glb', boats,{
        randomRotation: Math.PI * 2,
        scale: 1.0
    });

    //horses
    for (let i = 0; i < 1000; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const h = world.getSampledHeight(phi, theta);

        if (h > 0.31 && h < 0.45) {
            const r = CONFIG.radius + (h * CONFIG.heightScale);
            horses.push(new THREE.Vector3().setFromSphericalCoords(r + 1.0, phi, theta));
        }
    }
    assets.addStaticBatch('horses','./world/models/Horse.glb', horses,{
        randomRotation: Math.PI * 2,
        scale: 1.5
    });


    //clouds
    for (let i = 0; i < 250; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const h = world.getSampledHeight(phi, theta);

        const r = CONFIG.radius + (h * CONFIG.heightScale);
        clouds.push(new THREE.Vector3().setFromSphericalCoords(r + (CONFIG.heightScale + (Math.random() * 2.0)), phi, theta));
        
    }
    assets.addStaticBatch('clouds','./world/models/Cloud.glb', clouds,{
        randomRotation: Math.PI * 2,
        scale: 5.0
    });


    //dragons
    for (let i = 0; i < 10; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const h = world.getSampledHeight(phi, theta);

        const r = CONFIG.radius + (h * CONFIG.heightScale);
        //dragons.push(new THREE.Vector3().setFromSphericalCoords(r + (CONFIG.heightScale + (Math.random() * 2.0)), phi, theta));
        const dragon = assets.spawnAnimated('./world/models/Dragon.glb', new THREE.Vector3().setFromSphericalCoords(r + (CONFIG.heightScale + (Math.random() * 2.0)), phi, theta));
        
    }
    /* assets.actors.forEach(element => {
        element.play('Armature|Armature|Fly', 0.1);
    }); */
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const delta = clock.getElapsedTime();
    
    const time = clock.getElapsedTime() * 0.1; // Speed
    sun.position.x = Math.cos(time) * 1000;
    sun.position.z = Math.sin(time) * 1000;

    assets.update(deltaTime);
    // Update Water Uniforms
    /* world.waterMesh.material.uniforms.uTime.value = delta;
    
    // Make the sparkles follow the sun light
    world.waterMesh.material.uniforms.uSunDirection.value.copy(sun.position).normalize(); */

    world.update(delta); // Updates the water shader
    controls.update();
    renderer.render(scene, camera);
}

init();

createGameMenu();

function createGameMenu() {
    const container = document.createElement('div');
    container.id = 'game-ui';
    document.body.appendChild(container);

    WORLD_DATA.forEach(data => {
        const section = document.createElement('div');
        section.className = 'continent-section';
        
        section.innerHTML = `<span class="continent-title">${data.continent}</span>`;
        
        data.locations.forEach(loc => {
            const btn = document.createElement('button');
            btn.className = 'loc-button';
            btn.innerText = loc.name;
            btn.onclick = () => window.flyToLocation(loc.lat, loc.lon);
            section.appendChild(btn);
            
            // Also add the 3D marker automatically
            addBeacon(loc.lat, loc.lon, data.color);
        });
        
        container.appendChild(section);
    });
}

function addBeacon(lat, lon, colorCode) {
    const { phi, theta } = world.getCoords(lat, lon);
    const h = world.getSampledHeight(phi, theta);
    const r = CONFIG.radius + (h * CONFIG.heightScale)  + 25.0;
    
    const position = new THREE.Vector3().setFromSphericalCoords(r, phi, theta);
    
    // Group to hold beacon parts
    const group = new THREE.Group();
    
    // 1. The Pointer (Cone)
    const coneGeo = new THREE.ConeGeometry(10, 35, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: colorCode });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0, 7.5, 0); // Offset so tip is at origin
    cone.rotation.x = Math.PI; // Flip to point down
    
    // 2. The Glow Ring (Torus)
    const ringGeo = new THREE.TorusGeometry(15, 1.5, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorCode, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    
    group.add(cone, ring);
    group.position.copy(position);
    
    // Align with sphere surface
    group.lookAt(new THREE.Vector3(0,0,0));
    group.rotateX(Math.PI / 2); // Correct orientation to point AWAY from center
    
    scene.add(group);
    
    // Animate the beacon
    gsap.to(ring.scale, { x: 2, y: 2, duration: 1.5, repeat: -1, yoyo: false });
    gsap.to(ringMat, { opacity: 0, duration: 1.5, repeat: -1, yoyo: false });
}

/**
 * Moves the camera to a specific lat/lon
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 */

 window.flyToLocation = function(lat, lon) {
    const { phi, theta } = world.getCoords(lat, lon);
    const h = world.getSampledHeight(phi, theta);
    
    // We want to fly to a position slightly above the sampled terrain
    const surfaceDistance = world.radius + (h * world.heightScale);
    const targetDistance = surfaceDistance + 400; // Hover 400 units above
    
    const targetPos = new THREE.Vector3().setFromSphericalCoords(targetDistance, phi, theta);

    gsap.to(camera.position, {
        duration: 2,
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        ease: "expo.inOut", // "Expo" feels more like a fast game transition
        onUpdate: () => controls.update()
    });
};