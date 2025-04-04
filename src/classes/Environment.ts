import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { Light } from "../Scene/light";
import { AmbientLight } from "../Scene/ambientLight";
import { SceneConfig } from "../interfaces/SceneConfig";
import { ThirdPersonCamera } from "./ThirdPersonCamera";

export class Environment {
    private scene: THREE.Scene;
    private ground!: THREE.Mesh;
    private groundBody!: CANNON.Body;
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
        // Créer le sol visuel
        const geometry = new THREE.PlaneGeometry(10000, 10000); // Sol très grand
        const material = new THREE.MeshStandardMaterial({
            color: this.config.environment.groundColor,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.position.y = 0; // Position à 0 pour être au même niveau que la voiture
        this.ground.rotateX(-Math.PI / 2); // Rotation corrigée pour être horizontal
        this.ground.receiveShadow = true;

        // Créer le sol physique
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({ mass: 0 });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.groundBody.position.set(0, 0, 0); // Position à 0 pour correspondre au sol visuel
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

    public getGroundBody(): CANNON.Body {
        return this.groundBody;
    }

    public updateConfig(newConfig: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...newConfig };
        // Recreate ground with new config
        this.scene.remove(this.ground);
        this.createGround();
        this.scene.add(this.ground);
    }
} 