import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class TrackPhysics {
    private world: CANNON.World;
    private trackBodies: CANNON.Body[] = [];
    private trackMaterial: CANNON.Material;
    private meshToBody: Map<THREE.Mesh, CANNON.Body> = new Map();

    constructor(world: CANNON.World) {
        this.world = world;
        this.trackMaterial = new CANNON.Material('track');
        this.trackMaterial.friction = 1.0;
        this.trackMaterial.restitution = 0.0;
    }

    public createTrackBody(trackModel: THREE.Object3D): void {
        trackModel.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                
                if (geometry.attributes.position) {
                    const body = new CANNON.Body({
                        mass: 0,
                        material: this.trackMaterial,
                        type: CANNON.Body.STATIC,
                        collisionFilterGroup: 1,
                        collisionFilterMask: -1
                    });

                    const positions = geometry.attributes.position;
                    const vertices = new Float32Array(positions.array.length);
                    const indices = geometry.index ? Array.from(geometry.index.array) : [];

                    for (let i = 0; i < positions.count; i++) {
                        const vertex = new THREE.Vector3();
                        vertex.fromBufferAttribute(positions, i);
                        vertex.applyMatrix4(child.matrixWorld);
                        vertices[i * 3] = vertex.x;
                        vertices[i * 3 + 1] = vertex.y;
                        vertices[i * 3 + 2] = vertex.z;
                    }

                    const shape = new CANNON.Trimesh(
                        Array.from(vertices) as number[],
                        indices as number[]
                    );
                    shape.collisionResponse = true;
                    shape.collisionFilterGroup = 1;
                    shape.collisionFilterMask = -1;

                    body.addShape(shape);

                    this.world.addBody(body);
                    this.trackBodies.push(body);
                    this.meshToBody.set(child, body);
                }
            }
        });

        const carMaterial = this.world.bodies[1]?.material;
        if (carMaterial) {
            const trackCarContact = new CANNON.ContactMaterial(
                this.trackMaterial,
                carMaterial,
                {
                    friction: 1.0,
                    restitution: 0.0,
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 1,
                    frictionEquationStiffness: 1e8,
                    frictionEquationRelaxation: 1
                }
            );
            this.world.addContactMaterial(trackCarContact);
        }

        this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
        this.world.defaultContactMaterial.contactEquationRelaxation = 1;
    }

    public removeTrackBodies(): void {
        this.trackBodies.forEach(body => {
            this.world.removeBody(body);
        });
        this.trackBodies = [];
        this.meshToBody.clear();
    }

    public getTrackBodies(): CANNON.Body[] {
        return this.trackBodies;
    }
} 