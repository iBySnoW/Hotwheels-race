import { CarConfig } from "./CarConfig";

export interface SceneConfig {
    car: CarConfig;
    renderer: {
        antialias: boolean;
        pixelRatio: number;
        shadowMap: boolean;
    };
    controls: {
        enableDamping: boolean;
        dampingFactor: number;
        minDistance: number;
        maxDistance: number;
        rotateSpeed: number;
        zoomSpeed: number;
    };
    environment: {
        groundSize: number;
        groundColor: number;
        groundY: number;
    };
}

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
    car: {
        maxSpeed: 30,        // Vitesse maximale en m/s
        acceleration: 1,     // Accélération en m/s²
        deceleration: 0.5,   // Décélération en m/s²
        rotationSpeed: 0.1,  // Vitesse de rotation en rad/s
        position: {
            x: 0,
            y: 20,
            z: 0
        }
    },
    renderer: {
        antialias: true,
        pixelRatio: 2,
        shadowMap: true
    },
    controls: {
        enableDamping: true,
        dampingFactor: 0.05,
        minDistance: 5,
        maxDistance: 50,
        rotateSpeed: 1.0,
        zoomSpeed: 1.0
    },
    environment: {
        groundSize: 100,     // Sol plus grand
        groundColor: 0x808080, // Couleur grise plus réaliste
        groundY: 0
    }
}; 