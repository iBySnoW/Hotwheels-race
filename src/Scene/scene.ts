import * as THREE from "three";
// Scene
import { Light } from "./light";
import { AmbientLight } from "./ambientLight";
import { Camera } from "./camera";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";
// Classes
import { Capsule } from "../classes/capsule";
import { Cube } from "../classes/cube";
import { TorusKnot } from "../classes/torusKnot";
import { AnimatedModel } from "../classes/AnimatedModel";

export class Scene {
    private scene: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private gui!: GUI;
    private underground!: THREE.Mesh;
    private camera!: Camera;
    private light!: Light;
    private ambientLight!: AmbientLight;
    private capsule!: Capsule;
    private cube!: Cube;
    private torusKnot!: TorusKnot;
    private clock: THREE.Clock;
    private dummyModel!: AnimatedModel;

    constructor() {
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.camera = new Camera();
        this.light = new Light();
        this.ambientLight = new AmbientLight();
        this.capsule = new Capsule();
        this.cube = new Cube();
        this.torusKnot = new TorusKnot();
       
        // Load gltf model
        this.dummyModel = new AnimatedModel('/models/dummy_animated/dummy_animated.glb', (model) => {
            this.scene.add(model);
            this.dummyModel.setPosition(-6, 0, 0);
            // Create GUI after model is loaded
            this.createGUI();
        });
       
        this.setupScene();
        this.createRenderer();
        this.createControls();
    }
    
    // RENDERER
    private createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: document.querySelector('canvas') as HTMLCanvasElement
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(() => this.animate());
        this.renderer.shadowMap.enabled = true;

        // Gestionnaire de redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private onWindowResize() {
        const camera = this.camera.getCamera();
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private createControls() {
        this.controls = new OrbitControls(this.camera.getCamera(), this.renderer.domElement);
        
        // Configuration des contrôles
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        this.controls.screenSpacePanning = false;
        
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        
        this.controls.maxPolarAngle = Math.PI / 2;
        
        // Vitesse de rotation et de zoom
        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.0;
        
        // Activer les contrôles
        this.controls.enabled = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        
        // Met à jour les contrôles immédiatement
        this.controls.update();
    }

    // UNDERGROUND
   private createUnderground() {
    const geometry = new THREE.PlaneGeometry(25, 25);
    const material = new THREE.MeshStandardMaterial({color: 0xffff00, side: THREE.DoubleSide});
    const plane = new THREE.Mesh(geometry, material);
    this.underground = plane;
    this.underground.position.y = -1;
    this.underground.rotateX(Math.PI / 2);
    this.underground.receiveShadow = true;
   }

    // Set up the scene
    public setupScene() {
        // Environment
        this.createUnderground();
        this.scene.add(this.underground);
       
        // Camera
        this.scene.add(this.camera.getCamera());

        // Light
        this.scene.add(this.light.getLight());
        this.scene.add(this.ambientLight.getLight());
        // Objects
        this.scene.add(this.capsule.getCapsule());
        this.capsule.setPosition(0, 0, 0);
        this.scene.add(this.cube.getCube());
        this.cube.setPosition(-3, 0, 0);
        this.scene.add(this.torusKnot.getTorusKnot());
        this.torusKnot.setPosition(3, 2, 0);
    }

    private createGUI() {
        this.gui = new GUI({ width: 300 }); // Augmenter la largeur du GUI
        
        // GUI pour le dummy model
        const dummyFolder = this.gui.addFolder('Dummy Model');
        const dummy = this.dummyModel.getModel();
        if (dummy) {
            // Position controls
            const positionFolder = dummyFolder.addFolder('Position');
            positionFolder.add(dummy.position, 'x', -10, 10, 0.1);
            positionFolder.add(dummy.position, 'y', -10, 10, 0.1);
            positionFolder.add(dummy.position, 'z', -10, 10, 0.1);
            positionFolder.open();

            // Animation controls
            const animationFolder = dummyFolder.addFolder('Animations');
            const animationController = {
                currentAnimation: 0,
                animationName: this.dummyModel.getAnimationNames()[0]
            };
            
            animationFolder.add(animationController, 'animationName', this.dummyModel.getAnimationNames())
                .name('Animation')
                .onChange((value) => {
                    const index = this.dummyModel.getAnimationNames().indexOf(value);
                    this.dummyModel.playAnimation(index);
                });
            animationFolder.open();
        }
        dummyFolder.open();
    }

    public animate() {
        // Animate GLTF model
        const delta = this.clock.getDelta();
        this.dummyModel.animate(delta);

        // Animate objects
        this.capsule.animateCapsule();
        this.cube.animateCube();
        this.torusKnot.animateTorusKnot();

        // Update controls
        this.controls.update();

        // Render
        this.renderer.render(this.scene, this.camera.getCamera());
    }
}