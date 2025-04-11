import * as THREE from "three";
import { Light } from "../Scene/light";
import { AmbientLight } from "../Scene/ambientLight";
import { SceneConfig } from "../interfaces/SceneConfig";
import { ThirdPersonCamera } from "./ThirdPersonCamera";

export class Environment {
    private scene: THREE.Scene;
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
        this.setupLights();
        this.addToScene();
    }

    private setupLights(): void {
        this.light.getLight().castShadow = true;
        this.light.getLight().shadow!.mapSize.width = 2048;
        this.light.getLight().shadow!.mapSize.height = 2048;
    }

    private addToScene(): void {
        this.scene.add(this.camera.getCamera());
        this.scene.add(this.light.getLight());
        this.scene.add(this.ambientLight.getLight());
    }

    public updateConfig(newConfig: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
} 