import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld';
import CannonDebugRenderer from 'cannon-es-debugger';

export class PhysicsDebugger {
    private scene: THREE.Scene;
    private physicsWorld: CANNON.World;
    private debugMeshes: THREE.Mesh[] = [];
    private enabled: boolean = true;
    private axesHelper: THREE.AxesHelper;

    constructor(scene: THREE.Scene, world: PhysicsWorld) {
        this.scene = scene;
        this.physicsWorld = world.getWorld();
        
        // Ajouter les axes de coordonnées
        this.axesHelper = new THREE.AxesHelper(5); // La taille des axes (5 unités)
        this.axesHelper.position.set(0, 0.01, 0); // Légèrement au-dessus du sol
        this.scene.add(this.axesHelper);
    }

    public update(): void {
        if (!this.enabled) return;

        let meshIndex = 0;

        // Parcourir tous les corps du monde physique
        this.physicsWorld.bodies.forEach((body) => {
            // Vérifier si le corps a un véhicule raycast attaché
            const raycastVehicle = (body as any).vehicle as CANNON.RaycastVehicle;
            
            if (raycastVehicle) {
                // Débugger les roues du véhicule
                raycastVehicle.wheelInfos.forEach((wheelInfo: any) => {
                    let mesh = this.debugMeshes[meshIndex];

                    // Créer un nouveau maillage de debug pour la roue si nécessaire
                    if (!mesh) {
                        const radius = wheelInfo.radius;
                        const geometry = new THREE.SphereGeometry(radius);
                        const material = new THREE.MeshBasicMaterial({
                            color: 0x00ff00,
                            wireframe: true,
                            transparent: true,
                            opacity: 0.5
                        });
                        mesh = new THREE.Mesh(geometry, material);
                        this.debugMeshes[meshIndex] = mesh;
                        this.scene.add(mesh);
                    }

                    // Mettre à jour la position et la rotation de la roue
                    if (mesh) {
                        const transform = wheelInfo.worldTransform;
                        mesh.position.copy(transform.position);
                        mesh.quaternion.copy(transform.quaternion);
                    }

                    meshIndex++;
                });
            }

            // Débugger les formes du corps
            body.shapes.forEach((shape) => {
                let mesh: THREE.Mesh | null = this.debugMeshes[meshIndex];

                if (!mesh) {
                    mesh = this.createDebugMesh(shape);
                    if (mesh) {
                        this.debugMeshes[meshIndex] = mesh;
                        this.scene.add(mesh);
                    }
                }

                if (mesh) {
                    mesh.position.copy(body.position as any);
                    mesh.quaternion.copy(body.quaternion as any);

                    const material = mesh.material as THREE.MeshBasicMaterial;
                    material.color.setHex(0xff0000); // Rouge pour le châssis
                }

                meshIndex++;
            });
        });

        // Supprimer les maillages de debug en excès
        while (this.debugMeshes.length > meshIndex) {
            const mesh = this.debugMeshes.pop();
            if (mesh) {
                this.scene.remove(mesh);
            }
        }
    }

    private createDebugMesh(shape: CANNON.Shape): THREE.Mesh | null {
        let geometry: THREE.BufferGeometry;
        let material = new THREE.MeshBasicMaterial({
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });

        // Créer la géométrie appropriée selon le type de forme
        switch (shape.type) {
            case CANNON.Shape.types.SPHERE:
                const sphereShape = shape as CANNON.Sphere;
                geometry = new THREE.SphereGeometry(sphereShape.radius);
                break;

            case CANNON.Shape.types.BOX:
                const boxShape = shape as CANNON.Box;
                geometry = new THREE.BoxGeometry(
                    boxShape.halfExtents.x * 2,
                    boxShape.halfExtents.y * 2,
                    boxShape.halfExtents.z * 2
                );
                break;

            case CANNON.Shape.types.PLANE:
                geometry = new THREE.PlaneGeometry(10, 10);
                break;

            default:
                return null;
        }

        return new THREE.Mesh(geometry, material);
    }

    public toggle(): void {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.debugMeshes.forEach((mesh) => {
                this.scene.remove(mesh);
            });
            this.debugMeshes = [];
        }
        this.axesHelper.visible = this.enabled;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.debugMeshes.forEach((mesh) => {
                this.scene.remove(mesh);
            });
            this.debugMeshes = [];
        }
        this.axesHelper.visible = enabled;
    }
} 