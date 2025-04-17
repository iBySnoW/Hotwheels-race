import * as THREE from 'three';
import { Car } from './Car';

export class Speedometer {
    private car: Car;
    private speedText: HTMLDivElement;
    private speedValue: number = 0;

    constructor(car: Car) {
        this.car = car;
        
        // Créer l'élément HTML pour afficher la vitesse
        this.speedText = document.createElement('div');
        this.speedText.style.position = 'fixed';
        this.speedText.style.bottom = '20px';
        this.speedText.style.right = '50%';
        this.speedText.style.color = '#ffffff';
        this.speedText.style.fontSize = '36px';
        this.speedText.style.fontFamily = 'Arial, sans-serif';
        this.speedText.style.fontWeight = 'bold';
        this.speedText.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
        this.speedText.style.padding = '15px 25px';
        this.speedText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.speedText.style.borderRadius = '15px';
        this.speedText.style.zIndex = '1000';
        this.speedText.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        
        document.body.appendChild(this.speedText);
    }

    public update(): void {
        // Convertir la vitesse de m/s en km/h (1 m/s = 3.6 km/h)
        const speedKmh = Math.round(this.car.getSpeed() * 3.6);
        
        // Mettre à jour l'affichage seulement si la vitesse a changé
        if (this.speedValue !== speedKmh) {
            this.speedValue = speedKmh;
            this.speedText.textContent = `${speedKmh} KM/H`;
        }
    }

    public dispose(): void {
        // Nettoyer l'élément HTML lors de la destruction
        if (this.speedText.parentNode) {
            this.speedText.parentNode.removeChild(this.speedText);
        }
    }
} 