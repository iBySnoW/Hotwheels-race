import * as THREE from 'three';
import { estimateBytesUsed } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface MemoryConfig {
    enabled: boolean;
    geometryDisposal: boolean;
    textureDisposal: boolean;
    materialDisposal: boolean;
    disposeInterval: number; // en millisecondes
    maxTextureSize: number;
    textureCompression: boolean;
    frustumCullingDistance: number; // Nouvelle option
}

export class MemoryManager {
    private scene: THREE.Scene;
    private config: MemoryConfig;
    private disposedObjects: Set<string> = new Set();
    private lastDisposalTime: number = 0;
    private objectIds: Map<THREE.Object3D, string> = new Map();
    private textureCache: Map<string, THREE.Texture> = new Map();
    private materialCache: Map<string, THREE.Material> = new Map();
    private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
    private camera: THREE.Camera | null = null;

    constructor(scene: THREE.Scene, config: Partial<MemoryConfig> = {}) {
        this.scene = scene;
        this.config = {
            enabled: true,
            geometryDisposal: true,
            textureDisposal: true,
            materialDisposal: true,
            disposeInterval: 60000, // 1 minute par défaut
            maxTextureSize: 2048,
            textureCompression: true,
            frustumCullingDistance: 1000, // Distance par défaut pour le culling
            ...config
        };
    }

    public setCamera(camera: THREE.Camera): void {
        this.camera = camera;
    }

    /**
     * Enregistre un objet pour la gestion de la mémoire
     * @param object L'objet à enregistrer
     * @param id Identifiant unique pour l'objet
     */
    public registerObject(object: THREE.Object3D, id: string): void {
        this.objectIds.set(object, id);
        
        // Optimiser les textures si nécessaire
        if (this.config.textureCompression) {
            this.optimizeTextures(object);
        }
    }

    /**
     * Désenregistre un objet de la gestion de la mémoire
     * @param object L'objet à désenregistrer
     */
    public unregisterObject(object: THREE.Object3D): void {
        const id = this.objectIds.get(object);
        if (id) {
            this.objectIds.delete(object);
            this.disposedObjects.delete(id);
        }
    }

    /**
     * Met à jour la gestion de la mémoire
     * @param deltaTime Temps écoulé depuis la dernière mise à jour
     */
    public update(deltaTime: number): void {
        if (!this.config.enabled) return;

        const currentTime = performance.now();
        if (currentTime - this.lastDisposalTime < this.config.disposeInterval) {
            return;
        }
        this.lastDisposalTime = currentTime;

        // Nettoyer les ressources non utilisées
        this.cleanupUnusedResources();
    }

    /**
     * Nettoie les ressources non utilisées
     */
    private cleanupUnusedResources(): void {
        // Nettoyer les géométries non utilisées
        if (this.config.geometryDisposal) {
            this.disposeUnusedGeometries();
        }

        // Nettoyer les textures non utilisées
        if (this.config.textureDisposal) {
            this.disposeUnusedTextures();
        }

        // Nettoyer les matériaux non utilisés
        if (this.config.materialDisposal) {
            this.disposeUnusedMaterials();
        }
    }

