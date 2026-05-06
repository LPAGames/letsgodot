import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==========================================
// 1. SETUP SCENE
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// ==========================================
// 2. THE ASCII VOXEL PARSER
// ==========================================
function buildCastleFromGrid(gridData) {
    const layers = gridData.layers;
    const size = gridData.tileSize;

    // Count how many of each block we need
    let stoneCount = 0, roofCount = 0, woodCount = 0;
    
    layers.forEach(layer => {
        layer.forEach(row => {
            const blocks = row.split(' ');
            blocks.forEach(b => {
                if (b === 'S') stoneCount++;
                if (b === 'R') roofCount++;
                if (b === 'W') woodCount++;
            });
        });
    });

    // Create Base Geometries
    const boxGeo = new THREE.BoxGeometry(size, size, size);
    const roofGeo = new THREE.ConeGeometry(size * 0.7, size, 4); 
    roofGeo.rotateY(Math.PI / 4); // Make pyramid shape

    // Create Materials
    const matStone = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.9 });
    const matRoof = new THREE.MeshStandardMaterial({ color: 0xaa3333, roughness: 1.0 });
    const matWood = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.8 });

    // InstancedMesh is 100x faster than creating separate meshes
    const instStone = new THREE.InstancedMesh(boxGeo, matStone, stoneCount);
    const instRoof = new THREE.InstancedMesh(roofGeo, matRoof, roofCount);
    const instWood = new THREE.InstancedMesh(boxGeo, matWood, woodCount);

    instStone.castShadow = true; instStone.receiveShadow = true;
    instRoof.castShadow = true;  instRoof.receiveShadow = true;
    instWood.castShadow = true;  instWood.receiveShadow = true;

    // Counters to keep track of instance IDs
    let sIdx = 0, rIdx = 0, wIdx = 0;
    const dummy = new THREE.Object3D();

    // Loop through the text grid and position blocks
    for (let y = 0; y < layers.length; y++) {
        const layer = layers[y];
        for (let z = 0; z < layer.length; z++) {
            const row = layer[z].split(' ');
            for (let x = 0; x < row.length; x++) {
                
                const blockType = row[x];
                if (blockType === '.') continue; // Empty space

                // Center the build around 0,0,0
                const offsetX = x * size - (row.length * size) / 2;
                const offsetZ = z * size - (layer.length * size) / 2;
                const offsetY = y * size;

                dummy.position.set(offsetX, offsetY, offsetZ);
                dummy.updateMatrix();

                // Apply to the correct instance group
                if (blockType === 'S') {
                    instStone.setMatrixAt(sIdx++, dummy.matrix);
                } else if (blockType === 'R') {
                    instRoof.setMatrixAt(rIdx++, dummy.matrix);
                } else if (blockType === 'W') {
                    instWood.setMatrixAt(wIdx++, dummy.matrix);
                }
            }
        }
    }

    // Add them to a master group
    const castleGroup = new THREE.Group();
    castleGroup.add(instStone, instRoof, instWood);
    return castleGroup;
}

// ==========================================
// 3. LOAD DATA AND EXECUTE
// ==========================================
const castleData = {
  "tileSize": 1,
  "layers": [[
      "S S S S S S S",
      "S . . . . . S",
      "S . S S S . S",
      "S . S . S . S",
      "S . S S S . S",
      "S . . . . . S",
      "S S S W S S S"
    ],[
      "S S S S S S S",
      "S . . . . . S",
      "S . S S S . S",
      "S . S . S . S",
      "S . S S S . S",
      "S . . . . . S",
      "S S S . S S S"
    ],[
      "S . S . S . S",
      ". . . . . . .",
      "S . S S S . S",
      ". . S . S . .",
      "S . S S S . S",
      ". . . . . . .",
      "S . S . S . S"
    ],[
      "R . R . R . R",
      ". . . . . . .",
      "R . S S S . R",
      ". . S . S . .",
      "R . S S S . R",
      ". . . . . . .",
      "R . R . R . R"
    ],[
      ". . . . . . .",
      ". . . . . . .",
      ". . R R R . .",
      ". . R R R . .",
      ". . R R R . .",
      ". . . . . . .",
      ". . . . . . ."
    ]
  ]
};

const castle = buildCastleFromGrid(castleData);
scene.add(castle);

// Add Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x336633 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

// ==========================================
// 4. RENDER LOOP
// ==========================================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});