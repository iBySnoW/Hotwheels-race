import * as THREE from "three";

export class Camera {
    private camera: THREE.PerspectiveCamera;

    constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(-10, 10, 10);
        this.camera.lookAt(0, 0, 0);    
    }

    public getCamera() {
        return this.camera;
    }
}