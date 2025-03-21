import * as THREE from "three";

export class AmbientLight {
    private light: THREE.AmbientLight;
    
    constructor() {
        this.light = new THREE.AmbientLight(0xffffff, 0.5);
    }

    public getLight() {
        return this.light;
    }
}
