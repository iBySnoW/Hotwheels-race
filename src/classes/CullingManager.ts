import * as THREE from 'three';

export interface CullingConfig {
    enabled: boolean;
    maxDistance: number;
}

export class CullingManager {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private config: CullingConfig;

    constructor(scene: THREE.Scene, camera: THREE.Camera, config: Partial<CullingConfig> = {}) {
        this.scene = scene;
        this.camera = camera;
        this.config = {
            enabled: true,
            maxDistance: 1000,
            ...config
        };
    }

    /**
     * Obtient la valeur de enabled
     */
    public isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Définit la valeur de enabled
     */
    public setEnabled(value: boolean): void {
        this.config.enabled = value;
        this.updateConfig({ enabled: value });
    }

    /**
     * Obtient la distance maximale
     */
    public getMaxDistance(): number {
        return this.config.maxDistance;
    }

    /**
     * Définit la distance maximale
     */
    public setMaxDistance(value: number): void {
        this.config.maxDistance = value;
        this.updateConfig({ maxDistance: value });
    }

    /**
     * Enregistre un objet pour le culling
     */
    public registerObject(object: THREE.Object3D): void {
        if (!object) return;
        
        // Activer le frustum culling natif de Three.js
        object.frustumCulled = this.config.enabled;
        
        // Définir la distance de visibilité
        if (object instanceof THREE.Mesh) {
            const geometry = object.geometry;
            if (geometry && !geometry.boundingSphere) {
                geometry.computeBoundingSphere();
            }
        }
    }

    /**
     * Met à jour la configuration
     */
    public updateConfig(config: Partial<CullingConfig>): void {
        this.config = { ...this.config, ...config };
        
        // Mettre à jour tous les objets de la scène
        this.scene.traverse((object) => {
            object.frustumCulled = this.config.enabled;
        });
    }

    /**
     * Met à jour le culling (appelé à chaque frame)
     */
    public update(): void {
        // Three.js gère automatiquement le frustum culling
        // Nous n'avons rien à faire ici
    }
} 