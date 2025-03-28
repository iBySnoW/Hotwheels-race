import * as THREE from 'three';
import { PhysicsObject } from '../interfaces/Physics';

export class PhysicsEngine {
    private objects: PhysicsObject[] = [];
    private debugMode: boolean = false;
    private debugHelpers: THREE.Box3Helper[] = [];
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public addObject(object: PhysicsObject): void {
        this.objects.push(object);
        if (this.debugMode) {
            const helper = new THREE.Box3Helper(object.boundingBox, new THREE.Color(1, 0, 0));
            this.debugHelpers.push(helper);
            this.scene.add(helper);
        }
    }

    public removeObject(object: PhysicsObject): void {
        const index = this.objects.indexOf(object);
        if (index !== -1) {
            this.objects.splice(index, 1);
            if (this.debugMode && this.debugHelpers[index]) {
                this.scene.remove(this.debugHelpers[index]);
                this.debugHelpers.splice(index, 1);
            }
        }
    }

    public update(deltaTime: number): void {
        // Mettre à jour les boîtes de collision
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];
            obj.setColliding(false);
        }

        // Détecter et résoudre les collisions
        for (let i = 0; i < this.objects.length; i++) {
            for (let j = i + 1; j < this.objects.length; j++) {
                const objA = this.objects[i];
                const objB = this.objects[j];

                const collision = this.checkCollision(objA, objB);
                if (collision) {
                    objA.setColliding(true);
                    objB.setColliding(true);
                    this.resolveCollision(objA, objB, collision);
                }
            }
        }

        // Mettre à jour les helpers de debug
        if (this.debugMode) {
            this.debugHelpers.forEach((helper, index) => {
                if (this.objects[index]) {
                    helper.box = this.objects[index].boundingBox;
                }
            });
        }
    }

    private checkCollision(objA: PhysicsObject, objB: PhysicsObject): { 
        normal: THREE.Vector3, 
        penetration: number 
    } | null {
        if (!objA.boundingBox.intersectsBox(objB.boundingBox)) {
            return null;
        }

        // Calculer le vecteur normal et la pénétration
        const centerA = new THREE.Vector3();
        const centerB = new THREE.Vector3();
        objA.boundingBox.getCenter(centerA);
        objB.boundingBox.getCenter(centerB);

        const normal = centerB.clone().sub(centerA).normalize();
        
        // Calculer la pénétration
        const sizeA = new THREE.Vector3();
        const sizeB = new THREE.Vector3();
        objA.boundingBox.getSize(sizeA);
        objB.boundingBox.getSize(sizeB);
        
        const halfExtentA = sizeA.multiplyScalar(0.5);
        const halfExtentB = sizeB.multiplyScalar(0.5);
        
        const distance = centerB.clone().sub(centerA).length();
        const minDistance = halfExtentA.length() + halfExtentB.length();
        
        const penetration = minDistance - distance;

        return {
            normal,
            penetration
        };
    }

    private resolveCollision(objA: PhysicsObject, objB: PhysicsObject, collision: { 
        normal: THREE.Vector3, 
        penetration: number 
    }): void {
        const restitution = Math.min(objA.restitution, objB.restitution);
        const relativeVelocity = objB.velocity.clone().sub(objA.velocity);
        
        // Calculer l'impulsion
        const velocityAlongNormal = relativeVelocity.dot(collision.normal);
        
        // Si les objets s'éloignent déjà, ne pas appliquer d'impulsion
        if (velocityAlongNormal > 0) {
            return;
        }
        
        const j = -(1 + restitution) * velocityAlongNormal;
        const impulse = collision.normal.clone().multiplyScalar(j);
        
        // Appliquer l'impulsion inversement proportionnelle à la masse
        const massSum = objA.mass + objB.mass;
        const ratioA = objB.mass / massSum;
        const ratioB = objA.mass / massSum;
        
        objA.velocity.sub(impulse.clone().multiplyScalar(ratioA));
        objB.velocity.add(impulse.clone().multiplyScalar(ratioB));
        
        // Corriger la position pour éviter le chevauchement
        const correction = collision.normal.clone().multiplyScalar(collision.penetration * 0.5);
        objA.position.sub(correction.clone().multiplyScalar(ratioA));
        objB.position.add(correction.clone().multiplyScalar(ratioB));
    }

    public setDebugMode(enabled: boolean): void {
        if (enabled === this.debugMode) return;
        
        this.debugMode = enabled;
        
        if (enabled) {
            // Créer les helpers pour tous les objets
            this.objects.forEach(obj => {
                const helper = new THREE.Box3Helper(obj.boundingBox, new THREE.Color(1, 0, 0));
                this.debugHelpers.push(helper);
                this.scene.add(helper);
            });
        } else {
            // Supprimer tous les helpers
            this.debugHelpers.forEach(helper => {
                this.scene.remove(helper);
            });
            this.debugHelpers = [];
        }
    }
} 