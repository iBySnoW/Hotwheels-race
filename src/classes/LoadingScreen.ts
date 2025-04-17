export class LoadingScreen {
    private container: HTMLDivElement;
    private onPlayCallback: () => void;
    private progressBar!: HTMLDivElement;
    private progressFill!: HTMLDivElement;
    private progressText!: HTMLDivElement;
    private playButton!: HTMLButtonElement;
    private isLoading: boolean = false;

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

        // Créer la barre de progression
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        
        this.progressFill = document.createElement('div');
        this.progressFill.className = 'progress-fill';
        
        this.progressText = document.createElement('div');
        this.progressText.className = 'progress-text';
        this.progressText.textContent = '0%';
        
        this.progressBar.appendChild(this.progressFill);
        progressContainer.appendChild(this.progressBar);
        progressContainer.appendChild(this.progressText);
        
        // Cacher la barre de progression initialement
        progressContainer.style.display = 'none';

        this.playButton = document.createElement('button');
        this.playButton.className = 'play-button';
        this.playButton.textContent = 'Jouer';
        this.playButton.addEventListener('click', () => this.startGame());

        content.appendChild(title);
        content.appendChild(carContainer);
        content.appendChild(progressContainer);
        content.appendChild(this.playButton);
        this.container.appendChild(content);
        document.body.appendChild(this.container);
    }

    public hide() {
        this.container.classList.add('hidden');
        setTimeout(() => {
            this.container.remove();
        }, 500);
    }

    public showLoadingState() {
        this.isLoading = true;
        this.playButton.style.display = 'none';
        const progressContainer = this.container.querySelector('.progress-container');
        if (progressContainer) {
            (progressContainer as HTMLElement).style.display = 'block';
        }
    }

    public updateProgress(progress: number) {
        if (!this.isLoading) return;
        
        const percentage = Math.min(Math.max(Math.round(progress * 100), 0), 100);
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${percentage}%`;
        
        // Si le chargement est terminé, cacher l'écran de chargement
        if (percentage >= 100) {
            setTimeout(() => {
                this.hide();
            }, 500);
        }
    }

    private startGame() {
        this.showLoadingState();
        this.onPlayCallback();
    }
} 