import * as THREE from 'three';

export class AssetManager {
    constructor(scene) {
        this.scene = scene;
    }

    createInstancedTrees(positions) {
        if (positions.length === 0) return;

        // Tree Geometry (Merge trunk and leaves into one geometry for performance)
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 6);
        trunkGeo.translate(0, 0.5, 0);
        
        const leavesGeo = new THREE.ConeGeometry(0.8, 2, 6);
        leavesGeo.translate(0, 1.5, 0);

        const material = new THREE.MeshStandardMaterial({ color: 0x133d1b });
        const mesh = new THREE.InstancedMesh(leavesGeo, material, positions.length);

        this._populateInstances(mesh, positions);
        this.scene.add(mesh);
    }

    createInstancedHouses(positions) {
        if (positions.length === 0) return;

        const bodyGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        bodyGeo.translate(0, 0.75, 0);
        const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const mesh = new THREE.InstancedMesh(bodyGeo, material, positions.length);

        this._populateInstances(mesh, positions);
        this.scene.add(mesh);
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