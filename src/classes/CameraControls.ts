import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Camera } from "../Scene/camera";
import { Renderer } from "./Renderer";
import { SceneConfig } from "../interfaces/SceneConfig";

export class CameraControls {
    private controls: OrbitControls;
    private config: SceneConfig;

    constructor(camera: Camera, renderer: Renderer, config: SceneConfig) {
        this.config = config;
        this.controls = this.createControls(camera, renderer);
    }

    private createControls(camera: Camera, renderer: Renderer): OrbitControls {
        const controls = new OrbitControls(camera.getCamera(), renderer.getRenderer().domElement);
        
        // Configuration des contrôles
        controls.enableDamping = this.config.controls.enableDamping;
        controls.dampingFactor = this.config.controls.dampingFactor;
        controls.screenSpacePanning = false;
        controls.minDistance = this.config.controls.minDistance;
        controls.maxDistance = this.config.controls.maxDistance;
        controls.maxPolarAngle = Math.PI / 2;
        controls.rotateSpeed = this.config.controls.rotateSpeed;
        controls.zoomSpeed = this.config.controls.zoomSpeed;
        
        // Activer les contrôles
        controls.enabled = true;
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.enablePan = true;
        
        // Met à jour les contrôles immédiatement
        controls.update();

        return controls;
    }

    public update(): void {
        this.controls.update();
    }

    public getControls(): OrbitControls {
        return this.controls;
    }

    public updateConfig(newConfig: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Mise à jour des paramètres des contrôles
        this.controls.enableDamping = this.config.controls.enableDamping;
        this.controls.dampingFactor = this.config.controls.dampingFactor;
        this.controls.minDistance = this.config.controls.minDistance;
        this.controls.maxDistance = this.config.controls.maxDistance;
        this.controls.rotateSpeed = this.config.controls.rotateSpeed;
        this.controls.zoomSpeed = this.config.controls.zoomSpeed;
    }
} 