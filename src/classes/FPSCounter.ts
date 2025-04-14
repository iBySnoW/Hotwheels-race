export class FPSCounter {
    private container: HTMLDivElement;
    private fpsElement: HTMLDivElement;
    private frames: number = 0;
    private lastTime: number = performance.now();
    private currentFps: number = 0;

    constructor() {
        // Créer le conteneur
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.container.style.padding = '5px 10px';
        this.container.style.borderRadius = '5px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Racing Sans One, monospace';
        this.container.style.fontSize = '16px';
        this.container.style.zIndex = '1000';

        // Créer l'élément pour les FPS
        this.fpsElement = document.createElement('div');
        this.container.appendChild(this.fpsElement);
        document.body.appendChild(this.container);
    }

    public update(): void {
        this.frames++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;

        // Mettre à jour les FPS chaque seconde
        if (elapsed >= 1000) {
            this.currentFps = Math.round((this.frames * 1000) / elapsed);
            this.fpsElement.textContent = `FPS: ${this.currentFps}`;
            this.frames = 0;
            this.lastTime = currentTime;
        }
    }

    public getCurrentFPS(): number {
        return this.currentFps;
    }

    public hide(): void {
        this.container.style.display = 'none';
    }

    public show(): void {
        this.container.style.display = 'block';
    }
} 