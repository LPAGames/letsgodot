import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AssetManager } from './AssetManager.js';

// --- Config ---
const WORLD_RADIUS = 600;
const HEIGHT_SCALE = WORLD_RADIUS / 15.0;
const WATER_LEVEL = WORLD_RADIUS+ (HEIGHT_SCALE * 0.09);
const RESOLUTION = 2048;
const MAP_SRC = 'imgs/topography_2k.png';

let scene, camera, renderer, controls, stats, heightData;

async function init() {
    scene = new THREE.Scene();
    stats = new Stats();
    document.body.appendChild(stats.dom);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 0, WORLD_RADIUS * 3);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Perf optimization
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 1. Load Heightmap Data
    heightData = await loadHeightImageData(MAP_SRC);
    const texture = new THREE.TextureLoader().load(MAP_SRC);

    // 2. Create Terrain
    const geo = new THREE.SphereGeometry(WORLD_RADIUS, RESOLUTION, RESOLUTION / 2);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x228b22,
        displacementMap: texture,
        displacementScale: HEIGHT_SCALE,
        flatShading: true
    });
    const world = new THREE.Mesh(geo, mat);
    scene.add(world);

    // 3. Water
    const waterGeo = new THREE.SphereGeometry(WATER_LEVEL, 64, 64);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0044ff, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Mesh(waterGeo, waterMat));

    // 4. Lighting
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(200, 200, 200);
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.3));

    // 4. Place Assets
    const assets = new AssetManager(scene);
    const treePositions = [];
    const housePositions = [];

    const iterations = 15000;
    for (let i = 0; i < iterations; i++) {
        // Random spherical coordinates
        const phi = Math.acos(2 * Math.random() - 1); // Latitude: 0 to PI
        const theta = Math.random() * Math.PI * 2;    // Longitude: 0 to 2PI
        
        const h = getSampledHeight(phi, theta);

        // Logic: 0.0 is black (deep ocean), 1.0 is white (mountain tops)
        if (h > 0.1 && h < 0.6) { 
            // LAND: Place Trees
            const finalR = WORLD_RADIUS + (h * HEIGHT_SCALE);
            const pos = new THREE.Vector3().setFromSphericalCoords(finalR, phi, theta);
            treePositions.push(pos);
        } else if (h >= 0.5 && h < 0.7) {
            // HIGH MOUNTAINS: Place Houses/Towers
            const finalR = WORLD_RADIUS + (h * HEIGHT_SCALE);
            const pos = new THREE.Vector3().setFromSphericalCoords(finalR, phi, theta);
            housePositions.push(pos);
        }
    }

    assets.createInstancedTrees(treePositions);
    assets.createInstancedHouses(housePositions);

    animate();
}

// --- Utilities ---

function getSampledHeight(phi, theta) {
    if (!heightData) return 0;

    // 1. LATITUDE (Vertical): 
    // phi: 0 (North) to PI (South) -> v: 0 to 1
    let v = phi / Math.PI;

    // 2. LONGITUDE (Horizontal): 
    // theta: 0 to 2PI -> u: 0 to 1
    // We add 0.5 to shift the "seam" 180 degrees. 
    // This aligns the USA/Americas to their correct longitude.
    let u = (theta / (Math.PI * 2) + 0.249) % 1.0;

    // 3. IMAGE LOOKUP (Safe clamping)
    const x = Math.floor(u * (heightData.width - 1));
    const y = Math.floor(v * (heightData.height - 1));
    
    const index = (y * heightData.width + x) * 4;
    
    // Using the Red channel (assuming grayscale topography)
    return heightData.data[index] / 255;
}

function loadHeightImageData(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve({
                data: ctx.getImageData(0, 0, img.width, img.height).data,
                width: img.width,
                height: img.height
            });
        };
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    stats.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();