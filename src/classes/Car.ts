import { AnimatedModel } from "./AnimatedModel";
import { CarConfig, DEFAULT_CAR_CONFIG } from "../interfaces/CarConfig";
import { CarControls } from "./CarControls";
import { PhysicsObject, DEFAULT_PHYSICS_CONFIG } from "../interfaces/Physics";
import * as THREE from "three";

export class Car extends AnimatedModel implements PhysicsObject {
    private speed: number = 0;
    private config: CarConfig;
    private controls: CarControls;
    private currentRotation: number = 0;
    private collisionSize: THREE.Vector3 = new THREE.Vector3();
    
    // Propriétés physiques
    public velocity: THREE.Vector3 = new THREE.Vector3();
    public position: THREE.Vector3 = new THREE.Vector3(-6, 0, 0);
    public boundingBox: THREE.Box3 = new THREE.Box3();
    public mass: number = DEFAULT_PHYSICS_CONFIG.mass;
    public friction: number = DEFAULT_PHYSICS_CONFIG.friction;
    public restitution: number = DEFAULT_PHYSICS_CONFIG.restitution;
    private isColliding: boolean = false;

    constructor(modelPath: string, config: Partial<CarConfig> = {}, onLoad?: (model: THREE.Group) => void) {
        super(modelPath, (model) => {
            if (model) {
                model.position.set(-6, 0, 0);
                
                // Créer et configurer la boîte de collision initiale
                const tempBox = new THREE.Box3().setFromObject(model);
                tempBox.getSize(this.collisionSize);
                // Réduire légèrement la taille pour une meilleure collision
                this.collisionSize.multiplyScalar(0.9);
                
                // Position initiale
                this.position.copy(model.position);
                
                // Créer la boîte de collision à la bonne position et taille
                this.boundingBox.setFromCenterAndSize(this.position, this.collisionSize);
            }
            if (onLoad) onLoad(model);
        });
        this.config = { ...DEFAULT_CAR_CONFIG, ...config };
        this.controls = new CarControls();
    }

    public update(delta: number): void {
        const model = this.getModel();
        if (!model) return;

        this.updateSpeed();
        this.updateRotation();
        this.applyMovement(model);
        this.updateAnimations();

        // Mettre à jour la position pour la physique
        this.position.copy(model.position);
        
        // Mettre à jour la boîte de collision
        const center = this.position.clone();
        const size = this.collisionSize.clone();
        
        // Créer une matrice de transformation pour appliquer la rotation
        const matrix = new THREE.Matrix4();
        matrix.makeRotationY(this.currentRotation);
        
        // Appliquer la rotation à la taille de la boîte
        size.applyMatrix4(matrix);
        
        // S'assurer que les dimensions sont positives
        size.set(Math.abs(size.x), Math.abs(size.y), Math.abs(size.z));
        
        // Mettre à jour la boîte de collision
        this.boundingBox.setFromCenterAndSize(center, size);

        // Appliquer la friction si on est en collision
        if (this.isColliding) {
            this.speed *= (1 - this.friction * delta);
            this.velocity.multiplyScalar(1 - this.friction * delta);
        }
    }

    private updateSpeed(): void {
        if (this.controls.isKeyPressed('z')) {
            this.speed = Math.min(this.speed + this.config.acceleration, this.config.maxSpeed);
        } else if (this.controls.isKeyPressed('s')) {
            this.speed = Math.max(this.speed - this.config.acceleration, -this.config.maxSpeed / 2);
        } else {
            this.applyDeceleration();
        }

        // Calculer la direction
        this.velocity.set(
            Math.cos(this.currentRotation) * this.speed,
            0,
            Math.sin(this.currentRotation) * this.speed
        );
    }

    private applyDeceleration(): void {
        if (this.speed > 0) {
            this.speed = Math.max(0, this.speed - this.config.deceleration);
        } else if (this.speed < 0) {
            this.speed = Math.min(0, this.speed + this.config.deceleration);
        }
    }

    private updateRotation(): void {
        if (this.controls.isKeyPressed('q')) {
            this.currentRotation -= this.config.rotationSpeed;
        }
        if (this.controls.isKeyPressed('d')) {
            this.currentRotation += this.config.rotationSpeed;
        }
        
        // Garder la rotation visuelle dans le sens opposé
        const model = this.getModel();
        if (model) {
            model.rotation.y = -this.currentRotation;
        }
    }

    private applyMovement(model: THREE.Group): void {
        // Appliquer le mouvement
        model.position.add(this.velocity);
        
        // Mettre à jour la position physique
        this.position.copy(model.position);
    }

    public getPosition(): THREE.Vector3 {
        return this.position;
    }

    public setPosition(x: number, y: number, z: number): void {
        super.setPosition(x, y, z);
        this.position.set(x, y, z);
        this.boundingBox.setFromCenterAndSize(this.position, this.collisionSize);
    }

    public getRotation(): THREE.Vector3 {
        // Retourne la rotation actuelle de la voiture sous forme de Vector3
        // Seul l'axe Y est utilisé car la voiture ne tourne que sur cet axe
        return new THREE.Vector3(0, -this.currentRotation, 0);
    }
    
    private updateAnimations(): void {
        if (Math.abs(this.speed) > 0.01) {
            const wheelAnimationIndex = this.getAnimationNames().findIndex(name => 
                name.toLowerCase().includes('wheel') || name.toLowerCase().includes('roue')
            );
            if (wheelAnimationIndex !== -1) {
                this.playAnimation(wheelAnimationIndex);
            }
        }
    }

    public getSpeed(): number {
        return this.speed;
    }

    public updateConfig(newConfig: Partial<CarConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public enableControls(): void {
        this.controls.enable();
    }

    public disableControls(): void {
        this.controls.disable();
    }

    public setColliding(colliding: boolean): void {
        this.isColliding = colliding;
    }
} 