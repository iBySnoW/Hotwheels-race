import * as THREE from "three";
import { SceneConfig } from "../interfaces/SceneConfig";
import { ThirdPersonCamera } from "./ThirdPersonCamera";

export class Renderer {
    private renderer: THREE.WebGLRenderer;
    private camera: ThirdPersonCamera;
    private config: SceneConfig;

    constructor(camera: ThirdPersonCamera, config: SceneConfig) {
        this.camera = camera;
        this.config = config;
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            precision: 'highp',
            stencil: false,
            depth: true,
            logarithmicDepthBuffer: true,
        });
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.renderer.info.autoReset = false;
        
        document.body.appendChild(this.renderer.domElement);
    }

    public render(scene: THREE.Scene): void {
        this.renderer.render(scene, this.camera.getCamera());
    }

    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    public setSize(width: number, height: number): void {
        this.renderer.setSize(width, height);
    }

    public updateConfig(config: Partial<SceneConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public dispose(): void {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.renderer.info.reset();
    }
} 