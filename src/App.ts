import { Scene } from "./Scene/scene";
import { LoadingScreen } from "./classes/LoadingScreen";

class App {
    private scene: Scene | null = null;
    private loadingScreen: LoadingScreen;

    constructor() {
        this.loadingScreen = new LoadingScreen(() => this.startGame());
    }

    private startGame() {
        // Initialiser la scène seulement quand le joueur clique sur "Jouer"
        this.scene = new Scene();
    }
}

new App();