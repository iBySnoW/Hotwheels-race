import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Car } from './Car';

export class PhysicsWorld {
    private world: CANNON.World;
    private groundBody: CANNON.Body;
    private bodies: Map<THREE.Object3D, CANNON.Body> = new Map();
    private groundMaterial: CANNON.Material;
    private carMaterial: CANNON.Material;
    private readonly fixedTimeStep: number = 1/60;
    private readonly maxSubSteps: number = 10;
    private readonly positionSmoothingFactor: number = 0.8; // Facteur de lissage pour les positions

    constructor() {
        // Créer le monde physique avec une gravité réaliste
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });

        // Créer les matériaux
        this.groundMaterial = new CANNON.Material('ground');
        this.carMaterial = new CANNON.Material('car');

        // Configurer les propriétés des matériaux
        this.groundMaterial.friction = 0.8;    // Friction élevée pour le sol
        this.groundMaterial.restitution = 0.1; // Faible restitution pour éviter les rebonds
        this.carMaterial.friction = 0.6;       // Augmenté pour une meilleure adhérence
        this.carMaterial.restitution = 0.3;    // Augmenté pour des collisions plus réalistes

        // Créer le contact material entre le sol et la voiture
        const contactMaterial = new CANNON.ContactMaterial(
            this.groundMaterial,
            this.carMaterial,
            {
                friction: 0.6,
                restitution: 0.3,
                contactEquationStiffness: 1e7,    // Réduit pour des collisions plus douces
                contactEquationRelaxation: 3,     // Augmenté pour une meilleure stabilité
                frictionEquationStiffness: 1e7,   // Réduit pour des collisions plus douces
                frictionEquationRelaxation: 3     // Augmenté pour une meilleure stabilité
            }
        );
        this.world.addContactMaterial(contactMaterial);

        // Créer le sol
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({ mass: 0 });
        this.groundBody.addShape(groundShape);
        this.groundBody.material = this.groundMaterial;
        // Rotation du sol pour qu'il soit horizontal
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(this.groundBody);
    }

    public addObject(object: THREE.Object3D, mass: number = 1): void {
        // Créer la forme de collision
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Créer le corps physique
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({ mass });
        body.addShape(shape);
        body.material = this.carMaterial;

        // Définir la position initiale
        const position = object.position;
        body.position.set(position.x, position.y, position.z);

        // Ajouter au monde physique
        this.world.addBody(body);
        this.bodies.set(object, body);
    }

    public addCar(car: Car): void {
        const body = car.getBody();
        const model = car.getModel();
        if (body && model) {
            body.material = this.carMaterial;
            car.addToWorld(this.world);
            this.bodies.set(model, body);
        }
    }

    public addGround(groundBody: CANNON.Body): void {
        // Appliquer le matériau du sol
        groundBody.material = this.groundMaterial;
        this.world.addBody(groundBody);
    }

    public removeObject(object: THREE.Object3D): void {
        const body = this.bodies.get(object);
        if (body) {
            // Si c'est une voiture, retirer aussi les roues
            if (object instanceof Car) {
                const car = object as unknown as Car;
                const wheelBodies = car.getWheelBodies();
                wheelBodies.forEach((wheelBody: CANNON.Body) => {
                    this.world.removeBody(wheelBody);
                });
            }
            this.world.removeBody(body);
            this.bodies.delete(object);
        }
    }

    public update(deltaTime: number): void {
        // Utilisation correcte de step avec deltaTime et maxSubSteps
        this.world.step(this.fixedTimeStep, deltaTime, this.maxSubSteps);

        // Mise à jour des positions des objets avec lissage
        this.bodies.forEach((body, object) => {
            // Calculer la nouvelle position
            const newPosition = new THREE.Vector3(
                body.position.x,
                body.position.y,
                body.position.z
            );
            
            // Appliquer un lissage à la position
            object.position.lerp(newPosition, this.positionSmoothingFactor);
            
            // Mise à jour de la rotation avec lissage
            const newQuaternion = new THREE.Quaternion(
                body.quaternion.x,
                body.quaternion.y,
                body.quaternion.z,
                body.quaternion.w
            );
            
            // Appliquer un lissage à la rotation
            object.quaternion.slerp(newQuaternion, this.positionSmoothingFactor);
        });
    }

    public setGravity(x: number, y: number, z: number): void {
        this.world.gravity.set(x, y, z);
    }

    public getWorld(): CANNON.World {
        return this.world;
    }

    public getBodies(): Map<THREE.Object3D, CANNON.Body> {
        return this.bodies;
    }
} 