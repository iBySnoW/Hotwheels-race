import * as THREE from "three";

export class TorusKnot {
    private torusKnot: THREE.Mesh;
    
    constructor() {
        const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16); 
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xff0000, // Red
            shininess: 100 
        }); 

        this.torusKnot = new THREE.Mesh(geometry, material);
        this.torusKnot.castShadow = true;
        this.torusKnot.receiveShadow = true;

        
    }

    public getTorusKnot() {
        return this.torusKnot;
    }

    public setPosition(x: number, y: number, z: number) {
        this.torusKnot.position.set(x, y, z);
    }

    public animateTorusKnot() {
        this.torusKnot.rotation.y += 0.01;
    }
}