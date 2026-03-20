import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetManager {
    constructor(scene) {
        this.scene = scene;
    }

    createInstancedTrees(positions) {
        if (positions.length === 0) return;

        // Tree Geometry (Merge trunk and leaves into one geometry for performance)
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 6);
        trunkGeo.translate(0, 0.5, 0);
        
        const leavesGeo = new THREE.ConeGeometry(1.5, 4, 10);
        leavesGeo.translate(0, 2.5, 0);

        const material = new THREE.MeshStandardMaterial({ color: 0x133d1b });
        const mesh = new THREE.InstancedMesh(leavesGeo, material, positions.length);

        this._populateInstances(mesh, positions);
        this.scene.add(mesh);
    }

    


    createInstancedHouses(positions) {
        if (positions.length === 0) return;
        
        const bodyGeo = new THREE.BoxGeometry(4.5, 3.0, 4.5);
        bodyGeo.translate(0, 0.75, 0);
        const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const mesh = new THREE.InstancedMesh(bodyGeo, material, positions.length);

        this._populateInstances(mesh, positions);
        this.scene.add(mesh);
    }

    async createGLBHouses(positions) {
        const loader = new GLTFLoader();
        const { scene } = await loader.loadAsync('world/models/LHouse.glb');
    
        // 1. Extract the actual Mesh from the GLB scene
        let sourceMesh;
        scene.traverse(child => {
            if (child.isMesh) sourceMesh = child;
        });
    
        // 2. Create the InstancedMesh (Geometry, Material, Count)
        const count = positions.length;
        const iMesh = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material, count);
    
        // 3. Populate matrices
        const dummy = new THREE.Object3D();
        const up = new THREE.Vector3(0, 1, 0);
    
        positions.forEach((pos, i) => {
            dummy.position.copy(pos);
            
            // Orient to sphere normal
            const normal = pos.clone().normalize();
            dummy.quaternion.setFromUnitVectors(up, normal);
            
            dummy.updateMatrix();
            iMesh.setMatrixAt(i, dummy.matrix);
        });
    
        this.scene.add(iMesh);
    }

    async createGLBTowers(positions) {
        const loader = new GLTFLoader();
        const { scene } = await loader.loadAsync('world/models/ChessTower.glb');
    
        // 1. Extract the actual Mesh from the GLB scene
        let sourceMesh;
        scene.traverse(child => {
            if (child.isMesh) sourceMesh = child;
        });
    
        // 2. Create the InstancedMesh (Geometry, Material, Count)
        const count = positions.length;
        const iMesh = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material, count);
    
        // 3. Populate matrices
        const dummy = new THREE.Object3D();
        const up = new THREE.Vector3(0, 1, 0);
    
        positions.forEach((pos, i) => {
            dummy.position.copy(pos);
            
            // Orient to sphere normal
            const normal = pos.clone().normalize();
            dummy.quaternion.setFromUnitVectors(up, normal);
            
            dummy.updateMatrix();
            iMesh.setMatrixAt(i, dummy.matrix);
        });
    
        this.scene.add(iMesh);
    }

    _populateInstances(mesh, positions) {
        const dummy = new THREE.Object3D();
        const up = new THREE.Vector3(0, 1, 0);

        positions.forEach((pos, i) => {
            dummy.position.copy(pos);
            // Align "up" of the asset with the sphere's normal (the position vector)
            const normal = pos.clone().normalize();
            dummy.quaternion.setFromUnitVectors(up, normal);
            
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }
}