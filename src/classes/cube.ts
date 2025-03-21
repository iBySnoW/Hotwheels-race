import * as THREE from "three";

export class Cube {
    private cube: THREE.Mesh;

    constructor() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        this.cube = new THREE.Mesh(geometry, material);
        this.cube.castShadow = true;
        this.cube.receiveShadow = true;
    }

    public getCube() {
        return this.cube;
    }

    public setPosition(x: number, y: number, z: number) {
        this.cube.position.set(x, y, z);
    }

    public animateCube() {
        // Bounce the cube up and down
        this.cube.position.y = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
        this.cube.rotation.y += 0.01;
        this.cube.rotation.x += 0.01;
    }
}