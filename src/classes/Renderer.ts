import * as THREE from "three";
import { SceneConfig } from "../interfaces/SceneConfig";
import { ThirdPersonCamera } from "./ThirdPersonCamera";

export class Renderer {
    private renderer: THREE.WebGLRenderer;
    private camera: ThirdPersonCamera;
    private config: SceneConfig;
    private animationCallback: () => void;

    constructor(camera: ThirdPersonCamera, config: SceneConfig, animationCallback: () => void) {
        this.camera = camera;
        this.config = config;
        this.animationCallback = animationCallback;
        this.renderer = this.createRenderer();
        this.setupEventListeners();
    }

    private createRenderer(): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: this.config.renderer.antialias,
            canvas: document.querySelector('canvas') as HTMLCanvasElement,
            alpha: true,
            powerPreference: "high-performance"
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.renderer.pixelRatio));
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
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

    public getDomElement(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    public setSize(width: number, height: number): void {
        this.renderer.setSize(width, height);
    }
} 