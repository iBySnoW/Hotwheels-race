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
    }
}

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
    car: {
        maxSpeed: 50,        // Augmenté de 30 à 50 m/s (~180 km/h)
        acceleration: 8,     // Augmenté de 3 à 8 m/s²
        deceleration: 1,     // Augmenté de 0.5 à 1
        rotationSpeed: 0.2,  // Doublé de 0.1 à 0.2
        position: {
            x: 0,
            y:5,
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
    }
}; 