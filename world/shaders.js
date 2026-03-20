import * as THREE from 'three';

export const TerrainShader = {
    inject: (material) => {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uSnowLevel = { value: 0.8 };
            shader.uniforms.uRockLevel = { value: 0.65 };
            shader.uniforms.uSandLevel = { value: 0.5 };

            // 1. VERTEX SHADER: Pass UVs to Fragment and sample height
            shader.vertexShader = `
                varying float vCustomHeight;
                varying vec2 vCustomUv; 
                ${shader.vertexShader}
            `.replace(
                `#include <fog_vertex>`,
                `#include <fog_vertex>
                 vCustomHeight = texture2D(displacementMap, uv).r;
                 vCustomUv = uv; // Capture UV for latitude logic`
            );

            // 2. FRAGMENT SHADER: Latitude-based coloring
            shader.fragmentShader = `
                varying float vCustomHeight;
                varying vec2 vCustomUv;
                uniform float uSnowLevel;
                uniform float uRockLevel;
                uniform float uSandLevel;
                ${shader.fragmentShader}
            `.replace(
                `vec4 diffuseColor = vec4( diffuse, opacity );`,
                `
                // --- Climate Math ---
                // vCustomUv.y goes from 0 (North Pole) to 1 (South Pole)
                // lat: 0.0 at equator, 1.0 at poles
                float lat = abs(vCustomUv.y - 0.6) * 3.0;
                
                // Colors
                vec3 sand = vec3(0.8, 0.75, 0.5);
                vec3 desert = vec3(0.85, 0.65, 0.35); // Redder/hotter sand
                vec3 grass = vec3(0.15, 0.45, 0.08);
                vec3 rock = vec3(0.4, 0.35, 0.3);
                vec3 snow = vec3(0.95, 0.95, 1.0);
                
                // 1. Determine base biome color (Equator is drier)
                float equatorHeat = smoothstep(0.25, 0.0, lat); 
                vec3 baseLand = mix(grass, desert, equatorHeat * 0.6);

                // 2. Height Logic
                vec3 finalColor = baseLand;
                if(vCustomHeight < uSandLevel) {
                    finalColor = mix(sand, baseLand, smoothstep(0.0, uSandLevel, vCustomHeight));
                } else if(vCustomHeight > uRockLevel) {
                    finalColor = mix(baseLand, rock, smoothstep(uRockLevel, uSnowLevel, vCustomHeight));
                }

                // 3. Polar & Mountain Snow Logic
                // Snow appears at lower heights as we get closer to poles
                float dynamicSnowThresh = mix(uSnowLevel, 0.1, pow(lat, 3.0));
                
                if(vCustomHeight > dynamicSnowThresh) {
                    float snowStrength = smoothstep(dynamicSnowThresh, dynamicSnowThresh + 0.1, vCustomHeight);
                    finalColor = mix(finalColor, snow, snowStrength);
                }
                
                // Ensure absolute poles are always snowy
                float poleCap = smoothstep(0.85, 0.98, lat);
                finalColor = mix(finalColor, snow, poleCap);

                vec4 diffuseColor = vec4( finalColor, opacity );
                `
            );
        };
    }
};

export const WaterShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x0044ff) }
    },
    transparent: true,
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        uniform float uTime;
        void main() {
            vUv = uv;
            vec3 pos = position;
            // Procedural wave movement
            float wave = sin(pos.x * 0.05 + uTime) * cos(pos.z * 0.05 + uTime) * 1.0;
            pos += normal * wave;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        uniform vec3 uColor;
        void main() {
            float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewPosition)), 3.0);
            vec3 color = mix(uColor, vec3(1.0), fresnel * 0.5);
            gl_FragColor = vec4(color, 0.7);
        }
    `
});

// IDEA: Atmosphere Glow Shader
export const AtmosphereShaderMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    uniforms: {
        uColor: { value: new THREE.Color(0x3388cc) }
    },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uColor;
        void main() {
            // Using the normal to create a soft halo
            float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.15);
            gl_FragColor = vec4(uColor, intensity);
        }
    `
});