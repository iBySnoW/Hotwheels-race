import * as THREE from 'three';
import { Car } from './Car';

export class ThirdPersonCamera {
    private camera: THREE.PerspectiveCamera;
    private target: Car;
    private offset: THREE.Vector3;
    private smoothness: number = 0.1;

    constructor(camera: THREE.PerspectiveCamera, target: Car) {
        this.camera = camera;
        this.target = target;
        
        // Position initiale de la caméra par rapport à la voiture
        this.offset = new THREE.Vector3(8, 3, 0); // (x:0 = centré, y:3 = hauteur, z:8 = distance derrière)
    }

    public update(): void {
        const targetPosition = this.target.position;
        const targetRotation = this.target.getModel()?.rotation.y || 0;

        // // Calculer la position désirée de la caméra en fonction de la rotation de la voiture
        // const desiredPosition = new THREE.Vector3(
        //     targetPosition.x - Math.sin(targetRotation) * this.offset.z,
        //     targetPosition.y + this.offset.y,
        //     targetPosition.z - Math.cos(targetRotation) * this.offset.z
        // );

        // // Appliquer la nouvelle position à la caméra avec un effet de lissage
        // this.camera.position.lerp(desiredPosition, this.smoothness);

        // Faire regarder la caméra vers la voiture
        this.camera.lookAt(targetPosition);
    }

    public setOffset(x: number, y: number, z: number): void {
        this.offset.set(x, y, z);
    }

    public setSmoothness(smoothness: number): void {
        this.smoothness = Math.max(0.01, Math.min(1, smoothness));
    }
} 