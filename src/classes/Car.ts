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
        radius: 0.4,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        suspensionStiffness: 30,
        suspensionRestLength: 0.3,
        frictionSlip: 1.5,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 100000,
        rollInfluence: 0.08,
        maxSuspensionTravel: 0.3,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true,
    };

    // Propriétés pour le drift
    private isDrifting: boolean = false;
    private driftFactor: number = 0;
    private readonly DRIFT_FACTOR_INCREASE: number = 0.1;
    private readonly DRIFT_FACTOR_DECREASE: number = 0.95;
    private readonly MAX_DRIFT_FACTOR: number = 1.0;
    private isDriftDetected: boolean = false;

    // Ajout de nouvelles propriétés pour le drift
    private readonly DRIFT_FRICTION_REDUCTION = 0.4;  // Réduction de friction pendant le drift
    private readonly DRIFT_ANGLE_FACTOR = 0.8;       // Facteur d'angle de drift
    private readonly WEIGHT_TRANSFER_FACTOR = 0.15;   // Facteur de transfert de poids
    private driftAngle: number = 0;                   // Angle actuel de drift
    private lateralVelocity: number = 0;             // Vitesse latérale

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
        
        // Créer le matériau du châssis
        const chassisMaterial = new CANNON.Material('chassis');
        
        // Créer le corps du châssis physique
        this.body = new CANNON.Body({ 
            mass: 800,
            material: chassisMaterial,
            angularDamping: 0.5,
            linearDamping: 0.1
        });

        // Parcourir le modèle pour trouver le châssis
        model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const mesh = child;
                const geometry = mesh.geometry;
                
                if (geometry.attributes.position) {
                    // Obtenir les vertices et indices de la géométrie
                    const vertices = geometry.attributes.position.array;
                    const indices = geometry.index ? geometry.index.array : null;

                    // Créer un shape trimesh pour la géométrie
                    const shape = new CANNON.Trimesh(
                        Array.from(vertices as Float32Array),
                        indices ? Array.from(indices) : []
                    );

                    // Calculer la transformation complète du mesh
                    mesh.updateMatrixWorld(true);
                    const worldMatrix = mesh.matrixWorld.clone();

                    // Décomposer la matrice en position, rotation et échelle
                    const meshPosition = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();
                    worldMatrix.decompose(meshPosition, quaternion, scale);

                    // Appliquer la position et rotation au corps
                    this.body!.position.copy(meshPosition as any);
                    this.body!.quaternion.copy(quaternion as any);

                    // Ajouter le shape au corps
                    this.body!.addShape(shape);
                }
            }
        });

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
            wheelOptions.frictionSlip = 2.0;
            wheelOptions.rollInfluence = 0.08;
        } else {
            wheelOptions.frictionSlip = 1.2;
            wheelOptions.rollInfluence = 0.05;
        }

        const wheelIndex = this.vehicle.addWheel(wheelOptions);
        this.wheelMeshes[wheelIndex] = wheelMesh;

        // Ajouter les helpers visuels
        this.addWheelHelpers(wheelMesh, wheelIndex, model);
    }

    private addWheelHelpers(wheelMesh: THREE.Object3D, wheelIndex: number, model: THREE.Group): void {
        // Corps physique de la roue
        const wheelBody = new CANNON.Body({
            mass: 1,
            material: new CANNON.Material('wheel'),
            type: CANNON.Body.KINEMATIC,
            collisionFilterGroup: 0,
            collisionFilterMask: 0
        });

        // Parcourir le mesh de la roue pour créer le Trimesh
        if (wheelMesh instanceof THREE.Mesh && wheelMesh.geometry) {
            const geometry = wheelMesh.geometry;
            
            if (geometry.attributes.position) {
                // Obtenir les vertices et indices de la géométrie
                const vertices = geometry.attributes.position.array;
                const indices = geometry.index ? geometry.index.array : null;

                // Créer un shape trimesh pour la géométrie
                const shape = new CANNON.Trimesh(
                    Array.from(vertices as Float32Array),
                    indices ? Array.from(indices) : []
                );

                // Calculer la transformation complète du mesh
                wheelMesh.updateMatrixWorld(true);
                const worldMatrix = wheelMesh.matrixWorld.clone();

                // Décomposer la matrice en position, rotation et échelle
                const meshPosition = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                worldMatrix.decompose(meshPosition, quaternion, scale);

                // Appliquer la position et rotation au corps
                wheelBody.position.copy(meshPosition as any);
                wheelBody.quaternion.copy(quaternion as any);

                // Ajouter le shape au corps
                wheelBody.addShape(shape);
            }
        }

        this.wheelBodies[wheelIndex] = wheelBody;
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

        const maxSteerVal = 0.8;
        const maxForce = 3000;
        const brakeForce = 50;

        // Ajustement de la direction en fonction du drift
        const steeringFactor = this.isDrifting ? 1.2 : 1.0;  // Plus de réactivité pendant le drift
        const speed = this.getSpeed();
        const speedFactor = Math.max(0.4, 1 - speed / 50);
        const currentMaxSteer = maxSteerVal * speedFactor * steeringFactor;

        this.handleAcceleration(maxForce);
        this.handleBraking(brakeForce);
        this.handleSteering(currentMaxSteer);
    }

    private handleAcceleration(maxForce: number): void {
        if (!this.vehicle) return;

        // Augmenter la force maximale pour plus de puissance
        maxForce = 4500;  // Augmentation significative de la puissance (était 1500)

        // Calculer la force en fonction de la vitesse et du drift
        const speed = this.getSpeed();
        const speedFactor = Math.max(0.6, 1 - speed / 80);  // Réduction moins importante de la puissance à haute vitesse
        const engineForce = maxForce * speedFactor;

        if (this.controls.isKeyPressed('s')) {
            // Propulsion arrière pure avec puissance réduite en marche arrière
            const reverseForce = engineForce * 0.7;  // 70% de la puissance en marche arrière
            this.vehicle.applyEngineForce(-reverseForce, 2);
            this.vehicle.applyEngineForce(-reverseForce, 3);
            // Aucune force sur les roues avant
            this.vehicle.applyEngineForce(0, 0);
            this.vehicle.applyEngineForce(0, 1);
        } else if (this.controls.isKeyPressed('z')) {
            // Propulsion arrière pure avec pleine puissance
            this.vehicle.applyEngineForce(engineForce, 2);
            this.vehicle.applyEngineForce(engineForce, 3);
            // Aucune force sur les roues avant
            this.vehicle.applyEngineForce(0, 0);
            this.vehicle.applyEngineForce(0, 1);
        } else {
            // Frein moteur progressif uniquement sur les roues arrière
            const engineBrakeForce = Math.min(this.getSpeed() * 3, maxForce * 0.3);  // Frein moteur plus fort
            this.vehicle.applyEngineForce(-engineBrakeForce * Math.sign(this.body!.velocity.z), 2);
            this.vehicle.applyEngineForce(-engineBrakeForce * Math.sign(this.body!.velocity.z), 3);
            this.vehicle.applyEngineForce(0, 0);
            this.vehicle.applyEngineForce(0, 1);
        }
    }

    private handleBraking(brakeForce: number): void {
        if (!this.vehicle) return;

        if (this.controls.isKeyPressed('space')) {
            // Déclencher le drift
            this.isDrifting = true;
            
            // Augmenter progressivement le facteur de drift
            if (this.driftFactor < this.MAX_DRIFT_FACTOR) {
                this.driftFactor += this.DRIFT_FACTOR_INCREASE;
            }

            // Réduire la friction des roues arrière pendant le drift
            const rearWheelFriction = this.DRIFT_FRICTION_REDUCTION;
            this.vehicle.wheelInfos[2].frictionSlip = rearWheelFriction;
            this.vehicle.wheelInfos[3].frictionSlip = rearWheelFriction;

            // Appliquer un freinage plus fort sur les roues arrière pour le frein à main
            this.vehicle.setBrake(brakeForce * 5, 2);  // Force de freinage x5 sur roue arrière gauche
            this.vehicle.setBrake(brakeForce * 5, 3);  // Force de freinage x5 sur roue arrière droite
            // Freinage léger sur les roues avant pour permettre le contrôle
            this.vehicle.setBrake(brakeForce * 0.2, 0);
            this.vehicle.setBrake(brakeForce * 0.2, 1);

            // Annuler toute force moteur pendant le freinage
            this.vehicle.applyEngineForce(0, 2);
            this.vehicle.applyEngineForce(0, 3);

            // Appliquer une force centrifuge simulée
            if (this.body) {
                const speed = this.getSpeed();
                const steeringAngle = this.vehicle.wheelInfos[0].steering;
                const centrifugalForce = speed * speed * Math.abs(steeringAngle) * 0.1;
                const direction = new CANNON.Vec3(
                    Math.sin(this.body.quaternion.z),
                    0,
                    Math.cos(this.body.quaternion.z)
                );
                this.body.applyLocalForce(
                    new CANNON.Vec3(direction.x * centrifugalForce, 0, direction.z * centrifugalForce),
                    new CANNON.Vec3(0, 0, 0)
                );
            }
        } else {
            // Réduire progressivement le facteur de drift
            this.driftFactor *= this.DRIFT_FACTOR_DECREASE;
            this.isDrifting = false;

            // Rétablir la friction normale des roues
            const normalFriction = 1.5;
            this.vehicle.wheelInfos[2].frictionSlip = normalFriction;
            this.vehicle.wheelInfos[3].frictionSlip = normalFriction;

            for (let i = 0; i < 4; i++) {
                this.vehicle.setBrake(0, i);
            }
        }

        // Détection du drift
        if (this.vehicle.wheelInfos.length >= 4) {
            const leftRear = this.vehicle.wheelInfos[2];
            const rightRear = this.vehicle.wheelInfos[3];
            this.isDriftDetected = Math.abs(leftRear.sideImpulse) > 5 || Math.abs(rightRear.sideImpulse) > 5;
        }
    }

    private handleSteering(maxSteer: number): void {
        if (!this.vehicle) return;

        // Augmenter l'angle de braquage maximum
        maxSteer = 0.8;

        // Ajouter un facteur de vitesse pour le braquage
        const speed = this.getSpeed();
        const speedFactor = Math.max(0.4, 1 - speed / 50);
        
        // Augmenter l'angle de braquage pendant le drift
        const driftMultiplier = this.isDrifting ? 1.5 : 1.0;
        const currentMaxSteer = maxSteer * speedFactor * driftMultiplier;

        let targetSteering = 0;
        if (this.controls.isKeyPressed('q')) {
            targetSteering = currentMaxSteer;
        } else if (this.controls.isKeyPressed('d')) {
            targetSteering = -currentMaxSteer;
        }

        // Appliquer le contre-braquage automatique pendant le drift
        if (this.isDrifting && this.body) {
            // Calculer l'angle de dérapage
            const velocity = new THREE.Vector3(this.body.velocity.x, 0, this.body.velocity.z);
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.body.quaternion as any);
            const driftAngle = Math.atan2(
                velocity.cross(forward).y,
                velocity.dot(forward)
            );

            // Calculer le contre-braquage en fonction de l'angle de dérapage
            const counterSteer = -driftAngle * this.DRIFT_ANGLE_FACTOR;
            
            // Mélanger le braquage du joueur avec le contre-braquage automatique
            targetSteering = targetSteering * 0.7 + counterSteer * 0.3;
        }

        this.setSteeringAngle(targetSteering);
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
        // Augmenter la vitesse de retour du volant
        const steerReduction = Math.sign(currentSteer) * Math.min(Math.abs(currentSteer), 0.25);
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