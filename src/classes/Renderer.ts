import * as THREE from "three";
import { Camera } from "../Scene/camera";
import { SceneConfig } from "../interfaces/SceneConfig";

export class Renderer {
    private renderer: THREE.WebGLRenderer;
    private camera: Camera;
    private config: SceneConfig;
    private animationCallback: () => void;

    constructor(camera: Camera, config: SceneConfig, animationCallback: () => void) {
        this.camera = camera;
        this.config = config;
        this.animationCallback = animationCallback;
        this.renderer = this.createRenderer();
        this.setupEventListeners();
    }

    private createRenderer(): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: this.config.renderer.antialias,
            canvas: document.querySelector('canvas') as HTMLCanvasElement
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.renderer.pixelRatio));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = this.config.renderer.shadowMap;
        renderer.setAnimationLoop(this.animationCallback);

        return renderer;
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private onWindowResize(): void {
        const camera = this.camera.getCamera();
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public render(scene: THREE.Scene): void {
        this.renderer.render(scene, this.camera.getCamera());
    }

    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    public updateConfig(newConfig: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.renderer.pixelRatio));
        this.renderer.shadowMap.enabled = this.config.renderer.shadowMap;
    }
} 