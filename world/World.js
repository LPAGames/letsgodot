import * as THREE from 'three';
import { TerrainShader, WaterShaderMaterial, AtmosphereShaderMaterial } from './shaders.js';

export class World {
    constructor(scene, config) {
        this.scene = scene;
        this.radius = config.radius;
        this.heightScale = config.heightScale;
        this.waterLevel = config.waterLevel;
        this.resolution = config.resolution;
        
        this.heightData = null;
        this.terrainMesh = null;
        this.waterMesh = null;
    }

    async init(mapSrc) {
        this.heightData = await this._loadHeightImageData(mapSrc);
        
        // 1. Create Texture first
        const loader = new THREE.TextureLoader();
        const texture = await loader.loadAsync(mapSrc); // Use loadAsync for safety
        
        // 2. Create Material and assign texture immediately
        const mat = new THREE.MeshStandardMaterial({
            displacementMap: texture, // MUST be here
            displacementScale: this.heightScale,
            flatShading: true,
            metalness: 0.2,
            roughness: 0.8
        });
    
        // 3. Now inject the custom code
        TerrainShader.inject(mat);
    
        const geo = new THREE.SphereGeometry(this.radius, this.resolution, this.resolution / 2);
        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.terrainMesh);

        // 2. Water
        const waterGeo = new THREE.SphereGeometry(this.waterLevel, 128, 128);
        this.waterMesh = new THREE.Mesh(waterGeo, WaterShaderMaterial);
        this.scene.add(this.waterMesh);
        

        // 3. Atmosphere (NEW IDEA)
        const atmoGeo = new THREE.SphereGeometry(this.radius * 1.2, 64, 64);
        const atmoMesh = new THREE.Mesh(atmoGeo, AtmosphereShaderMaterial);
        this.scene.add(atmoMesh);
    }


    getCoords(lat, lon) {
        // 1. Convert Lat/Lon to 0-1 range (UV space)
        let v = (90 - lat) / 180;        // 0 at North, 1 at South
        let u = (lon + 180) / 360;      // 0 at -180, 1 at 180

        // 2. Reverse your heightmap offset logic (the 0.249)
        // This ensures the camera lands on the same pixel the heightmap uses
        u = (u - 0.25);
        if (u < 0) u += 1;

        // 3. Convert UV back to Phi/Theta for Three.js
        const phi = v * Math.PI;
        const theta = u * Math.PI * 2;

        return { phi, theta };
    }


    getSampledHeight(phi, theta) {
        if (!this.heightData) return 0;
        let v = phi / Math.PI;
        let u = (theta / (Math.PI * 2) + 0.25) % 1.0;
        const x = Math.floor(u * (this.heightData.width - 1));
        const y = Math.floor(v * (this.heightData.height - 1));
        const index = (y * this.heightData.width + x) * 4;
        return this.heightData.data[index] / 255;
    }

    update(time) {
        if (this.waterMesh) {
            this.waterMesh.material.uniforms.uTime.value = time;
        }
    }

    async _loadHeightImageData(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve({
                    data: ctx.getImageData(0, 0, img.width, img.height).data,
                    width: img.width, height: img.height
                });
            };
        });
    }

}