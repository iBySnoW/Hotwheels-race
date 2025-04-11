import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';

// Shader personnalisé pour l'effet de vitesse
const SpeedShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'speed': { value: 0.0 },
        'time': { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float speed;
        uniform float time;
        varying vec2 vUv;

        void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 uv = vUv;
            
            // Effet de distorsion radiale basé sur la vitesse
            float dist = distance(uv, center);
            float strength = speed * 0.05;
            vec2 offset = normalize(uv - center) * dist * strength;
            
            // Vignettage dynamique
            float vignette = 1.0 - dist * speed;
            
            // Chromatic aberration
            vec4 cr = texture2D(tDiffuse, uv + offset * 0.01);
            vec4 cg = texture2D(tDiffuse, uv);
            vec4 cb = texture2D(tDiffuse, uv - offset * 0.01);
            
            gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0) * vignette;
        }
    `
};

export class VisualEffects {
    private composer: EffectComposer;
    private speedPass: ShaderPass;
    private bloomPass: UnrealBloomPass;
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private driftParticles: THREE.Points[] = [];
    private clock: THREE.Clock;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;
        this.clock = new THREE.Clock();

        // Initialiser le composer
        this.composer = new EffectComposer(renderer);
        
        // Ajouter le rendu de base
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Ajouter l'effet Bloom
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.15,  // Intensité très réduite (était 0.4)
            0.1,   // Rayon très réduit (était 0.2)
            0.98   // Seuil très élevé (était 0.95)
        );
        this.composer.addPass(this.bloomPass);

        // Ajouter l'effet de vitesse
        this.speedPass = new ShaderPass(SpeedShader);
        this.composer.addPass(this.speedPass);

        // Ajouter le pass de sortie
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        // Initialiser le système de particules
        this.initParticleSystem();
    }

    private initParticleSystem() {
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.03,  // Taille très réduite (était 0.05)
            color: 0x888888,  // Couleur très sombre (était 0xaaaaaa)
            transparent: true,
            opacity: 0.15,  // Opacité très réduite (était 0.25)
            blending: THREE.AdditiveBlending
        });

        // Créer plusieurs systèmes de particules pour les drifts
        for (let i = 0; i < 2; i++) {
            const particles = new THREE.Points(particleGeometry.clone(), particleMaterial.clone());
            this.driftParticles.push(particles);
            this.scene.add(particles);
        }
    }

    public update(speed: number, isDrifting: boolean, carPosition: THREE.Vector3, carRotation: THREE.Euler) {
        const time = this.clock.getElapsedTime();

        // Mettre à jour l'effet de vitesse
        this.speedPass.uniforms['speed'].value = Math.min(speed / 30, 1.0);
        this.speedPass.uniforms['time'].value = time;

        // Ajuster le bloom en fonction de la vitesse (intensité très réduite)
        this.bloomPass.strength = 0.1 + speed * 0.005;  // Très réduit (était 0.2 + speed * 0.015)

        // Mettre à jour les particules de drift
        if (isDrifting) {
            this.updateDriftParticles(carPosition, carRotation);
        }
    }

    private updateDriftParticles(carPosition: THREE.Vector3, carRotation: THREE.Euler) {
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);

        // Créer des positions de particules pour chaque roue arrière
        for (let i = 0; i < this.driftParticles.length; i++) {
            const offset = new THREE.Vector3(
                i === 0 ? -0.5 : 0.5,  // Décalage latéral pour chaque roue
                0,
                -1
            );

            // Appliquer la rotation de la voiture à l'offset
            offset.applyEuler(carRotation);

            for (let j = 0; j < particleCount; j++) {
                const spread = 0.1;
                positions[j * 3] = carPosition.x + offset.x + (Math.random() - 0.5) * spread;
                positions[j * 3 + 1] = carPosition.y + 0.1;
                positions[j * 3 + 2] = carPosition.z + offset.z + (Math.random() - 0.5) * spread;
            }

            const geometry = this.driftParticles[i].geometry;
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.attributes.position.needsUpdate = true;
        }
    }

    public resize(width: number, height: number) {
        this.composer.setSize(width, height);
    }

    public render() {
        this.composer.render();
    }
} 