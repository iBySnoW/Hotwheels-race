import * as THREE from "three";
import { Light } from "../Scene/light";
import { AmbientLight } from "../Scene/ambientLight";
import { SceneConfig } from "../interfaces/SceneConfig";
import { ThirdPersonCamera } from "./ThirdPersonCamera";
export class Environment {
    private scene: THREE.Scene;
    private ground!: THREE.Mesh;
    private camera: ThirdPersonCamera;
    private light: Light;
    private ambientLight: AmbientLight;
    private config: SceneConfig;

    constructor(scene: THREE.Scene, camera: ThirdPersonCamera, config: SceneConfig) {
        this.scene = scene;
        this.camera = camera;
        this.config = config;
        this.light = new Light();
        this.ambientLight = new AmbientLight();
        this.setupEnvironment();
    }

    private setupEnvironment(): void {
        this.createGround();
        this.setupLights();
        this.addToScene();
    }

    private createGround(): void {
        const geometry = new THREE.PlaneGeometry(
            this.config.environment.groundSize,
            this.config.environment.groundSize
        );
        const material = new THREE.MeshStandardMaterial({
            color: this.config.environment.groundColor,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.position.y = this.config.environment.groundY;
        this.ground.rotateX(Math.PI / 2);
        this.ground.receiveShadow = true;
    }

    private setupLights(): void {
        this.light.getLight().castShadow = true;
        this.light.getLight().shadow!.mapSize.width = 2048;
        this.light.getLight().shadow!.mapSize.height = 2048;
    }

    private addToScene(): void {
        this.scene.add(this.ground);
        this.scene.add(this.camera.getCamera());
        this.scene.add(this.light.getLight());
        this.scene.add(this.ambientLight.getLight());
    }

    public getGround(): THREE.Mesh {
        return this.ground;
    }

    public updateConfig(newConfig: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...newConfig };
        // Recreate ground with new config
        this.scene.remove(this.ground);
        this.createGround();
        this.scene.add(this.ground);
    }
} 