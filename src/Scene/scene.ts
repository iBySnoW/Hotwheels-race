import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// Classes
import { Car } from "../classes/Car";
import { Environment } from "../classes/Environment";
import { Renderer } from "../classes/Renderer";
import { SceneConfig, DEFAULT_SCENE_CONFIG } from "../interfaces/SceneConfig";
import { PhysicsWorld } from "../classes/PhysicsWorld";
import { ThirdPersonCamera } from "../classes/ThirdPersonCamera";
import { TrackPhysics } from '../classes/TrackPhysics';
import { FPSCounter } from '../classes/FPSCounter';
import { Speedometer } from '../classes/Speedometer';
import { PerformanceMonitor } from '../classes/PerformanceMonitor';
import { CullingManager } from '../classes/CullingManager';

export class Scene {
    private scene: THREE.Scene;
    private renderer!: Renderer; 
    private thirdPersonCamera!: ThirdPersonCamera;
    private environment!: Environment;
    private car!: Car;
    private config: SceneConfig;
    private physicsWorld: PhysicsWorld;
    private controls!: OrbitControls;
    private track!: THREE.Object3D;
    private trackPhysics!: TrackPhysics;
    private fpsCounter!: FPSCounter;
    private speedometer!: Speedometer;

    // Configuration du temps et de la physique
    private lastTime: number = performance.now();
    private isInitialized: boolean = false;
    
    // Nouveaux paramètres pour la gestion du temps
    private static readonly TIME_CONFIG = {
        FIXED_TIMESTEP: 1/60,
        MAX_DELTA: 1/60,    // Réduit pour éviter les grands sauts de physique
        MIN_DELTA: 1/120,   // Évite les calculs trop fréquents
        TIME_SCALE: 1.0     // Permet de ralentir/accélérer le temps
    };
    
    private physicsAccumulator: number = 0;
    private performanceMonitor: PerformanceMonitor;
    private cullingManager!: CullingManager;

    // Système de suivi de chargement
    private loadingManager: THREE.LoadingManager;
    private onLoadingProgressCallback: ((progress: number) => void) | null = null;
    private totalAssetsToLoad: number = 0;
    private loadedAssets: number = 0;

    constructor(config: Partial<SceneConfig> = {}, onLoadingProgress?: (progress: number) => void) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.config = { ...DEFAULT_SCENE_CONFIG, ...config };
        this.physicsWorld = new PhysicsWorld();
        this.fpsCounter = new FPSCounter();
        this.performanceMonitor = new PerformanceMonitor();
        
        // Initialiser le gestionnaire de chargement
        this.onLoadingProgressCallback = onLoadingProgress || null;
        this.loadingManager = new THREE.LoadingManager();
        this.setupLoadingManager();
        
        this.initialize();
    }

    private setupLoadingManager(): void {
        // Compter le nombre total d'assets à charger
        this.totalAssetsToLoad = 2; // Voiture et circuit
        
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            this.loadedAssets = itemsLoaded;
            const progress = this.loadedAssets / this.totalAssetsToLoad;
            
            if (this.onLoadingProgressCallback) {
                this.onLoadingProgressCallback(progress);
            }
            
            console.log(`Chargement: ${url} (${itemsLoaded}/${itemsTotal})`);
        };
        
        this.loadingManager.onLoad = () => {
            console.log('Toutes les ressources sont chargées !');
            
            // Signaler que le chargement est terminé
            if (this.onLoadingProgressCallback) {
                this.onLoadingProgressCallback(1.0);
            }
        };
        
        this.loadingManager.onError = (url) => {
            console.error('Erreur lors du chargement:', url);
        };
    }

    private initialize(): void {  
        // Load car model first
        const loader = new GLTFLoader(this.loadingManager);
        loader.load('/models/car/car.glb', (gltf) => {
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

            // Initialize speedometer
            this.speedometer = new Speedometer(this.car);

            // Load track model
            const trackLoader = new GLTFLoader(this.loadingManager);
            
            trackLoader.setPath('/models/race/');
            
            trackLoader.load('race.glb', (trackGltf) => {
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

                // Initialiser les gestionnaires d'optimisation
                this.initializeOptimizationManagers();
              
                // Démarrer les boucles seulement après l'initialisation complète
                this.isInitialized = true;
                this.gameLoop();
            });
        });
    }
    
    /**
     * Initialise les gestionnaires d'optimisation
     */
    private initializeOptimizationManagers(): void {
        this.cullingManager = new CullingManager(this.scene, this.thirdPersonCamera.getCamera(), {
            enabled: true,
            maxDistance: 1000
        });
        
        this.applyOptimizationsToScene();
    }
    
    /**
     * Applique les optimisations aux objets de la scène
     */
    private applyOptimizationsToScene(): void {
        console.log("Application des optimisations à la scène...");
        
        // Appliquer le culling à tous les objets de la scène
        this.track.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                this.cullingManager.registerObject(child);
            }
        });
        
        // Appliquer le culling à la voiture
        const carModel = this.car.getModel();
        if (carModel) {
            this.cullingManager.registerObject(carModel);
        }
        
        console.log("Optimisations appliquées avec succès");
    }

    private gameLoop(): void {
        if (!this.isInitialized) return;

        // Calcul du delta time en secondes avec limites
        const currentTime = performance.now();
        let deltaTime = (currentTime - this.lastTime) / 1000;
        
        // Limiter le delta time
        deltaTime = Math.max(Math.min(deltaTime, Scene.TIME_CONFIG.MAX_DELTA), Scene.TIME_CONFIG.MIN_DELTA);
        deltaTime *= Scene.TIME_CONFIG.TIME_SCALE;
        
        this.lastTime = currentTime;
        
        // Accumulation du temps pour la physique
        this.physicsAccumulator += deltaTime;
        
        // Mise à jour de la physique avec un pas fixe
        const physicsStartTime = performance.now();
        while (this.physicsAccumulator >= Scene.TIME_CONFIG.FIXED_TIMESTEP) {
            this.updatePhysics(Scene.TIME_CONFIG.FIXED_TIMESTEP);
            this.physicsAccumulator -= Scene.TIME_CONFIG.FIXED_TIMESTEP;
        }
        const physicsTime = performance.now() - physicsStartTime;
        
        // Mise à jour du rendu avec interpolation
        const alpha = this.physicsAccumulator / Scene.TIME_CONFIG.FIXED_TIMESTEP;
        this.updateRender(deltaTime, alpha);
        
        // Mise à jour des gestionnaires d'optimisation
        this.updateOptimizationManagers();
        
        // Mise à jour du moniteur de performance
        this.performanceMonitor.update(deltaTime, physicsTime);
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Met à jour les gestionnaires d'optimisation
     */
    private updateOptimizationManagers(): void {
        this.cullingManager.update();
    }
    
    private updatePhysics(deltaTime: number): void {
        // Mise à jour de la physique
        if (this.car) {
            this.car.update(deltaTime);
        }
        this.physicsWorld.update(deltaTime);
    }
    
    private updateRender(deltaTime: number, alpha: number): void {
        // Mise à jour des composants visuels
        if (this.thirdPersonCamera) {
            this.thirdPersonCamera.update();
        }

        if (this.controls) {
            this.controls.update();
        }

        if (this.speedometer) {
            this.speedometer.update();
        }

        this.fpsCounter.update();

        // Rendu de la scène
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

    public dispose(): void {
        this.isInitialized = false;
        if (this.speedometer) {
            this.speedometer.dispose();
        }
    }
}