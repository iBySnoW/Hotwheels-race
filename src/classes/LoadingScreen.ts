export class LoadingScreen {
    private container: HTMLDivElement;
    private onPlayCallback: () => void;

    constructor(onPlay: () => void) {
        this.onPlayCallback = onPlay;
        this.container = document.createElement('div');
        this.container.className = 'loading-screen';
        this.initialize();
    }

    private initialize() {
        const content = document.createElement('div');
        content.className = 'loading-content';

        const title = document.createElement('h1');
        title.className = 'loading-title';
        title.textContent = 'Hot Wheels Drift Race';

        const carContainer = document.createElement('div');
        carContainer.className = 'loading-car';
        const carImage = document.createElement('img');
        carImage.src = '/car.png';
        carImage.alt = 'Hot Wheels Car';
        carContainer.appendChild(carImage);

        const playButton = document.createElement('button');
        playButton.className = 'play-button';
        playButton.textContent = 'Jouer';
        playButton.addEventListener('click', () => this.startGame());

        content.appendChild(title);
        content.appendChild(carContainer);
        content.appendChild(playButton);
        this.container.appendChild(content);
        document.body.appendChild(this.container);
    }

    public hide() {
        this.container.classList.add('hidden');
        setTimeout(() => {
            this.container.remove();
        }, 500);
    }

    private startGame() {
        this.hide();
        this.onPlayCallback();
    }
} 