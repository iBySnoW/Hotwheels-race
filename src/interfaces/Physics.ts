import * as THREE from 'three';

export interface CollisionBox {
    min: THREE.Vector3;
    max: THREE.Vector3;
}

export interface PhysicsObject {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    boundingBox: THREE.Box3;
    mass: number;
    friction: number;
    restitution: number; // coefficient de restitution pour les rebonds
    setColliding(isColliding: boolean): void;
}

export interface CollisionResult {
    isColliding: boolean;
    penetration: THREE.Vector3;
    normal: THREE.Vector3;
}

export const DEFAULT_PHYSICS_CONFIG = {
    mass: 1000,          // masse en kg
    friction: 0.1,       // coefficient de friction
    restitution: 0.3,    // coefficient de restitution pour les rebonds
    gravity: 0.05,       // gravité plus faible mais plus constante
    groundY: 0,          // position Y du sol
    groundFriction: 0.1  // friction du sol réduite
}; 