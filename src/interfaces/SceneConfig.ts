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
        maxSpeed: 0.3,
        acceleration: 0.01,
        deceleration: 0.001,
        rotationSpeed: 0.03,
        position: {
            x: -6,
            y: 0,
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
        groundSize: 25,
        groundColor: 0xffff00,
        groundY: 0
    }
}; 