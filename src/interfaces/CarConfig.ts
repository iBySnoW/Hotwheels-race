export interface CarConfig {
    maxSpeed: number;
    acceleration: number;
    deceleration: number;
    rotationSpeed: number;
    position?: {
        x: number;
        y: number;
        z: number;
    };
}

export const DEFAULT_CAR_CONFIG: CarConfig = {
    maxSpeed: 0.3,
    acceleration: 0.01,
    deceleration: 0.001,
    rotationSpeed: 0.03,
    position: {
        x: 0,
        y: 0,
        z: 0
    }
}; 