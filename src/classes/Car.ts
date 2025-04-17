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
    // Composants essentiels
    private model: THREE.Group | null = null;
    private config: CarConfig;
    private controls: CarControls;

    // Composants physiques
    private body: CANNON.Body | null = null;
    private vehicle: CANNON.RaycastVehicle | null = null;
    private wheelBodies: CANNON.Body[] = [];
    private wheelMeshes: THREE.Object3D[] = [];

    // Configuration des roues
    private static readonly WHEEL_CONFIG = {
        radius: 0.4,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        suspensionStiffness: 45,        // Augmenté pour une meilleure réponse
        suspensionRestLength: 0.4,      // Augmenté pour plus de débattement
        frictionSlip: 2.2,              // Augmenté pour une meilleure adhérence
        dampingRelaxation: 3.0,         // Augmenté pour une meilleure réponse
        dampingCompression: 4.8,        // Augmenté pour plus de contrôle
        maxSuspensionForce: 150000,     // Augmenté pour une meilleure tenue de route
        rollInfluence: 0.04,            // Réduit pour moins de roulis
        maxSuspensionTravel: 0.4,       // Augmenté pour plus de débattement
        customSlidingRotationalSpeed: -35,
        useCustomSlidingRotationalSpeed: true,
    };

    // Configuration du drift
    private static readonly DRIFT_CONFIG = {
        REAR_BRAKE_FORCE: 20,           // Réduit pour un drift moins agressif
        REAR_FRICTION_HANDBRAKE: 0.3,   // Augmenté pour un meilleur contrôle
        REAR_FRICTION_NORMAL: 2,        // Inchangé
        FRONT_FRICTION: 2.4,            // Inchangé
        DRIFT_ANGLE_THRESHOLD: 0.3,     // Augmenté pour éviter les drifts accidentels
        DRIFT_RECOVERY_RATE: 0.25,      // Réduit pour une transition plus douce
        DRIFT_INITIATION_SPEED: 40,     // Inchangé
        DRIFT_STEERING_MULTIPLIER: 1.1, // Réduit pour éviter les 180° trop faciles
        DRIFT_MOMENTUM_FACTOR: 0.9,     // Augmenté pour conserver plus d'élan
        DRIFT_STABILITY_FACTOR: 0.7,    // Augmenté pour une meilleure stabilité
        DRIFT_EXIT_THRESHOLD: 0.15,     // Inchangé
        DRIFT_TRANSITION_TIME: 0.3,     // Inchangé
    };

    // Configuration de la dynamique du véhicule
    private static readonly VEHICLE_DYNAMICS = {
        // Vitesse et accélération
        MIN_SPEED_FACTOR: 0.2,         // Facteur de vitesse minimum
        MAX_SPEED_KMH: 180,           // Vitesse maximale réduite pour plus de stabilité
        MIN_STEERING_FACTOR: 0.3,      // Facteur de direction minimum
        MAX_STEERING_SPEED_KMH: 200,   // Vitesse maximale de direction
        STEERING_POWER_FACTOR: 1.4,    // Facteur de puissance de direction
        
        // Résistances et forces
        TURN_RESISTANCE_FACTOR: 0.015,  // Résistance en virage
        MIN_SPEED_FOR_LATERAL_RESISTANCE: 10,
        LATERAL_RESISTANCE_FACTOR: 0.02,
        BASE_LINEAR_DAMPING: 0.1,      // Amortissement linéaire de base
        BASE_ANGULAR_DAMPING: 0.5,     // Amortissement angulaire de base
        
        // Conversion
        KMH_TO_MS: 1/3.6,              // Convertir km/h en m/s
        DOWNFORCE_FACTOR: 0.001,        // Force vers le bas proportionnelle à la vitesse
        AIR_RESISTANCE_FACTOR: 0.0001   // Résistance de l'air
    };

    // Configuration aérodynamique avancée
    private static readonly AERODYNAMICS_CONFIG = {
        DOWNFORCE_FACTOR: 0.004,        // Doublé de 0.002 à 0.004 pour plus de downforce
        AIR_RESISTANCE_FACTOR: 0.00015, // Inchangé
        GROUND_EFFECT_FACTOR: 0.002,    // Doublé de 0.001 à 0.002 pour plus d'effet de sol
        LIFT_FACTOR: 0.00005,          // Réduit de 0.0001 à 0.00005 pour moins de portance
        TURBULENCE_FACTOR: 0.00005,     // Inchangé
        WIND_RESISTANCE: 0.0001,        // Inchangé
        SPEED_THRESHOLD: 30,           // Inchangé
    };

    // États du véhicule
    private isDriftDetected: boolean = false;

    // Constantes de physique
    private static readonly PHYSICS_CONFIG = {
        MAX_FORCE: 3000,            // Force maximale raisonnable
        MAX_STEER: 0.5,            // Angle de braquage maximum
        BRAKE_FORCE: 70,           // Force de freinage
        REVERSE_POWER_RATIO: 0.7,   // Ratio de puissance en marche arrière
        ENGINE_BRAKE_FACTOR: 3      // Facteur de frein moteur
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
        
        // Créer le matériau du châssis
        const chassisMaterial = new CANNON.Material('chassis');
        chassisMaterial.friction = 0.7;
        chassisMaterial.restitution = 0.3;
        
        // Créer le corps du châssis physique
        this.body = new CANNON.Body({ 
            mass: 800, // Réduit pour une meilleure maniabilité
            material: chassisMaterial,
            angularDamping: 0.3, // Réduit pour permettre plus de rotation en cas de collision
            linearDamping: 0.05, // Réduit pour une meilleure réponse aux collisions
            allowSleep: false
        });

        // Ajouter une forme de boîte pour le châssis principal
        const chassisShape = new CANNON.Box(new CANNON.Vec3(0.68, 0.35, 1.55));
        this.body.addShape(chassisShape, new CANNON.Vec3(0, 0.2, 0));

        // Ajouter une forme de boîte plus petite pour le toit
        const roofShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.2, 0.8));
        this.body.addShape(roofShape, new CANNON.Vec3(0, 0.6, 0));

        // Positionner le corps
        this.body.position.set(position.x, position.y, position.z);
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);

        // Positionner le modèle
        model.position.copy(this.body.position as any);
        model.rotation.y = 0;
        
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
        
        // Limiter le delta pour éviter les grands sauts de physique
        const limitedDelta = Math.min(delta, 1/30);
        
        this.updateVehicleControls(limitedDelta);
        this.applyAdvancedAerodynamics(limitedDelta);
        this.updateWheels();
        this.updateModel();
        this.updateDriftState();
    }

    private updateVehicleControls(delta: number): void {
        if (!this.vehicle) return;

        const maxSteerVal = Car.PHYSICS_CONFIG.MAX_STEER;
        const maxForce = Car.PHYSICS_CONFIG.MAX_FORCE;
        const brakeForce = Car.PHYSICS_CONFIG.BRAKE_FORCE;

        this.handleAcceleration(maxForce, delta);
        this.handleBraking(brakeForce, delta);
        this.handleSteering(maxSteerVal);
    }

    private handleAcceleration(maxForce: number, delta: number): void {
        if (!this.vehicle) return;

        // Calculer la force en fonction de la vitesse et du drift
        const speed = this.getSpeed();
        const speedFactor = Math.max(
            Car.VEHICLE_DYNAMICS.MIN_SPEED_FACTOR, 
            1 - speed / Car.VEHICLE_DYNAMICS.MAX_SPEED_KMH
        );
        
        // Ne pas multiplier la force de base par delta, seulement les variations
        const engineForce = maxForce * speedFactor;

        if (this.controls.isKeyPressed('s')) {
            const reverseForce = engineForce * Car.PHYSICS_CONFIG.REVERSE_POWER_RATIO;
            // Distribution plus équilibrée des forces en marche arrière
            this.vehicle.applyEngineForce(-reverseForce * 0.7, 2);
            this.vehicle.applyEngineForce(-reverseForce * 0.7, 3);
            this.vehicle.applyEngineForce(-reverseForce * 0.3, 0);
            this.vehicle.applyEngineForce(-reverseForce * 0.3, 1);
        } else if (this.controls.isKeyPressed('z')) {
            // Distribution plus équilibrée des forces en marche avant
            this.vehicle.applyEngineForce(engineForce * 0.7, 2);
            this.vehicle.applyEngineForce(engineForce * 0.7, 3);
            this.vehicle.applyEngineForce(engineForce * 0.3, 0);
            this.vehicle.applyEngineForce(engineForce * 0.3, 1);
        } else {
            // Pour le frein moteur, nous gardons le delta car c'est une force qui s'accumule
            const engineBrakeForce = Math.min(this.getSpeed() * Car.PHYSICS_CONFIG.ENGINE_BRAKE_FACTOR, maxForce * 0.3);
            // Distribution plus équilibrée du frein moteur
            this.vehicle.applyEngineForce(-engineBrakeForce * Math.sign(this.body!.velocity.z) * 0.7, 2);
            this.vehicle.applyEngineForce(-engineBrakeForce * Math.sign(this.body!.velocity.z) * 0.7, 3);
            this.vehicle.applyEngineForce(-engineBrakeForce * Math.sign(this.body!.velocity.z) * 0.3, 0);
            this.vehicle.applyEngineForce(-engineBrakeForce * Math.sign(this.body!.velocity.z) * 0.3, 1);
        }
    }

    private handleBraking(brakeForce: number, delta: number): void {
        if (!this.vehicle) return;

        if (this.controls.isKeyPressed('space')) {
            // Application du frein à main
            // Fort freinage sur les roues arrière
            this.vehicle.setBrake(brakeForce * Car.DRIFT_CONFIG.REAR_BRAKE_FORCE, 2);
            this.vehicle.setBrake(brakeForce * Car.DRIFT_CONFIG.REAR_BRAKE_FORCE, 3);
            
            // Réduire la friction des roues arrière pendant le frein à main
            this.vehicle.wheelInfos[2].frictionSlip = Car.DRIFT_CONFIG.REAR_FRICTION_HANDBRAKE;
            this.vehicle.wheelInfos[3].frictionSlip = Car.DRIFT_CONFIG.REAR_FRICTION_HANDBRAKE;

            // Pas de freinage sur les roues avant pour garder le contrôle
            this.vehicle.setBrake(0, 0);
            this.vehicle.setBrake(0, 1);

            // Annuler la force moteur pendant le freinage
            this.vehicle.applyEngineForce(0, 2);
            this.vehicle.applyEngineForce(0, 3);
        } else {
            // Rétablir la friction normale des roues
            this.vehicle.wheelInfos[0].frictionSlip = Car.DRIFT_CONFIG.FRONT_FRICTION;
            this.vehicle.wheelInfos[1].frictionSlip = Car.DRIFT_CONFIG.FRONT_FRICTION;
            this.vehicle.wheelInfos[2].frictionSlip = Car.DRIFT_CONFIG.REAR_FRICTION_NORMAL;
            this.vehicle.wheelInfos[3].frictionSlip = Car.DRIFT_CONFIG.REAR_FRICTION_NORMAL;

            // Relâcher tous les freins
            for (let i = 0; i < 4; i++) {
                this.vehicle.setBrake(0, i);
            }
        }

        // Détection du drift basée sur l'impulsion latérale des roues arrière
        if (this.vehicle.wheelInfos.length >= 4) {
            const leftRear = this.vehicle.wheelInfos[2];
            const rightRear = this.vehicle.wheelInfos[3];
            this.isDriftDetected = Math.abs(leftRear.sideImpulse) > 5 || Math.abs(rightRear.sideImpulse) > 5;
        }
    }

    private handleSteering(maxSteer: number): void {
        if (!this.vehicle) return;

        // Ajuster le facteur de vitesse pour le braquage de manière plus progressive
        const speed = this.getSpeed();
        const speedFactor = Math.max(
            Car.VEHICLE_DYNAMICS.MIN_STEERING_FACTOR,
            Math.pow(
                1 - (speed / Car.VEHICLE_DYNAMICS.MAX_STEERING_SPEED_KMH),
                Car.VEHICLE_DYNAMICS.STEERING_POWER_FACTOR
            )
        );
        const currentMaxSteer = maxSteer * speedFactor;

        let targetSteering = 0;
        if (this.controls.isKeyPressed('q')) {
            targetSteering = currentMaxSteer;
        } else if (this.controls.isKeyPressed('d')) {
            targetSteering = -currentMaxSteer;
        }

        // Modifier la physique du véhicule pour des virages plus réalistes
        if (this.body) {
            // Augmenter la résistance au roulement en virage
            const turnResistance = Math.abs(targetSteering) * speed * 
                Car.VEHICLE_DYNAMICS.TURN_RESISTANCE_FACTOR;
            this.body.angularDamping = Car.VEHICLE_DYNAMICS.BASE_ANGULAR_DAMPING + turnResistance;
            
            // Ajouter une légère résistance latérale
            if (speed > Car.VEHICLE_DYNAMICS.MIN_SPEED_FOR_LATERAL_RESISTANCE) {
                const lateralVelocity = new CANNON.Vec3();
                this.body.vectorToLocalFrame(this.body.velocity, lateralVelocity);
                const lateralResistance = Math.abs(lateralVelocity.x) * 
                    Car.VEHICLE_DYNAMICS.LATERAL_RESISTANCE_FACTOR;
                this.body.linearDamping = Car.VEHICLE_DYNAMICS.BASE_LINEAR_DAMPING + 
                    lateralResistance;
            }
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
            // Appliquer un lissage à la position
            const targetPosition = new THREE.Vector3(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
            this.model.position.lerp(targetPosition, 0.8);
            
            // Appliquer un lissage à la rotation
            const targetQuaternion = new THREE.Quaternion(
                this.body.quaternion.x,
                this.body.quaternion.y,
                this.body.quaternion.z,
                this.body.quaternion.w
            );
            this.model.quaternion.slerp(targetQuaternion, 0.8);
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

    private applyAdvancedAerodynamics(delta: number): void {
        if (!this.body || !this.vehicle) return;
        
        const speed = this.getSpeed();
        if (speed < Car.AERODYNAMICS_CONFIG.SPEED_THRESHOLD) return;

        const speedSquared = speed * speed;
        const velocity = this.body.velocity;
        const forward = new CANNON.Vec3(0, 0, 1);
        this.body.vectorToWorldFrame(forward, forward);

        // Downforce
        const downforce = speedSquared * Car.AERODYNAMICS_CONFIG.DOWNFORCE_FACTOR;
        this.body.applyLocalForce(
            new CANNON.Vec3(0, -downforce, 0),
            new CANNON.Vec3(0, 0, 0)
        );

        // Ground effect (plus la voiture est proche du sol, plus la downforce est importante)
        const groundEffect = Math.max(0, 1 - this.body.position.y) * 
            speedSquared * Car.AERODYNAMICS_CONFIG.GROUND_EFFECT_FACTOR;
        this.body.applyLocalForce(
            new CANNON.Vec3(0, -groundEffect, 0),
            new CANNON.Vec3(0, 0, 0)
        );

        // Air resistance
        const airResistance = speedSquared * Car.AERODYNAMICS_CONFIG.AIR_RESISTANCE_FACTOR;
        const resistanceForce = new CANNON.Vec3(
            -velocity.x * airResistance,
            -velocity.y * airResistance,
            -velocity.z * airResistance
        );
        this.body.applyForce(resistanceForce, this.body.position);

        // Lift force (légère force de portance)
        const lift = speedSquared * Car.AERODYNAMICS_CONFIG.LIFT_FACTOR;
        this.body.applyLocalForce(
            new CANNON.Vec3(0, lift, 0),
            new CANNON.Vec3(0, 0, 0)
        );

        // Turbulence (effet aléatoire pour plus de réalisme)
        const turbulence = (Math.random() - 0.5) * 
            speedSquared * Car.AERODYNAMICS_CONFIG.TURBULENCE_FACTOR;
        this.body.applyLocalForce(
            new CANNON.Vec3(turbulence, 0, turbulence),
            new CANNON.Vec3(0, 0, 0)
        );

        // Wind resistance (résistance au vent latéral)
        const windResistance = speedSquared * Car.AERODYNAMICS_CONFIG.WIND_RESISTANCE;
        this.body.applyLocalForce(
            new CANNON.Vec3(-velocity.x * windResistance, 0, 0),
            new CANNON.Vec3(0, 0, 0)
        );
    }

    private updateDriftState(): void {
        if (!this.body || !this.vehicle) return;

        const speed = this.getSpeed();
        const angularVelocity = this.body.angularVelocity.y;
        const lateralVelocity = Math.abs(this.body.velocity.x);
        const forwardVelocity = Math.abs(this.body.velocity.z);

        // Détection du drift basée sur plusieurs facteurs
        const isDrifting = 
            speed > Car.DRIFT_CONFIG.DRIFT_INITIATION_SPEED && 
            Math.abs(angularVelocity) > Car.DRIFT_CONFIG.DRIFT_ANGLE_THRESHOLD &&
            lateralVelocity > 5 &&
            this.controls.isKeyPressed('space');

        // Transition progressive entre l'état normal et le drift
        if (isDrifting && !this.isDriftDetected) {
            this.isDriftDetected = true;
            this.applyDriftPhysics();
        } else if (!isDrifting && this.isDriftDetected) {
            this.isDriftDetected = false;
            this.restoreNormalPhysics();
        }

        // Ajustement continu des paramètres pendant le drift
        if (this.isDriftDetected) {
            this.updateDriftPhysics(speed, angularVelocity, lateralVelocity);
        }
    }

    private applyDriftPhysics(): void {
        if (!this.vehicle) return;

        // Appliquer les paramètres de drift
        this.wheelBodies.forEach((wheel: CANNON.Body, index: number) => {
            if (index >= 2 && wheel.material) { // Roues arrière
                wheel.material.friction = Car.DRIFT_CONFIG.REAR_FRICTION_HANDBRAKE;
            }
        });

        // Augmenter le couple moteur pendant le drift
        if (this.body) {
            this.body.angularDamping *= Car.DRIFT_CONFIG.DRIFT_STABILITY_FACTOR;
        }
    }

    private restoreNormalPhysics(): void {
        if (!this.vehicle) return;

        // Restaurer les paramètres normaux
        this.wheelBodies.forEach((wheel: CANNON.Body, index: number) => {
            if (index >= 2 && wheel.material) { // Roues arrière
                wheel.material.friction = Car.DRIFT_CONFIG.REAR_FRICTION_NORMAL;
            }
        });

        // Restaurer l'amortissement angulaire
        if (this.body) {
            this.body.angularDamping = Car.VEHICLE_DYNAMICS.BASE_ANGULAR_DAMPING;
        }
    }

    private updateDriftPhysics(speed: number, angularVelocity: number, lateralVelocity: number): void {
        if (!this.vehicle || !this.body) return;

        // Ajuster la direction en fonction de la vitesse et de l'angle de drift
        const driftSteeringMultiplier = Math.min(
            1 + (speed / Car.DRIFT_CONFIG.DRIFT_INITIATION_SPEED),
            Car.DRIFT_CONFIG.DRIFT_STEERING_MULTIPLIER
        );

        // Appliquer un couple de correction pour maintenir le drift
        const correctionTorque = -angularVelocity * Car.DRIFT_CONFIG.DRIFT_STABILITY_FACTOR;
        this.body.applyTorque(new CANNON.Vec3(0, correctionTorque, 0));

        // Ajuster la friction en fonction de la vitesse latérale
        // Utiliser une courbe plus douce pour la friction latérale
        const lateralFrictionFactor = Math.max(
            0.3, // Augmenté pour un meilleur contrôle
            1 - (lateralVelocity / speed) * Car.DRIFT_CONFIG.DRIFT_MOMENTUM_FACTOR
        );

        // Appliquer une force de propulsion supplémentaire pendant le drift pour conserver l'élan
        if (this.controls.isKeyPressed('z')) {
            const forwardForce = new CANNON.Vec3(0, 0, 10 * speed / Car.DRIFT_CONFIG.DRIFT_INITIATION_SPEED);
            this.body.applyLocalForce(forwardForce, new CANNON.Vec3(0, 0, 0));
        }

        this.wheelBodies.forEach((wheel: CANNON.Body, index: number) => {
            if (index >= 2 && wheel.material) { // Roues arrière
                wheel.material.friction = Car.DRIFT_CONFIG.REAR_FRICTION_HANDBRAKE * lateralFrictionFactor;
            }
        });
    }
} 