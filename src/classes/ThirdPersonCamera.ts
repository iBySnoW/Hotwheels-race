import * as THREE from 'three';
import { Car } from './Car';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class ThirdPersonCamera {
    private camera: THREE.PerspectiveCamera;
    private target: Car;
    private smoothness: number = 0.1;
    private offset: THREE.Vector3;
    private currentPosition: THREE.Vector3;
    private desiredPosition: THREE.Vector3;
    private orbitControls: OrbitControls | null = null;
    private isOrbitMode: boolean = false;
    private renderer: THREE.WebGLRenderer | null = null;

    // Ajout de paramètres pour le comportement dynamique
    private  BASE_HEIGHT = 2.0;        // Hauteur de base
    private  BASE_DISTANCE = 6.0;      // Distance de base
    private readonly SPEED_FACTOR = 0.05;      // Facteur d'influence de la vitesse
    private readonly MAX_ADDITIONAL_DISTANCE = 2.0; // Distance additionnelle maximale
    private readonly TILT_FACTOR = 0.15;       // Facteur d'inclinaison en virage

    constructor(target: Car) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.target = target;
        
        // Position initiale
        this.offset = new THREE.Vector3(0, this.BASE_HEIGHT, this.BASE_DISTANCE);
        this.currentPosition = new THREE.Vector3();
        this.desiredPosition = new THREE.Vector3();
        
        this.updateCameraPosition();

        // Ajouter l'écouteur d'événements pour la touche "O"
        window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'o') {
                this.toggleOrbitMode();
            }
        });
    }

    public setRenderer(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
        if (this.renderer) {
            this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
            this.orbitControls.enabled = false;
            this.orbitControls.enableDamping = true;
            this.orbitControls.dampingFactor = 0.05;
        }
    }

    private toggleOrbitMode(): void {
        this.isOrbitMode = !this.isOrbitMode;
        if (this.orbitControls) {
            this.orbitControls.enabled = this.isOrbitMode;
            if (this.isOrbitMode) {
                // En mode orbit, on garde la position actuelle de la caméra
                this.orbitControls.target.copy(this.target.getPosition());
            }
        }
    }

    public update(): void {
        if (this.isOrbitMode && this.orbitControls) {
            this.orbitControls.target.copy(this.target.getPosition());
            this.orbitControls.update();
            return;
        }

        const targetPosition = this.target.getPosition();
        const targetRotation = this.target.getRotation();
        
        // Calculer la position désirée de la caméra
        this.calculateDesiredPosition(targetPosition, targetRotation);
        
        // Appliquer un mouvement fluide vers la position désirée
        this.smoothFollow();
        
        // Faire regarder la caméra vers la voiture avec un point légèrement surélevé
        const lookAtPoint = targetPosition.clone();
        lookAtPoint.y += 0.5;
        this.camera.lookAt(lookAtPoint);
    }

    private calculateDesiredPosition(targetPosition: THREE.Vector3, targetRotation: THREE.Vector3): void {
        // Créer un vecteur pour la position désirée derrière la voiture
        const angle = targetRotation.y;
        
        // Calculer la position derrière la voiture en utilisant des fonctions trigonométriques
        const offsetX = - Math.sin(angle) * this.BASE_DISTANCE;
        const offsetZ = - Math.cos(angle) * this.BASE_DISTANCE;
        
        // Mettre à jour la position désirée
        this.desiredPosition.set(
            targetPosition.x - offsetX,  // Position X derrière la voiture
            targetPosition.y + this.BASE_HEIGHT, // Hauteur fixe
            targetPosition.z - offsetZ   // Position Z derrière la voiture
        );
    }

    private smoothFollow(): void {
        // Interpolation linéaire entre la position actuelle et la position désirée
        this.camera.position.lerp(this.desiredPosition, this.smoothness);
    }

    public setBaseHeight(height: number): void {
        this.BASE_HEIGHT = Math.max(1, height);
    }

    public setBaseDistance(distance: number): void {
        this.BASE_DISTANCE = Math.max(3, distance);
    }

    public setSmoothness(value: number): void {
        this.smoothness = Math.max(0.01, Math.min(1, value));
    }

    private updateCameraPosition(): void {
        if (this.isOrbitMode) return;

        const targetPosition = this.target.getPosition();
        const targetRotation = this.target.getRotation();

        // Créer une matrice de rotation basée sur la rotation de la voiture
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(targetRotation.y);
        
        // Appliquer la rotation à l'offset
        this.currentPosition.copy(this.offset);
        this.currentPosition.applyMatrix4(rotationMatrix);
        
        // Positionner la caméra
        this.camera.position.copy(targetPosition).add(this.currentPosition);
        this.camera.lookAt(targetPosition);
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
} 