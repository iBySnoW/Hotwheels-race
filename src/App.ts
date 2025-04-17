import { Scene } from "./Scene/scene";
import { LoadingScreen } from "./classes/LoadingScreen";

class App {
    private scene: Scene | null = null;
    private loadingScreen: LoadingScreen;

    constructor() {
        this.loadingScreen = new LoadingScreen(() => this.startGame());
    }

    private startGame() {
        // Initialiser la scène avec un callback pour suivre la progression du chargement
        this.scene = new Scene({}, (progress) => {
            // Mettre à jour la barre de progression
            this.loadingScreen.updateProgress(progress);
        });
    }
}

new App();