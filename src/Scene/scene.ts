import * as THREE from "three";
import { GUI } from "dat.gui";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// Classes
import { Car } from "../classes/Car";
import { Environment } from "../classes/Environment";
import { Renderer } from "../classes/Renderer";
import { SceneConfig, DEFAULT_SCENE_CONFIG } from "../interfaces/SceneConfig";
import { PhysicsWorld } from "../classes/PhysicsWorld";
import { ThirdPersonCamera } from "../classes/ThirdPersonCamera";
import { PhysicsDebugger } from '../classes/PhysicsDebugger';
import { TrackPhysics } from '../classes/TrackPhysics';

export class Scene {
    private scene: THREE.Scene;
    private renderer!: Renderer;
    private gui!: GUI;
    private thirdPersonCamera!: ThirdPersonCamera;
    private environment!: Environment;
    private clock: THREE.Clock;
    private car!: Car;
    private config: SceneConfig;
    private physicsWorld: PhysicsWorld;
    private controls!: OrbitControls;
    private physicsDebugger!: PhysicsDebugger;
    private track!: THREE.Object3D;
    private trackPhysics!: TrackPhysics;

    constructor(config: Partial<SceneConfig> = {}) {
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Couleur bleu ciel
        this.config = { ...DEFAULT_SCENE_CONFIG, ...config };
        this.physicsWorld = new PhysicsWorld();
        
        this.initialize();
    }

    private initialize(): void {  
        // Load car model first
        const loader = new GLTFLoader();
        loader.load('/models/car-002/scene_opti.glb', (gltf) => {
            // Create car with loaded model
            this.car = new Car(gltf.scene, this.config.car);
            this.scene.add(gltf.scene);

            if (this.config.car.position) {
                this.car.setPosition(
                    this.config.car.position.x,
                    this.config.car.position.y,
                    this.config.car.position.z
                );
            }

            // Load track model
            const trackLoader = new GLTFLoader();
            const loadingManager = new THREE.LoadingManager();
            
            // Debug du chargement des textures
            loadingManager.onLoad = () => {
                console.log('Toutes les ressources sont chargées !');
            };
            
            loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                console.log(`Chargement: ${url} (${itemsLoaded}/${itemsTotal})`);
            };
            
            loadingManager.onError = (url) => {
                console.error('Erreur lors du chargement:', url);
            };

            trackLoader.setPath('/models/cartoon_race_track_-_oval/');
            trackLoader.manager = loadingManager;
            
            trackLoader.load('drift_clash_uluru.glb', (trackGltf) => {
                console.log('Modèle GLTF chargé:', trackGltf);
                this.track = trackGltf.scene;
                
                // Debug des matériaux
                this.track.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat, index) => {
                                if (mat instanceof THREE.MeshStandardMaterial) {
                                    // Forcer le chargement des textures
                                    if (mat.map) {
                                        mat.map.colorSpace = THREE.SRGBColorSpace;
                                        mat.map.needsUpdate = true;
                                    }
                                    mat.needsUpdate = true;
                                    mat.envMapIntensity = 1.0;
                                    mat.roughness = 0.5;
                                    mat.metalness = 0.3;
                                }
                            });
                        } else if (child.material instanceof THREE.MeshStandardMaterial) {
                            console.log(`Material for ${child.name}:`, child.material);
                            // Forcer le chargement des textures
                            if (child.material.map) {
                                child.material.map.colorSpace = THREE.SRGBColorSpace;
                                child.material.map.needsUpdate = true;
                            }
                            child.material.needsUpdate = true;
                            child.material.envMapIntensity = 1.0;
                            child.material.roughness = 0.5;
                            child.material.metalness = 0.3;
                        }
                        
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Ajouter un éclairage d'ambiance plus fort
                const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
                this.scene.add(ambientLight);

                // Ajouter une lumière directionnelle plus forte
                const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
                directionalLight.position.set(10, 20, 10);
                directionalLight.castShadow = true;
                this.scene.add(directionalLight);

                this.scene.add(this.track);
                
                // Initialiser la physique du circuit
                this.trackPhysics = new TrackPhysics(this.physicsWorld.getWorld());
                this.trackPhysics.createTrackBody(this.track);
                
                // Initialize other components
                this.thirdPersonCamera = new ThirdPersonCamera(this.car);
                this.environment = new Environment(this.scene, this.thirdPersonCamera, this.config);
                this.renderer = new Renderer(this.thirdPersonCamera, this.config, () => this.animate());
                this.thirdPersonCamera.setRenderer(this.renderer.getRenderer());
                
                // Add car to physics world
                this.physicsWorld.addCar(this.car);

                // Create physics debugger
                this.physicsDebugger = new PhysicsDebugger(this.scene, this.physicsWorld);
                this.physicsDebugger.setCar(this.car);
                
                // Create GUI
                this.createGUI();
            });
        });
    }

    private createGUI() {
        this.gui = new GUI({ width: 300 });
        
        // Contrôles du debugger
        const debugFolder = this.gui.addFolder('Debug');
        debugFolder.add(this.physicsDebugger, 'toggle').name('Toggle Physics Debug');
        
        // Informations de debug
        const debugInfo = this.physicsDebugger.getDebugInfo();
        const debugInfoFolder = debugFolder.addFolder('Debug Info');
        
        // Ajouter les informations de debug
        debugInfoFolder.add(debugInfo, 'speed').name('Speed').listen();
        debugInfoFolder.add(debugInfo.position, 'x').name('Position X').listen();
        debugInfoFolder.add(debugInfo.position, 'y').name('Position Y').listen();
        debugInfoFolder.add(debugInfo.position, 'z').name('Position Z').listen();
        debugInfoFolder.add(debugInfo.rotation, 'y').name('Rotation Y').listen();
        
        debugInfoFolder.open();
    }

    public animate() {
        const delta = this.clock.getDelta();
        
        // Limiter le delta time pour éviter les sauts physiques
        const fixedDelta = Math.min(delta, 1/60);
        
        // Update car
        if (this.car) {
            this.car.update(fixedDelta);
        }

        // Update physics with fixed timestep
        this.physicsWorld.update(fixedDelta);

        // Update third person camera
        if (this.thirdPersonCamera) {
            this.thirdPersonCamera.update();
        }

        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        // Update debugger only if enabled
        if (this.physicsDebugger && this.physicsDebugger.isEnabled()) {
            this.physicsDebugger.update();
        }

        // Render
        if (this.renderer) {
            this.renderer.render(this.scene);
        }
    }

    public updateConfig(newConfig: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.environment.updateConfig(newConfig);
        this.renderer.updateConfig(newConfig);
        if (newConfig.car) {
            this.car.updateConfig(newConfig.car);
        }
    }

    private onWindowResize(): void {
        if (this.thirdPersonCamera && this.renderer) {
            this.thirdPersonCamera.getCamera().aspect = window.innerWidth / window.innerHeight;
            this.thirdPersonCamera.getCamera().updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}