    
    
    import * as THREE from 'three';
    import Stats from 'three/addons/libs/stats.module.js';
    import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

    // --- Settings ---
    const WORLD_RADIUS = 125;
    const MOUNTAIN_HEIGHT = WORLD_RADIUS / 15.0; // How high the mountains are
    const WATER_LEVEL = WORLD_RADIUS + (WORLD_RADIUS* 0.005);
    const BUILDING_LEVEL = WATER_LEVEL + 2.0;
    const RESOLUTION = 512;      // Detailed mesh (increase for more detail)

    let scene, camera, renderer, controls;

    const stats = new Stats();

    // --- Helper: Spherical Placement ---
    function getSphericalPos(radius, phi, theta) {
        return new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    // --- Assets Creation ---
    const createTree = (pos) => {
        const tree = new THREE.Group();
        
        const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.4, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d2926 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.2;
        tree.add(trunk);

        const leavesGeo = new THREE.ConeGeometry(0.25, 0.6, 6);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b4d2e });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 0.5;
        tree.add(leaves);

        tree.position.copy(pos);
        tree.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
        tree.castShadow = true;
        return tree;
    };

    const createHouse = (pos) => {
        const house = new THREE.Group();
        
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.2;
        house.add(body);

        const roofGeo = new THREE.ConeGeometry(0.35, 0.3, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 0.5;
        roof.rotation.y = Math.PI/4;
        house.add(roof);

        house.position.copy(pos);
        house.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
        house.castShadow = true;
        return house;
    };

    const createTower = (pos) => {
        const tower = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        tower.add(body);

        const topGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8);
        const top = new THREE.Mesh(topGeo, bodyMat);
        top.position.y = 1.2;
        tower.add(top);

        const roofGeo = new THREE.ConeGeometry(0.45, 0.5, 8);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.5;
        tower.add(roof);

        tower.position.copy(pos);
        tower.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
        tower.castShadow = true;
        return tower;
    };

    init();

    function init() {
        // 1. Scene Setup
        scene = new THREE.Scene();
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, WORLD_RADIUS * 2);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.setPixelRatio(window.devicePixelRatio);
        
        document.body.appendChild(renderer.domElement);
        document.body.appendChild(stats.dom);

        // 2. Load the Heightmap
        const loader = new THREE.TextureLoader();
        
        // Note: If you don't have the file yet, this will show a black sphere
        const heightMap = loader.load('imgs/topography_2k.png', 
            // Success callback
            () => console.log("Heightmap loaded successfully"),
            // Progress
            undefined,
            // Error callback
            (err) => console.error("Error loading ./topography_2k.png. Make sure you are using a local server.")
        );

        // 3. Create the Rounded World
        // We use SphereGeometry. The segments define how detailed the terrain looks.
        const geometry = new THREE.SphereGeometry(WORLD_RADIUS, RESOLUTION, RESOLUTION / 2);
        const water_geometry = new THREE.SphereGeometry(WATER_LEVEL, RESOLUTION, RESOLUTION / 2);

        // 4. Material with Displacement
        // displacementMap moves vertices based on image brightness
        const material = new THREE.MeshStandardMaterial({
            color: 0x009900,
            displacementMap: heightMap,
            displacementScale: MOUNTAIN_HEIGHT,
            wireframe: false,
            flatShading: true
        });

        const world = new THREE.Mesh(geometry, material);
        scene.add(world);
        const water = new THREE.Mesh(water_geometry, new THREE.MeshStandardMaterial({ color: 0x4444ff, roughness: 0.2 }));
        scene.add(water);

        const worldGroup = new THREE.Group();
        scene.add(worldGroup);

        // 5. Lighting (Essential for seeing the height)
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.position.set(10, 10, 10);
        scene.add(sun);
        
        const ambient = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambient);

        // Populate World
        for(let i = 0; i < 500; i++) {
            const phi = Math.random() * Math.PI;
            const theta = Math.random() * Math.PI * 2;
            const pos = getSphericalPos(BUILDING_LEVEL, phi, theta);
            
            // Avoid extreme poles for logic
            if(phi > 0.4 && phi < 2.7) {
                if(Math.random() > 0.8) {
                    worldGroup.add(createHouse(pos));
                } else {
                    worldGroup.add(createTree(pos));
                }
            }
        }

        // Castle at "North Pole"
        worldGroup.add(createTower(getSphericalPos(BUILDING_LEVEL, 0.1, 0)));
        worldGroup.add(createTower(getSphericalPos(BUILDING_LEVEL, 0.3, 0.5)));
        worldGroup.add(createTower(getSphericalPos(BUILDING_LEVEL, 0.3, -0.5)));

        // --- Stars ---
        const starGeo = new THREE.BufferGeometry();
        const starPos = [];
        for(let i = 0; i < 3000; i++) {
            starPos.push((Math.random() - 0.5) * 4000, (Math.random() - 0.5) * 4000, (Math.random() - 0.5) * 4000);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
        const stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);

        // 6. Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        window.addEventListener('resize', onWindowResize);
        animate();
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        stats.update();
        renderer.render(scene, camera);
    }


    

    