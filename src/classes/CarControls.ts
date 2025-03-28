export class CarControls {
    private keys: { [key: string]: boolean } = {};
    private isEnabled: boolean = true;

    constructor() {
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (event) => {
            if (this.isEnabled) {
                this.keys[event.key.toLowerCase()] = true;
            }
        });

        window.addEventListener('keyup', (event) => {
            if (this.isEnabled) {
                this.keys[event.key.toLowerCase()] = false;
            }
        });
    }

    public isKeyPressed(key: string): boolean {
        return this.keys[key.toLowerCase()] || false;
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