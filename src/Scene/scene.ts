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
import { FPSCounter } from '../classes/FPSCounter';

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
    private fixedTimeStep: number = 1/120;
    private maxFPS: number = 120;
    private fpsInterval: number;
    private lastTime: number = 0;
    private accumulator: number = 0;
    private previousState: any = null;
    private currentState: any = null;
    private isInitialized: boolean = false;
    private fpsCounter!: FPSCounter;

    constructor(config: Partial<SceneConfig> = {}) {
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.config = { ...DEFAULT_SCENE_CONFIG, ...config };
        this.physicsWorld = new PhysicsWorld();
        this.fpsCounter = new FPSCounter();
        this.lastTime = performance.now();
        this.fpsInterval = 1000 / this.maxFPS;
        
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
                this.renderer = new Renderer(this.thirdPersonCamera, this.config);
                this.thirdPersonCamera.setRenderer(this.renderer.getRenderer());
                
                // Add car to physics world
                this.physicsWorld.addCar(this.car);

                // Create physics debugger
                this.physicsDebugger = new PhysicsDebugger(this.scene, this.physicsWorld);
                this.physicsDebugger.setCar(this.car);
                
                // Create GUI
                this.createGUI();

                // Démarrer les boucles seulement après l'initialisation complète
                this.isInitialized = true;
                this.gameLoop();
            });
        });
    }

    private gameLoop(): void {
        if (!this.isInitialized) return;

        const currentTime = performance.now();
        let frameTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        frameTime = Math.min(frameTime, 0.25);
        this.accumulator += frameTime;

        while (this.accumulator >= this.fixedTimeStep) {
            if (this.car) {
                this.car.update(this.fixedTimeStep);
            }
            this.physicsWorld.update(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        if (this.thirdPersonCamera) {
            this.thirdPersonCamera.update();
        }

        if (this.controls) {
            this.controls.update();
        }

        if (this.physicsDebugger && this.physicsDebugger.isEnabled()) {
            this.physicsDebugger.update();
        }

        this.fpsCounter.update();

        if (this.renderer) {
            this.renderer.render(this.scene);
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    private createGUI() {
        this.gui = new GUI({ width: 300 });
        
        const debugFolder = this.gui.addFolder('Debug');
        debugFolder.add(this.physicsDebugger, 'toggle').name('Toggle Physics Debug');
        
        const debugInfo = this.physicsDebugger.getDebugInfo();
        const debugInfoFolder = debugFolder.addFolder('Debug Info');
        
        debugInfoFolder.add(debugInfo, 'speed').name('Speed').listen();
        debugInfoFolder.add(debugInfo.position, 'x').name('Position X').listen();
        debugInfoFolder.add(debugInfo.position, 'y').name('Position Y').listen();
        debugInfoFolder.add(debugInfo.position, 'z').name('Position Z').listen();
        debugInfoFolder.add(debugInfo.rotation, 'y').name('Rotation Y').listen();
        
        debugFolder.add(this.fpsCounter, 'show').name('Show FPS');
        debugFolder.add(this.fpsCounter, 'hide').name('Hide FPS');
        
        debugInfoFolder.open();
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

    // Méthode pour arrêter proprement les boucles
    public dispose(): void {
        this.isInitialized = false;
    }
}