import * as THREE from 'three';
import { LoopRepeat } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export class AssetManager {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.cache = new Map();
        
        this.staticBatches = [];  // Won't move
        this.dynamicBatches = []; // Will move every frame
        this.actors = [];         // Unique animated models
        
        this._tempObj = new THREE.Object3D(); // Reusable dummy for math
        this._up = new THREE.Vector3(0, 1, 0);
    }

    async _load(url) {
        if (!this.cache.has(url)) {
            const gltf = await this.loader.loadAsync(url);
            this.cache.set(url, gltf);
        }
        return this.cache.get(url);
    }

    /**
     * Helper: Aligns an object to look "up" from the center of a sphere
     */
    _alignToSphere(obj, pos) {
        obj.position.copy(pos);
        const normal = pos.clone().normalize();
        obj.quaternion.setFromUnitVectors(this._up, normal);
    }

    /**
     * Create a Batch (Static or Moving)
     */
    async addBatch(id, url, positions, config = {}) {
        const gltf = await this._load(url);
        let sourceMesh;
        gltf.scene.traverse(c => { if (c.isMesh && !sourceMesh) sourceMesh = c; });

        const count = positions.length;
        const mesh = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material, count);
        
        // We store the 'state' of each instance here so we don't have to read matrices
        const instances = positions.map(pos => {
            const data = { 
                pos: pos.clone(), 
                rotY: Math.random() * Math.PI * 2,
                scale: config.scale || 1 
            };
            return data;
        });

        const batchObj = { id, mesh, instances, speed: config.speed || 0 };
        
        if (batchObj.speed > 0) {
            this.dynamicBatches.push(batchObj);
        } else {
            // Apply static positions once
            instances.forEach((data, i) => {
                this._alignToSphere(this._tempObj, data.pos);
                this._tempObj.rotateY(data.rotY);
                this._tempObj.scale.setScalar(data.scale);
                this._tempObj.updateMatrix();
                mesh.setMatrixAt(i, this._tempObj.matrix);
            });
            this.staticBatches.push(batchObj);
        }

        this.scene.add(mesh);
        return batchObj;
    }

    /**
     * Spawn an Animated Actor
     */
    async spawnActor(url, pos, config = {}) {
        const gltf = await this._load(url);
        const model = SkeletonUtils.clone(gltf.scene);
        
        this._alignToSphere(model, pos);
        model.scale.setScalar(config.scale || 1);
        this.scene.add(model);

        const mixer = new THREE.AnimationMixer(model);
        const actions = {};
        
        gltf.animations.forEach(clip => {
            // Store by name, but also lowercase for easy searching
            actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
            //mixer.clipAction(clip).loop = LoopRepeat;
        });

        

        const actor = {
            model, mixer, actions, 
            speed: config.speed || 0,
            
            // Flexible play: assets.play(actor, 'fly') 
            play: (name) => {
                const key = Object.keys(actions).find(k => k.includes(name.toLowerCase()));
                if (key) actions[key].reset().fadeIn(0.5).play();
            }
        };

        actor.play('fly');

        this.actors.push(actor);
        return actor;
    }

    update(delta) {
        // 1. Update Unique Animated Actors
        this.actors.forEach(actor => {
            actor.mixer.update(delta);
            if (actor.speed > 0) {
                actor.model.translateZ(actor.speed * delta);
                // Keep stuck to sphere surface
                this._alignToSphere(actor.model, actor.model.position);
            }
        });

        // 2. Update Moving Batches (e.g. Clouds, Birds)
        this.dynamicBatches.forEach(batch => {
            batch.instances.forEach((data, i) => {
                // Move the position data
                this._tempObj.position.copy(data.pos);
                this._tempObj.quaternion.setFromUnitVectors(this._up, data.pos.clone().normalize());
                this._tempObj.rotateY(data.rotY);
                
                // Move forward
                this._tempObj.translateZ(batch.speed * delta);
                
                // Save new position back to data for next frame
                data.pos.copy(this._tempObj.position);
                
                // Re-align to sphere normal
                this._alignToSphere(this._tempObj, data.pos);
                this._tempObj.rotateY(data.rotY);
                this._tempObj.scale.setScalar(data.scale);
                
                this._tempObj.updateMatrix();
                batch.mesh.setMatrixAt(i, this._tempObj.matrix);
            });
            batch.mesh.instanceMatrix.needsUpdate = true;
        });
    }
}