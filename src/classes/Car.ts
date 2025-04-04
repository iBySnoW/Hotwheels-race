import { CarConfig, DEFAULT_CAR_CONFIG } from "../interfaces/CarConfig";
import { CarControls } from "./CarControls";
import * as THREE from "three";
import * as CANNON from 'cannon-es';

interface WheelGroup {
    mesh: THREE.Object3D;
    isFront: boolean;
    position?: THREE.Vector3;
}

export class Car {
    // Propriétés privées
    private speed: number = 0;
    private config: CarConfig;
    private controls: CarControls;
    private currentRotation: number = 0;

    // Composants physiques
    private body: CANNON.Body | null = null;
    private vehicle: CANNON.RaycastVehicle | null = null;
    private wheelBodies: CANNON.Body[] = [];

    // Composants visuels
    private model: THREE.Group | null = null;
    private wheelMeshes: THREE.Object3D[] = [];

    // Constantes de configuration des roues
    private static readonly WHEEL_CONFIG = {
        radius: 0.25,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        suspensionStiffness: 30,
        suspensionRestLength: 0.3,
        frictionSlip: 1.5,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 50000,
        rollInfluence: 0.01,
        maxSuspensionTravel: 0.3,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true,
    };

    constructor(model: THREE.Group, config: Partial<CarConfig> = {}) {
        this.model = model;
        this.config = { ...DEFAULT_CAR_CONFIG, ...config };
        this.controls = new CarControls();
        this.controls.enable();
        this.initializeModel(model, config);
    }

    // Méthodes publiques d'accès
    public getModel(): THREE.Group | null { return this.model; }
    public getBody(): CANNON.Body | null { return this.body; }
    public getWheelBodies(): CANNON.Body[] { return this.wheelBodies; }
    public getPosition(): THREE.Vector3 {
        if (!this.body) return new THREE.Vector3();
        return new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }
    public getRotation(): THREE.Vector3 {
        if (!this.body) return new THREE.Vector3();
        const quat = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
        return new THREE.Vector3(0, euler.y, 0);
    }
    public getSpeed(): number {
        if (!this.body) return 0;
        return Math.sqrt(
            this.body.velocity.x * this.body.velocity.x + 
            this.body.velocity.z * this.body.velocity.z
        );
    }

    // Méthodes publiques de contrôle
    public enableControls(): void { this.controls.enable(); }
    public disableControls(): void { this.controls.disable(); }
    public updateConfig(newConfig: Partial<CarConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
    public setPosition(x: number, y: number, z: number): void {
        if (this.body) {
            this.body.position.set(x, y, z);
        }
        if (this.model) {
            this.model.position.set(x, y, z);
        }
    }

    // Méthodes de gestion du monde physique
    public addToWorld(world: CANNON.World): void {
        if (this.vehicle) {
            this.vehicle.addToWorld(world);
            this.wheelBodies.forEach(body => world.addBody(body));
        }
    }
    public removeFromWorld(world: CANNON.World): void {
        if (this.vehicle) {
            this.vehicle.removeFromWorld(world);
            this.wheelBodies.forEach(body => world.removeBody(body));
        }
    }

    // Méthodes d'initialisation
    private initializeModel(model: THREE.Group, config: Partial<CarConfig>): void {
        if (!model) {
            console.error("Modèle non défini");
            return;
        }

        this.initializePhysics(model, config);
        this.initializeWheels(model);
    }

    private initializePhysics(model: THREE.Group, config: Partial<CarConfig>): void {
        const position = config.position || { x: 0, y: 1, z: 0 };
        
        // Créer le corps du châssis physique
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            size.x * 0.35,
            size.y * 0.25,
            size.z * 0.4
        ));
        
        const chassisMaterial = new CANNON.Material('chassis');
        
        this.body = new CANNON.Body({ 
            mass: 800,
            material: chassisMaterial,
            angularDamping: 0.5,
            linearDamping: 0.1
        });
        this.body.addShape(chassisShape);
        this.body.position.set(position.x, position.y + 0.5, position.z);
        
