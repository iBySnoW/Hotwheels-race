import * as THREE from "three";
import { GUI } from "dat.gui";
// Classes
import { Car } from "../classes/Car";
import { Environment } from "../classes/Environment";
import { Renderer } from "../classes/Renderer";
import { SceneConfig, DEFAULT_SCENE_CONFIG } from "../interfaces/SceneConfig";
import { PhysicsEngine } from "../classes/PhysicsEngine";
import { ThirdPersonCamera } from "../classes/ThirdPersonCamera";

export class Scene {
    private scene: THREE.Scene;
    private renderer!: Renderer;
    private gui!: GUI;
    private thirdPersonCamera!: ThirdPersonCamera;
    private environment!: Environment;
    private clock: THREE.Clock;
    private car!: Car;
    private config: SceneConfig;
    private physicsEngine: PhysicsEngine;

    constructor(config: Partial<SceneConfig> = {}) {
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.config = { ...DEFAULT_SCENE_CONFIG, ...config };
        this.physicsEngine = new PhysicsEngine(this.scene);
        
        this.initialize();
    }

    private initialize(): void {  
        // Load car model first
        this.car = new Car('/models/car-002/scene.gltf', this.config.car, (model) => {
            this.scene.add(model);
            if (this.config.car.position) {
                this.car.setPosition(
                    this.config.car.position.x,
                    this.config.car.position.y,
                    this.config.car.position.z
                );
            }
            
            // Initialiser la caméra à la troisième personne
            this.thirdPersonCamera = new ThirdPersonCamera(this.car);
            
            // Initialize environment
            this.environment = new Environment(this.scene, this.thirdPersonCamera, this.config);
            
            // Initialize renderer
            this.renderer = new Renderer(this.thirdPersonCamera, this.config, () => this.animate());
            
            // Ajouter la voiture au moteur physique
            this.physicsEngine.addObject(this.car);
            
            this.createGUI();
        });

        // Activer le mode debug pour voir les boîtes de collision
        this.physicsEngine.setDebugMode(true);
    }

    private createGUI() {
        this.gui = new GUI({ width: 300 });
        
        // Car controls
        const carFolder = this.gui.addFolder('Car Controls');
        const car = this.car;
        
        // Position controls
        const positionFolder = carFolder.addFolder('Position');
        const model = car.getModel();
        if (model) {
            positionFolder.add(model.position, 'x', -10, 10, 0.1);
            positionFolder.add(model.position, 'y', -10, 10, 0.1);
            positionFolder.add(model.position, 'z', -10, 10, 0.1);
            positionFolder.open();
        }

        // Car settings
        const settingsFolder = carFolder.addFolder('Settings');
        const config = { ...this.config.car };

        settingsFolder.add(config, 'maxSpeed', 0.1, 1, 0.1)
            .onChange((value) => {
                this.config.car.maxSpeed = value;
                car.updateConfig({ maxSpeed: value });
            });
        settingsFolder.add(config, 'acceleration', 0.001, 0.1, 0.001)
            .onChange((value) => {
                this.config.car.acceleration = value;
                car.updateConfig({ acceleration: value });
            });
        settingsFolder.add(config, 'deceleration', 0.001, 0.1, 0.001)
            .onChange((value) => {
                this.config.car.deceleration = value;
                car.updateConfig({ deceleration: value });
            });
        settingsFolder.add(config, 'rotationSpeed', 0.01, 0.2, 0.01)
            .onChange((value) => {
                this.config.car.rotationSpeed = value;
                car.updateConfig({ rotationSpeed: value });
            });

        // Camera settings
        const cameraFolder = this.gui.addFolder('Camera');
        const cameraConfig = {
            offsetX: 0,
            offsetY: 3,
            offsetZ: 0,
            smoothness: 0.1
        };

        cameraFolder.add(cameraConfig, 'offsetX', -10, 10, 0.1)
            .onChange((value) => this.thirdPersonCamera.setPosition(new THREE.Vector3(value, cameraConfig.offsetY, cameraConfig.offsetZ)));
        cameraFolder.add(cameraConfig, 'offsetY', 0, 10, 0.1)
            .onChange((value) => this.thirdPersonCamera.setPosition(new THREE.Vector3(cameraConfig.offsetX, value, cameraConfig.offsetZ)));
        cameraFolder.add(cameraConfig, 'offsetZ', 0, 20, 0.1)
            .onChange((value) => this.thirdPersonCamera.setPosition(new THREE.Vector3(cameraConfig.offsetX, cameraConfig.offsetY, value)));
        cameraFolder.add(cameraConfig, 'smoothness', 0.01, 1, 0.01)
            .onChange((value) => this.thirdPersonCamera.setSmoothness(value));
        
        cameraFolder.open();

        // Physics settings
        const physicsFolder = carFolder.addFolder('Physics');
        const physicsConfig = {
            mass: this.car.mass,
            friction: this.car.friction,
            restitution: this.car.restitution
        };

        physicsFolder.add(physicsConfig, 'mass', 100, 2000, 100)
            .onChange((value) => this.car.mass = value);
        physicsFolder.add(physicsConfig, 'friction', 0, 1, 0.1)
            .onChange((value) => this.car.friction = value);
        physicsFolder.add(physicsConfig, 'restitution', 0, 1, 0.1)
            .onChange((value) => this.car.restitution = value);
        
        physicsFolder.open();
        settingsFolder.open();
        carFolder.open();
    }

    public animate() {
        const delta = this.clock.getDelta();
        
        // Update car
        this.car.update(delta);

        // Update physics
        this.physicsEngine.update(delta);

        // Update third person camera
        if (this.thirdPersonCamera) {
            this.thirdPersonCamera.update();
        }

        // Render
        this.renderer.render(this.scene);
    }

    public updateConfig(newConfig: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.environment.updateConfig(newConfig);
        this.renderer.updateConfig(newConfig);
        if (newConfig.car) {
            this.car.updateConfig(newConfig.car);
        }
    }
}