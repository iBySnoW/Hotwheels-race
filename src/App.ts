import { Scene } from "./Scene/scene";

class App {
    private scene: Scene;

    constructor() {
        this.scene = new Scene();
    }
}

new App();