        // Positionner le modèle
        model.position.copy(this.body.position as any);
        model.rotation.y = 0;
        this.currentRotation = 0;
        
        // Configuration du véhicule
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.body,
            indexRightAxis: 0,  // x
            indexForwardAxis: 2,  // z
            indexUpAxis: 1  // y
        });

        // Ajouter des helpers visuels pour le debug
        model.add(new THREE.AxesHelper(1));
    }

    private initializeWheels(model: THREE.Group): void {
        const wheelMeshes = this.findWheelMeshes(model);
        if (wheelMeshes.length !== 4) {
            console.error("Il faut exactement 4 roues pour le véhicule");
            return;
        }

        // Extraire les positions des roues du modèle
        const wheelPositions = wheelMeshes.map(wheel => {
            const pos = wheel.position || new THREE.Vector3();
            return { x: pos.x, y: 0, z: pos.z }; 
        });

      
        // Ajouter chaque roue
        wheelPositions.forEach((pos, i) => this.addWheel(pos, i, wheelMeshes[i].mesh, model));
    }

    private addWheel(pos: { x: number, y: number, z: number }, index: number, wheelMesh: THREE.Object3D, model: THREE.Group): void {
        if (!this.vehicle || !this.body) return;

        const wheelOptions = {
            ...Car.WHEEL_CONFIG,
            chassisConnectionPointLocal: new CANNON.Vec3(pos.x, pos.y, pos.z),
            isFrontWheel: index < 2
        };

        // Ajuster les paramètres selon la position de la roue
        if (index < 2) {
            wheelOptions.suspensionStiffness = 35;
            wheelOptions.frictionSlip = 2.0;
        } else {
            wheelOptions.suspensionStiffness = 25;
            wheelOptions.frictionSlip = 1.8;
        }

        const wheelIndex = this.vehicle.addWheel(wheelOptions);
        this.wheelMeshes[wheelIndex] = wheelMesh;

        // Ajouter les helpers visuels
        this.addWheelHelpers(wheelMesh, wheelIndex, model);
    }

    private addWheelHelpers(wheelMesh: THREE.Object3D, wheelIndex: number, model: THREE.Group): void {
        // Helper de la boîte englobante
        wheelMesh.add(new THREE.BoxHelper(wheelMesh, 0xffff00));

        // Corps physique de la roue
        const wheelBody = new CANNON.Body({
            mass: 1,
            material: new CANNON.Material('wheel'),
            type: CANNON.Body.KINEMATIC,
            collisionFilterGroup: 0,
            collisionFilterMask: 0
        });
        wheelBody.addShape(new CANNON.Sphere(Car.WHEEL_CONFIG.radius));
        wheelBody.position.copy(this.body!.position);
        this.wheelBodies[wheelIndex] = wheelBody;

        // Sphère de visualisation physique
        const sphereMesh = new THREE.Mesh(
            new THREE.SphereGeometry(Car.WHEEL_CONFIG.radius),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        sphereMesh.position.copy(wheelBody.position as any);
        sphereMesh.position.y -= Car.WHEEL_CONFIG.suspensionRestLength / 2;
        model.add(sphereMesh);

        // Helper de suspension
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -Car.WHEEL_CONFIG.suspensionRestLength * 2, 0)
        ]);
        wheelMesh.add(new THREE.Line(
            rayGeometry,
            new THREE.LineBasicMaterial({ color: 0xff0000 })
        ));
    }

    // Méthodes de mise à jour
    public update(delta: number): void {
        if (!this.vehicle || !this.body) return;
        
        this.updateVehicleControls();
        this.updateWheels();
        this.updateModel();
    }

    private updateVehicleControls(): void {
        if (!this.vehicle) return;

        const maxSteerVal = 0.5;
        const maxForce = 1500;
        const brakeForce = 50;

        // Calculer la vitesse actuelle et le facteur de direction
        const speed = this.getSpeed();
        const speedFactor = Math.max(0.3, 1 - speed / 30);
        const currentMaxSteer = maxSteerVal * speedFactor;

        this.handleAcceleration(maxForce);
        this.handleBraking(brakeForce);
        this.handleSteering(currentMaxSteer);
    }

    private handleAcceleration(maxForce: number): void {
        if (!this.vehicle) return;

        if (this.controls.isKeyPressed('s')) {
            // Propulsion arrière principale
            this.vehicle.applyEngineForce(-maxForce, 2);
            this.vehicle.applyEngineForce(-maxForce, 3);
            // Légère assistance avant
            this.vehicle.applyEngineForce(-maxForce * 0.05, 0);
            this.vehicle.applyEngineForce(-maxForce * 0.05, 1);
        } else if (this.controls.isKeyPressed('z')) {
            this.vehicle.applyEngineForce(maxForce * 0.5, 2);
            this.vehicle.applyEngineForce(maxForce * 0.5, 3);
        } else {
            // Frein moteur progressif
            const engineBrakeForce = this.getSpeed() * 5;
            for (let i = 0; i < 4; i++) {
                this.vehicle.applyEngineForce(engineBrakeForce * Math.sign(this.body!.velocity.z), i);
            }
        }
    }

    private handleBraking(brakeForce: number): void {
        if (!this.vehicle) return;

        if (this.controls.isKeyPressed(' ')) {
            // Répartition du freinage 60/40
            this.vehicle.setBrake(brakeForce * 0.6, 0);
            this.vehicle.setBrake(brakeForce * 0.6, 1);
            this.vehicle.setBrake(brakeForce * 0.4, 2);
            this.vehicle.setBrake(brakeForce * 0.4, 3);
        } else {
            for (let i = 0; i < 4; i++) {
                this.vehicle.setBrake(0, i);
            }
        }
    }

    private handleSteering(maxSteer: number): void {
        if (!this.vehicle) return;

        if (this.controls.isKeyPressed('q')) {
            this.setSteeringAngle(maxSteer);
        } else if (this.controls.isKeyPressed('d')) {
            this.setSteeringAngle(-maxSteer);
        } else {
            this.returnSteeringToCenter();
        }
    }

    private setSteeringAngle(angle: number): void {
        if (!this.vehicle) return;
        
        // Direction uniquement sur les roues avant
        this.vehicle.setSteeringValue(angle, 0);
        this.vehicle.setSteeringValue(angle, 1);
        this.vehicle.setSteeringValue(0, 2);
        this.vehicle.setSteeringValue(0, 3);
    }

    private returnSteeringToCenter(): void {
        if (!this.vehicle) return;

        const currentSteer = this.vehicle.wheelInfos[0].steering;
        const steerReduction = Math.sign(currentSteer) * Math.min(Math.abs(currentSteer), 0.1);
        this.setSteeringAngle(currentSteer - steerReduction);
    }

    private updateWheels(): void {
        if (!this.vehicle || !this.body) return;

        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            const wheelInfo = this.vehicle.wheelInfos[i];
            const wheelMesh = this.wheelMeshes[i];
            const wheelBody = this.wheelBodies[i];
            
            // Position de la roue
            const localPosition = wheelInfo.chassisConnectionPointLocal;
            const wheelPosition = new THREE.Vector3(
                localPosition.x,
                localPosition.y,
                localPosition.z
            );
            wheelMesh.position.copy(wheelPosition);
            wheelMesh.position.y = wheelInfo.worldTransform.position.y - this.body.position.y;

            // Rotation des roues
            const rotationX = Math.atan2(wheelInfo.worldTransform.quaternion.x, wheelInfo.worldTransform.quaternion.w) * 2;
            const steeringY = i < 2 ? wheelInfo.steering : 0;

            // Créer la rotation en appliquant d'abord le braquage, puis le roulement
            const steeringQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, steeringY, 0));
            const rollingQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotationX, 0, 0));
            
            // Combiner les rotations : d'abord le braquage, puis le roulement
            const finalQuat = steeringQuat.multiply(rollingQuat);
            
            // Appliquer la rotation finale
            wheelMesh.quaternion.copy(finalQuat);

            // Mettre à jour le corps physique pour le debug
            wheelBody.position.copy(wheelInfo.worldTransform.position);
            wheelBody.quaternion.copy(wheelInfo.worldTransform.quaternion);
        }
    }

    private updateModel(): void {
        if (this.model && this.body) {
            this.model.position.copy(this.body.position as any);
            this.model.quaternion.copy(this.body.quaternion as any);
        }
    }

    private findWheelMeshes(model: THREE.Group): WheelGroup[] {
        const wheelGroups: WheelGroup[] = [];
        
        if (!model) {
            console.error("Modèle non défini dans findWheelMeshes");
            return wheelGroups;
        }

        // Stocker temporairement les roues
        let frontLeft: THREE.Object3D | null = null;
        let frontRight: THREE.Object3D | null = null;
        let backLeft: THREE.Object3D | null = null;
        let backRight: THREE.Object3D | null = null;

        // Rechercher les roues avec différents formats de noms possibles
        model.traverse((child) => {
            if (child instanceof THREE.Object3D) {
                const name = child.name.toLowerCase();
                if (name.includes('wheel') || name.includes('roue')) {
                    console.log('Found wheel:', child.name, child.position);
                    
                    if (name.includes('front') || name.includes('avant')) {
                        if (name.includes('left') || name.includes('gauche')) {
                            frontLeft = child;
                        } else if (name.includes('right') || name.includes('droite')) {
                            frontRight = child;
                        }
                    } else if (name.includes('back') || name.includes('rear') || name.includes('arriere')) {
                        if (name.includes('left') || name.includes('gauche')) {
                            backLeft = child;
                        } else if (name.includes('right') || name.includes('droite')) {
                            backRight = child;
                        }
                    }
                }
            }
        });

        console.log('Positions des roues trouvées:', {
            frontLeft: (frontLeft as THREE.Object3D | null)?.position,
            frontRight: (frontRight as THREE.Object3D | null)?.position,
            backLeft: (backLeft as THREE.Object3D | null)?.position,
            backRight: (backRight as THREE.Object3D | null)?.position
        });
        
        console.log('Wheel mesh positions:', {
            frontLeft: (frontLeft as THREE.Object3D | null)?.position,
            frontRight: (frontRight as THREE.Object3D | null)?.position,
            backLeft: (backLeft as THREE.Object3D | null)?.position,
            backRight: (backRight as THREE.Object3D | null)?.position
        });

        // Si aucune roue n'est trouvée avec les noms, on essaie de les déduire par leur position
        if (!frontLeft && !frontRight && !backLeft && !backRight) {
            const wheels: THREE.Object3D[] = [];
            model.traverse((child) => {
                if (child instanceof THREE.Object3D && 
                    (child.name.includes('wheel') || child.name.includes('roue'))) {
                    wheels.push(child);
                }
            });

            if (wheels.length === 4) {
                // Trier les roues par position
                wheels.sort((a, b) => {
                    // Trier d'abord par Z (avant/arrière)
                    if (a.position.z !== b.position.z) {
                        return b.position.z - a.position.z; // Plus grand Z = avant
                    }
                    // Puis par X (gauche/droite)
                    return a.position.x - b.position.x; // Plus petit X = gauche
                });

                [frontLeft, frontRight, backLeft, backRight] = wheels;
            }
        }

        // Ajouter les roues trouvées dans l'ordre
        if (frontLeft) {
            wheelGroups.push({ 
                mesh: frontLeft, 
                isFront: true,
                position: frontLeft.position.clone()
            });
        }
        if (frontRight) {
            wheelGroups.push({ 
                mesh: frontRight, 
                isFront: true,
                position: frontRight.position.clone()
            });
        }
        if (backLeft) {
            wheelGroups.push({ 
                mesh: backLeft, 
                isFront: false,
                position: backLeft.position.clone()
            });
        }
        if (backRight) {
            wheelGroups.push({ 
                mesh: backRight, 
                isFront: false,
                position: backRight.position.clone()
            });
        }

        if (wheelGroups.length !== 4) {
            console.warn(`Attention : ${wheelGroups.length} roues trouvées sur 4 attendues`);
        }

        return wheelGroups;
    }

    private updateAnimations(): void {
        // Cette méthode sera implémentée plus tard quand nous ajouterons les animations
    }
} 