    /**
     * Nettoie les géométries non utilisées
     */
    private disposeUnusedGeometries(): void {
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && this.shouldDisposeObject(object)) {
                const geometry = object.geometry;
                const id = this.objectIds.get(object);
                
                if (id && !this.geometryCache.has(id)) {
                    const memoryUsage = this.estimateGeometryMemory(geometry);
                    
                    // Ne stocker que si la géométrie utilise beaucoup de mémoire
                    if (memoryUsage > 1000000) { // Plus de 1MB
                        this.geometryCache.set(id, geometry);
                        object.geometry = new THREE.BufferGeometry(); // Géométrie minimale
                    }
                }
            }
        });
    }

    /**
     * Nettoie les textures non utilisées
     */
    private disposeUnusedTextures(): void {
        // Parcourir tous les matériaux dans la scène
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const material = object.material;
                const id = this.objectIds.get(object);
                
                // Si l'objet est cullé ou trop loin, libérer ses textures
                if (id && this.disposedObjects.has(id)) {
                    if (material instanceof THREE.Material) {
                        this.disposeMaterialTextures(material, id);
                    } else if (Array.isArray(material)) {
                        material.forEach((mat, index) => {
                            this.disposeMaterialTextures(mat, `${id}_${index}`);
                        });
                    }
                }
            }
        });
    }

    /**
     * Nettoie les textures d'un matériau
     * @param material Le matériau à nettoyer
     * @param id Identifiant de l'objet
     */
    private disposeMaterialTextures(material: THREE.Material, id: string): void {
        // Vérifier si le matériau est un MeshStandardMaterial ou MeshBasicMaterial
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
            if (material.map) {
                // Stocker la texture dans le cache
                if (!this.textureCache.has(`${id}_map`)) {
                    this.textureCache.set(`${id}_map`, material.map);
                }
                
                // Remplacer par une texture vide
                material.map = null;
            }
            
            // Vérifier si le matériau est un MeshStandardMaterial pour les propriétés spécifiques
            if (material instanceof THREE.MeshStandardMaterial) {
                if (material.normalMap) {
                    if (!this.textureCache.has(`${id}_normalMap`)) {
                        this.textureCache.set(`${id}_normalMap`, material.normalMap);
                    }
                    material.normalMap = null;
                }
                
                if (material.roughnessMap) {
                    if (!this.textureCache.has(`${id}_roughnessMap`)) {
                        this.textureCache.set(`${id}_roughnessMap`, material.roughnessMap);
                    }
                    material.roughnessMap = null;
                }
                
                if (material.metalnessMap) {
                    if (!this.textureCache.has(`${id}_metalnessMap`)) {
                        this.textureCache.set(`${id}_metalnessMap`, material.metalnessMap);
                    }
                    material.metalnessMap = null;
                }
                
                if (material.aoMap) {
                    if (!this.textureCache.has(`${id}_aoMap`)) {
                        this.textureCache.set(`${id}_aoMap`, material.aoMap);
                    }
                    material.aoMap = null;
                }
                
                if (material.envMap) {
                    if (!this.textureCache.has(`${id}_envMap`)) {
                        this.textureCache.set(`${id}_envMap`, material.envMap);
                    }
                    material.envMap = null;
                }
            }
        }
        
        material.needsUpdate = true;
    }

    /**
     * Nettoie les matériaux non utilisés
     */
    private disposeUnusedMaterials(): void {
        // Parcourir tous les objets dans la scène
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const material = object.material;
                const id = this.objectIds.get(object);
                
                // Si l'objet est cullé ou trop loin, libérer son matériau
                if (id && this.disposedObjects.has(id)) {
                    if (material instanceof THREE.Material) {
                        // Stocker le matériau dans le cache
                        if (!this.materialCache.has(id)) {
                            this.materialCache.set(id, material);
                        }
                        
                        // Remplacer par un matériau simple
                        object.material = new THREE.MeshBasicMaterial({ color: 0x808080 });
                    } else if (Array.isArray(material)) {
                        material.forEach((mat, index) => {
                            if (!this.materialCache.has(`${id}_${index}`)) {
                                this.materialCache.set(`${id}_${index}`, mat);
                            }
                            material[index] = new THREE.MeshBasicMaterial({ color: 0x808080 });
                        });
                    }
                }
            }
        });
    }

    /**
     * Optimise les textures d'un objet
     * @param object L'objet à optimiser
     */
    private optimizeTextures(object: THREE.Object3D): void {
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = child.material;
                
                if (material instanceof THREE.Material) {
                    this.optimizeMaterialTextures(material);
                } else if (Array.isArray(material)) {
                    material.forEach((mat) => {
                        this.optimizeMaterialTextures(mat);
                    });
                }
            }
        });
    }

    /**
     * Optimise les textures d'un matériau
     * @param material Le matériau à optimiser
     */
    private optimizeMaterialTextures(material: THREE.Material): void {
        // Vérifier si le matériau est un MeshStandardMaterial ou MeshBasicMaterial
        if (material instanceof THREE.MeshStandardMaterial || 
            material instanceof THREE.MeshBasicMaterial) {
            
            if (material.map) {
                const memoryUsage = this.estimateTextureMemory(material.map);
                
                if (memoryUsage > 1000000) { // Plus de 1MB
                    const resizedTexture = this.resizeTexture(material.map);
                    if (resizedTexture) {
                        material.map.dispose();
                        material.map = resizedTexture;
                    }
                }
            }
            
            // Appliquer la même logique pour les autres textures
            if (material instanceof THREE.MeshStandardMaterial) {
                const textureMaps = [
                    'normalMap', 'roughnessMap', 'metalnessMap',
                    'aoMap', 'envMap'
                ] as const;
                
                for (const mapName of textureMaps) {
                    const texture = material[mapName];
                    if (texture) {
                        const memoryUsage = this.estimateTextureMemory(texture);
                        if (memoryUsage > 1000000) {
                            const resizedTexture = this.resizeTexture(texture);
                            if (resizedTexture) {
                                texture.dispose();
                                material[mapName] = resizedTexture;
                            }
                        }
                    }
                }
            }
        }
        
        material.needsUpdate = true;
    }

    private resizeTexture(texture: THREE.Texture): THREE.Texture | null {
        if (!texture.image) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const { width, height } = texture.image;
        const maxSize = this.config.maxTextureSize;
        
        let newWidth = width;
        let newHeight = height;
        
        if (width > maxSize || height > maxSize) {
            const ratio = width / height;
            if (ratio > 1) {
                newWidth = maxSize;
                newHeight = Math.round(maxSize / ratio);
            } else {
                newHeight = maxSize;
                newWidth = Math.round(maxSize * ratio);
            }
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Utiliser une méthode de redimensionnement de meilleure qualité
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(texture.image, 0, 0, newWidth, newHeight);

        const newTexture = new THREE.Texture(canvas);
        newTexture.needsUpdate = true;
        // Utiliser colorSpace au lieu de encoding (déprécié)
        newTexture.colorSpace = texture.colorSpace;
        newTexture.wrapS = texture.wrapS;
        newTexture.wrapT = texture.wrapT;
        
        return newTexture;
    }

    /**
     * Marque un objet comme disposé
     * @param id Identifiant de l'objet
     */
    public markAsDisposed(id: string): void {
        this.disposedObjects.add(id);
    }

    /**
     * Marque un objet comme non disposé
     * @param id Identifiant de l'objet
     */
    public markAsNotDisposed(id: string): void {
        this.disposedObjects.delete(id);
        
        // Restaurer les ressources si nécessaire
        this.restoreObjectResources(id);
    }

    /**
     * Restaure les ressources d'un objet
     * @param id Identifiant de l'objet
     */
    private restoreObjectResources(id: string): void {
        // Trouver l'objet
        let targetObject: THREE.Object3D | null = null;
        this.objectIds.forEach((objectId, object) => {
            if (objectId === id) {
                targetObject = object;
            }
        });
        
        if (!targetObject) return;
        
        // Restaurer la géométrie
        if (this.geometryCache.has(id)) {
            const geometry = this.geometryCache.get(id);
            if (geometry) {
                // Utiliser une approche plus sûre pour accéder à l'objet
                this.scene.traverse((obj) => {
                    if (obj === targetObject && obj instanceof THREE.Mesh) {
                        obj.geometry = geometry;
                        this.geometryCache.delete(id);
                    }
                });
            }
        }
        
        // Restaurer les matériaux
        if (targetObject) {
            // Utiliser une approche plus sûre pour accéder à l'objet
            this.scene.traverse((obj) => {
                if (obj === targetObject && obj instanceof THREE.Mesh) {
                    const material = obj.material;
                    
                    if (material instanceof THREE.Material) {
                        this.restoreMaterialResources(material, id);
                    } else if (Array.isArray(material)) {
                        material.forEach((mat, index) => {
                            this.restoreMaterialResources(mat, `${id}_${index}`);
                        });
                    }
                }
            });
        }
    }

    /**
     * Restaure les ressources d'un matériau
     * @param material Le matériau à restaurer
     * @param id Identifiant de l'objet
     */
    private restoreMaterialResources(material: THREE.Material, id: string): void {
        // Vérifier si le matériau est un MeshStandardMaterial ou MeshBasicMaterial
        if (material instanceof THREE.MeshStandardMaterial || 
            material instanceof THREE.MeshBasicMaterial) {
            
            // Restaurer les textures
            if (this.textureCache.has(`${id}_map`)) {
                material.map = this.textureCache.get(`${id}_map`) || null;
                this.textureCache.delete(`${id}_map`);
            }
            
            if (material instanceof THREE.MeshStandardMaterial) {
                if (this.textureCache.has(`${id}_normalMap`)) {
                    material.normalMap = this.textureCache.get(`${id}_normalMap`) || null;
                    this.textureCache.delete(`${id}_normalMap`);
                }
                
                if (this.textureCache.has(`${id}_roughnessMap`)) {
                    material.roughnessMap = this.textureCache.get(`${id}_roughnessMap`) || null;
                    this.textureCache.delete(`${id}_roughnessMap`);
                }
                
                if (this.textureCache.has(`${id}_metalnessMap`)) {
                    material.metalnessMap = this.textureCache.get(`${id}_metalnessMap`) || null;
                    this.textureCache.delete(`${id}_metalnessMap`);
                }
                
                if (this.textureCache.has(`${id}_aoMap`)) {
                    material.aoMap = this.textureCache.get(`${id}_aoMap`) || null;
                    this.textureCache.delete(`${id}_aoMap`);
                }
                
                if (this.textureCache.has(`${id}_envMap`)) {
                    material.envMap = this.textureCache.get(`${id}_envMap`) || null;
                    this.textureCache.delete(`${id}_envMap`);
                }
            }
        }
        
        // Restaurer le matériau complet si nécessaire
        if (this.materialCache.has(id)) {
            const originalMaterial = this.materialCache.get(id);
            if (originalMaterial) {
                Object.assign(material, originalMaterial);
                this.materialCache.delete(id);
            }
        }
        
        material.needsUpdate = true;
    }

    /**
     * Met à jour la configuration de la gestion de la mémoire
     * @param config Nouvelle configuration
     */
    public updateConfig(config: Partial<MemoryConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Récupère les statistiques de mémoire
     */
    public getStats(): { 
        totalObjects: number, 
        disposedObjects: number, 
        textureCacheSize: number, 
        geometryCacheSize: number, 
        materialCacheSize: number 
    } {
        return {
            totalObjects: this.objectIds.size,
            disposedObjects: this.disposedObjects.size,
            textureCacheSize: this.textureCache.size,
            geometryCacheSize: this.geometryCache.size,
            materialCacheSize: this.materialCache.size
        };
    }

    private estimateGeometryMemory(geometry: THREE.BufferGeometry): number {
        return estimateBytesUsed(geometry);
    }

    private estimateTextureMemory(texture: THREE.Texture): number {
        if (!texture.image) return 0;
        const width = texture.image.width || 0;
        const height = texture.image.height || 0;
        return width * height * 4 * 1.33; // Estimation basée sur la formule de Three.js
    }

    private shouldDisposeObject(object: THREE.Object3D): boolean {
        if (!this.camera) return false;

        // Vérifier si l'objet est dans le frustum
        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        
        projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(projScreenMatrix);

        // Obtenir la boîte englobante de l'objet
        const bbox = new THREE.Box3();
        bbox.setFromObject(object);
        
        // Vérifier si l'objet est visible et à quelle distance
        if (!frustum.intersectsBox(bbox)) return true;
        
        const distance = this.camera.position.distanceTo(object.position);
        return distance > this.config.frustumCullingDistance;
    }

    public getMemoryStats(): {
        geometryMemory: number;
        textureMemory: number;
        totalObjects: number;
        disposedObjects: number;
    } {
        let geometryMemory = 0;
        let textureMemory = 0;

        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                geometryMemory += this.estimateGeometryMemory(object.geometry);
                
                const material = object.material;
                if (material instanceof THREE.MeshStandardMaterial || 
                    material instanceof THREE.MeshBasicMaterial) {
                    if (material.map) {
                        textureMemory += this.estimateTextureMemory(material.map);
                    }
                }
            }
        });

        return {
            geometryMemory,
            textureMemory,
            totalObjects: this.objectIds.size,
            disposedObjects: this.disposedObjects.size
        };
    }
} 