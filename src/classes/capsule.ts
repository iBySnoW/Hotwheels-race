import * as THREE from "three";

export class Capsule {
    private capsule: THREE.Mesh;

    constructor() {
        const geometry = new THREE.CapsuleGeometry(1, 1, 4, 8);
        const material = new THREE.MeshStandardMaterial({color: 0x00ff00});
        this.capsule = new THREE.Mesh(geometry, material);
        this.capsule.castShadow = true;
        this.capsule.receiveShadow = true;
    }

    public getCapsule() {
        return this.capsule;
    }

    public setPosition(x: number, y: number, z: number) {
        this.capsule.position.set(x, y, z);
    }

    public animateCapsule() {
        // Bounce the capsule up and down
        this.capsule.position.y = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
    }
}
