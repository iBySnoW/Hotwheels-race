import * as THREE from "three";

export class Light {
    private light: THREE.Light;
    
    constructor() {
        this.light = new THREE.DirectionalLight(0xffffff, 2.0);
        this.light.position.set(10, 20, 10);
        this.light.castShadow = true;
        this.light.shadow!.mapSize.set(2048, 2048);
        (this.light.shadow!.camera as THREE.OrthographicCamera).near = 1;
        (this.light.shadow!.camera as THREE.OrthographicCamera).far = 100;
        (this.light.shadow!.camera as THREE.OrthographicCamera).left = -20;
        (this.light.shadow!.camera as THREE.OrthographicCamera).right = 20;
        (this.light.shadow!.camera as THREE.OrthographicCamera).top = 20;
        (this.light.shadow!.camera as THREE.OrthographicCamera).bottom = -20;
        this.light.shadow!.bias = -0.001;
    }

    public getLight() {
        return this.light;
    }
}