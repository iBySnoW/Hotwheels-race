import * as THREE from 'three';

export interface LODConfig {
    levels: {
        distance: number;
        detail: number; // 0-1, où 1 est le plus détaillé
    }[];
    cullingDistance: number;
    cullingAngle: number;
}

export class LODManager {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private config: LODConfig;
    private lodObjects: Map<string, THREE.LOD> = new Map();
    private culledObjects: Set<string> = new Set();
    private frustum: THREE.Frustum = new THREE.Frustum();
    private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();

    constructor(scene: THREE.Scene, camera: THREE.Camera, config: LODConfig) {
        this.scene = scene;
        this.camera = camera;
        this.config = config;
    }

    /**
     * Crée un objet LOD à partir d'un mesh existant
     * @param mesh Le mesh original
     * @param id Identifiant unique pour l'objet
     */
    public createLODObject(mesh: THREE.Mesh, id: string): void {
        if (this.lodObjects.has(id)) {
            console.warn(`Un objet LOD avec l'ID ${id} existe déjà.`);
            return;
        }

        const lod = new THREE.LOD();
        const originalGeometry = mesh.geometry;
        const originalMaterial = mesh.material;

        // Créer les différents niveaux de détail
        this.config.levels.forEach((level, index) => {
            // Créer un nouveau mesh au lieu de cloner l'original
            const levelMesh = new THREE.Mesh();
            
            // Copier les propriétés importantes
            levelMesh.position.copy(mesh.position);
            levelMesh.rotation.copy(mesh.rotation);
            levelMesh.scale.copy(mesh.scale);
            levelMesh.matrix.copy(mesh.matrix);
            levelMesh.matrixAutoUpdate = mesh.matrixAutoUpdate;
            levelMesh.visible = mesh.visible;
            levelMesh.castShadow = mesh.castShadow;
            levelMesh.receiveShadow = mesh.receiveShadow;
            
            // Cloner la géométrie et le matériau
            levelMesh.geometry = originalGeometry.clone();
            if (Array.isArray(originalMaterial)) {
                levelMesh.material = originalMaterial.map(mat => mat.clone());
            } else {
                levelMesh.material = originalMaterial.clone();
            }
            
            // Simplifier la géométrie en fonction du niveau de détail
            if (level.detail < 1) {
                this.simplifyGeometry(levelMesh, level.detail);
            }
            
            // Ajouter le niveau au LOD
            lod.addLevel(levelMesh, level.distance);
        });

        // Remplacer le mesh original par le LOD
        if (mesh.parent) {
            mesh.parent.add(lod);
            mesh.parent.remove(mesh);
        } else {
            this.scene.add(lod);
        }

        this.lodObjects.set(id, lod);
    }

    /**
     * Simplifie une géométrie en fonction du niveau de détail
     * @param mesh Le mesh à simplifier
     * @param detail Niveau de détail (0-1)
     */
    private simplifyGeometry(mesh: THREE.Mesh, detail: number): void {
        const geometry = mesh.geometry;
        
        // Vérifier si la géométrie a déjà été simplifiée
        if (geometry.userData.simplified) {
            return;
        }
        
        // Pour les géométries avec des attributs de position
        if (geometry.attributes.position) {
            const positions = geometry.attributes.position.array;
            const vertexCount = positions.length / 3;
            
            // Ne pas simplifier si le nombre de sommets est déjà faible
            if (vertexCount < 100) {
                return;
            }
            
            // Calculer le nombre de sommets à conserver
            const targetVertexCount = Math.max(100, Math.floor(vertexCount * detail));
            
            if (targetVertexCount < vertexCount) {
                // Créer une nouvelle géométrie
                const newGeometry = new THREE.BufferGeometry();
                
                // Copier tous les attributs existants
                for (const key in geometry.attributes) {
                    const attribute = geometry.attributes[key];
                    const array = attribute.array;
                    const itemSize = attribute.itemSize;
                    
                    // Créer un nouveau buffer avec la taille réduite
                    const newArray = new Float32Array(targetVertexCount * itemSize);
                    
                    // Copier les données en préservant la structure
                    for (let i = 0; i < targetVertexCount * itemSize; i++) {
                        newArray[i] = array[i];
                    }
                    
                    newGeometry.setAttribute(key, new THREE.BufferAttribute(newArray, itemSize));
                }
                
                // Copier les index si présents
                if (geometry.index) {
                    const indices = geometry.index.array;
                    const newIndices = new Uint32Array(targetVertexCount);
                    for (let i = 0; i < targetVertexCount; i++) {
                        newIndices[i] = indices[i];
                    }
                    newGeometry.setIndex(new THREE.BufferAttribute(newIndices, 1));
                }
                
                // Marquer la géométrie comme simplifiée
                newGeometry.userData.simplified = true;
                
                // Mettre à jour la géométrie du mesh
                mesh.geometry = newGeometry;
            }
        }
    }

    /**
     * Met à jour les objets LOD en fonction de la position de la caméra
     */
    public update(): void {
        // Mettre à jour la matrice de projection
        this.camera.updateMatrixWorld();
        this.projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

        // Mettre à jour chaque objet LOD
        this.lodObjects.forEach((lod, id) => {
            // Vérifier si l'objet est dans le frustum
            const isVisible = this.isInFrustum(lod);
            
            if (isVisible) {
                // Si l'objet était cullé, le rendre visible
                if (this.culledObjects.has(id)) {
                    lod.visible = true;
                    this.culledObjects.delete(id);
                }
                
                // Mettre à jour le LOD
                lod.update(this.camera);
            } else {
                // Culler l'objet s'il est trop loin
                lod.visible = false;
                this.culledObjects.add(id);
            }
        });
    }

    /**
     * Vérifie si un objet est dans le frustum de la caméra
     * @param object L'objet à vérifier
     * @returns true si l'objet est visible
     */
    private isInFrustum(object: THREE.Object3D): boolean {
        // Calculer la distance à la caméra
        const distance = object.position.distanceTo(this.camera.position);
        
        // Vérifier si l'objet est trop loin
        if (distance > this.config.cullingDistance) {
            return false;
        }
        
        // Vérifier si l'objet est dans le frustum
        return this.frustum.intersectsObject(object);
    }

    /**
     * Supprime un objet LOD
     * @param id Identifiant de l'objet à supprimer
     */
    public removeLODObject(id: string): void {
        const lod = this.lodObjects.get(id);
        if (lod) {
            if (lod.parent) {
                lod.parent.remove(lod);
            }
            this.lodObjects.delete(id);
            this.culledObjects.delete(id);
        }
    }

    /**
     * Récupère les statistiques de LOD
     */
    public getStats(): { total: number, visible: number, culled: number } {
        return {
            total: this.lodObjects.size,
            visible: this.lodObjects.size - this.culledObjects.size,
            culled: this.culledObjects.size
        };
    }
} 