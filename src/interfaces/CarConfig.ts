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
    maxSpeed: 30,        // Vitesse maximale en m/s
    acceleration: 1,     // Accélération en m/s²
    deceleration: 0.5,   // Décélération en m/s²
    rotationSpeed: 0.1,  // Vitesse de rotation en rad/s
    position: {
        x: 0,
        y: 1,
        z: 0
    }
}; 