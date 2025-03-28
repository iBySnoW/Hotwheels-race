import * as THREE from 'three';
import { Car } from './Car';

export class ThirdPersonCamera {
    private camera: THREE.PerspectiveCamera;
    private target: Car;
    private smoothness: number = 0.1;

    constructor(target: Car) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.target = target;
        let targetPosition = this.target.getPosition();
        let targetRotation = this.target.getRotation();


        // Position initiale de la caméra par rapport à la voiture
        this.setPosition(targetPosition);
        // Rotation initiale de la caméra
        this.setRotation(targetRotation);
        // Faire regarder la caméra vers la voiture
        this.camera.lookAt(targetPosition);


    }

    public update(): void {
        const targetPosition = this.target.getPosition();
        const targetRotation = this.target.getRotation();

        // Calculer la position cible de la caméra en tenant compte de la rotation de la voiture
        const offset = new THREE.Vector3(0, 2, 4); // Offset vertical et distance derrière la voiture
        const targetCameraPosition = new THREE.Vector3();
        
        // Créer une matrice de rotation basée sur la rotation de la voiture
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(targetRotation.y - Math.PI / 2);
        
        // Appliquer la rotation à l'offset
        offset.applyMatrix4(rotationMatrix);
        
        // Calculer la position finale de la caméra
        targetCameraPosition.copy(targetPosition).add(offset);

        // Interpolation linéaire pour un mouvement fluide
        this.camera.position.lerp(targetCameraPosition, this.smoothness);

        // Faire regarder la caméra vers la voiture
        this.camera.lookAt(targetPosition);
    }

    public setSmoothness(smoothness: number): void {
        this.smoothness = Math.max(0.01, Math.min(1, smoothness));
    }

    public setPosition(targetPosition: THREE.Vector3): void {
        // Position initiale de la caméra par rapport à la voiture
        this.camera.position.set(targetPosition.x - 4, targetPosition.y + 2, targetPosition.z);
    }

    public setRotation(targetRotation: THREE.Vector3): void {
        // Rotation initiale de la caméra
        this.camera.rotation.set(targetRotation.x, targetRotation.y - Math.PI / 2, targetRotation.z);
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
} 