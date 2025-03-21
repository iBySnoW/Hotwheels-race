import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { AnimationMixer } from "three";

export class AnimatedModel {
    private model: THREE.Group | null = null;
    private mixer: AnimationMixer | null = null;
    private animations: THREE.AnimationClip[] = [];
    private currentAction: THREE.AnimationAction | null = null;

    constructor(private modelPath: string, onLoad?: (model: THREE.Group) => void) {
        this.loadModel(onLoad);
    }

    private loadModel(onLoad?: (model: THREE.Group) => void) {
        const loader = new GLTFLoader();
        loader.load(this.modelPath, (gltf) => {
            this.model = gltf.scene;
            this.model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Setup animation
            this.mixer = new THREE.AnimationMixer(gltf.scene);
            this.animations = gltf.animations;
            
            // Play first animation by default
            if (this.animations.length > 0) {
                this.playAnimation(0);
            }

            if (onLoad) {
                onLoad(this.model);
            }
        });
    }

    public getModel() {
        return this.model;
    }

    public getAnimationsCount(): number {
        return this.animations.length;
    }

    public getAnimationNames(): string[] {
        return this.animations.map((animation, index) => 
            animation.name || `Animation ${index}`
        );
    }

    public playAnimation(index: number) {
        if (this.mixer && this.animations[index]) {
            if (this.currentAction) {
                this.currentAction.fadeOut(0.5);
            }
            const newAction = this.mixer.clipAction(this.animations[index]);
            newAction.reset().fadeIn(0.5).play();
            this.currentAction = newAction;
        }
    }

    public animate(delta: number) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    public setPosition(x: number, y: number, z: number) {
        if (this.model) {
            this.model.position.set(x, y, z);
        }
    }
} 