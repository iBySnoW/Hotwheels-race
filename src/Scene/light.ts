import * as THREE from "three";

export class Light {
    private light: THREE.Light;
    
    constructor() {
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.light.position.set(1, 1, 1);
        this.light.castShadow = true;
        this.light.shadow!.mapSize.set(1024, 1024);
        (this.light.shadow!.camera as THREE.OrthographicCamera).near = 1;
        (this.light.shadow!.camera as THREE.OrthographicCamera).far = 50;
        (this.light.shadow!.camera as THREE.OrthographicCamera).left = -10;
        (this.light.shadow!.camera as THREE.OrthographicCamera).right = 10;
        (this.light.shadow!.camera as THREE.OrthographicCamera).top = 10;
        (this.light.shadow!.camera as THREE.OrthographicCamera).bottom = -10;
    }

    public getLight() {
        return this.light;
    }
}