export class CarControls {
    private keys: { [key: string]: boolean } = {};
    private isEnabled: boolean = true;

    constructor() {
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (event) => {
            if (this.isEnabled) {
                const normalizedKey = this.normalizeKey(event.key);
                this.keys[normalizedKey] = true;
            }
        });

        window.addEventListener('keyup', (event) => {
            if (this.isEnabled) {
                const normalizedKey = this.normalizeKey(event.key);
                this.keys[normalizedKey] = false;
            }
        });
    }

    /**
     * Normalise les touches pour assurer une cohérence dans la détection
     * @param key La touche à normaliser
     * @returns La touche normalisée
     */
    private normalizeKey(key: string): string {
        // Convertir en minuscules
        const lowerKey = key.toLowerCase();
        
        // Normaliser la touche espace
        if (lowerKey === ' ' || lowerKey === 'space') {
            return 'space';
        }
        
        return lowerKey;
    }

    /**
     * Vérifie si une touche est pressée
     * @param key La touche à vérifier (peut être ' ' ou 'space' pour la touche espace)
     * @returns true si la touche est pressée, false sinon
     */
    public isKeyPressed(key: string): boolean {
        const normalizedKey = this.normalizeKey(key);
        return this.keys[normalizedKey] || false;
    }

    public enable(): void {
        this.isEnabled = true;
    }

    public disable(): void {
        this.isEnabled = false;
        // Reset all keys when disabled
        this.keys = {};
    }
} 