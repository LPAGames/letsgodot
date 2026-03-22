import * as THREE from 'three';
import { LoopRepeat, NormalAnimationBlendMode } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export class AssetManager {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        
        this.cache = new Map();         // Raw GLTF data
        this.staticBatches = new Map(); // InstancedMeshes
        this.actors = [];               // Active animated models
    }

    /**
     * PRIVATE: Load and cache GLB files
     */
    async _load(url) {
        if (!this.cache.has(url)) {
            const gltf = await this.loader.loadAsync(url);
            this.cache.set(url, gltf);
        }
        return this.cache.get(url);
    }

    /**
     * STATIC BATCHING (Houses, Trees, Rocks)
     * High performance, 1 draw call, no individual animations
     */
    async addStaticBatch(id, url, positions, config = {}) {
        const gltf = await this._load(url);
        let sourceMesh;
        gltf.scene.traverse(c => { if (c.isMesh && !sourceMesh) sourceMesh = c; });

        const mesh = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material, positions.length);
        const dummy = new THREE.Object3D();
        const up = new THREE.Vector3(0, 1, 0);

        positions.forEach((pos, i) => {
            dummy.position.copy(pos);
            const normal = pos.clone().normalize();
            dummy.quaternion.setFromUnitVectors(up, normal);
            if (config.randomRotation) dummy.rotateY(Math.random() * Math.PI * 2);
            dummy.scale.setScalar(config.scale || 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });

        this.scene.add(mesh);
        this.staticBatches.set(id, mesh);
        return mesh;
    }

    /**
     * ANIMATED MODELS (Dragons, NPCs, Players)
     * Each one is unique and can play different animations
     */
    async spawnAnimated(url, position) {
        const gltf = await this._load(url);
        
        // 1. Correctly clone an animated model using SkeletonUtils
        const model = SkeletonUtils.clone(gltf.scene);
        if (position) model.position.copy(position);
        this.scene.add(model);
        const normal = position.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        model.quaternion.setFromUnitVectors(up, normal);
        model.scale.setScalar(15.0);

        // 2. Set up the Animation System for this specific instance
        const mixer = new THREE.AnimationMixer(model);
        const actions = {};

        
        // Map animation names to actions (e.g., actor.actions['Run'].play())
        gltf.animations.forEach(clip => {
            if (clip.name.includes('Armature|Armature|Fly'))
            {
                mixer.clipAction(clip).loop = LoopRepeat;
                mixer.clipAction(clip).blendMode = NormalAnimationBlendMode;
                mixer.clipAction(clip).play();
            }

            actions[clip.name] = mixer.clipAction(clip);
        });

        // 3. Create the Actor object
        const actor = {
            model: model,
            mixer: mixer,
            actions: actions,
            currentAction: null,

            // Helper to change animations with a smooth fade
            play: function(name, duration = 0.5) {
                const next = this.actions[name];
                if (!next) return console.warn(`Animation ${name} not found`);
                
                if (this.currentAction && this.currentAction !== next) {
                    this.currentAction.fadeOut(duration);
                }
                
                next.reset().fadeIn(duration).play();
                this.currentAction = next;
            },

            destroy: () => {
                this.scene.remove(model);
                // Clean up references in the manager
                this.actors = this.actors.filter(a => a !== actor);
            }
        };


        this.actors.push(actor);
        return actor;
    }

    /**
     * UPDATE LOOP
     * Call this in your requestAnimationFrame
     */
    update(delta) {
        for (let i = 0; i < this.actors.length; i++) {
            this.actors[i].mixer.update(delta);
        }
    }

    /**
     * CLEANUP
     */
    destroyBatch(id) {
        const batch = this.staticBatches.get(id);
        if (batch) {
            this.scene.remove(batch);
            batch.geometry.dispose();
            this.staticBatches.delete(id);
        }
    }
}