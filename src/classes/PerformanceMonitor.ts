import * as THREE from 'three';

export class PerformanceMonitor {
    private renderer: THREE.WebGLRenderer | null = null;
    private lastTime: number = performance.now();
    private frameCount: number = 0;
    private fps: number = 0;
    private frameTime: number = 0;
    private physicsTime: number = 0;
    private renderStats: {
        drawCalls: number;
        triangles: number;
        points: number;
        lines: number;
    } = {
        drawCalls: 0,
        triangles: 0,
        points: 0,
        lines: 0
    };

    constructor() {
        this.lastTime = performance.now();
    }

    public setRenderer(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
    }

    public update(deltaTime: number, physicsTime: number): void {
        this.frameCount++;
        this.frameTime = deltaTime * 1000; // Convert to milliseconds
        this.physicsTime = physicsTime;

        // Update FPS every second
        const currentTime = performance.now();
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;

            // Update render stats if renderer is available
            if (this.renderer) {
                const info = this.renderer.info;
                this.renderStats = {
                    drawCalls: info.render.calls,
                    triangles: info.render.triangles,
                    points: info.render.points,
                    lines: info.render.lines
                };
            }

            // Log performance stats
            this.logStats();
        }
    }

    private logStats(): void {
        console.log(
            `Performance Stats:\n` +
            `FPS: ${this.fps}\n` +
            `Frame Time: ${this.frameTime.toFixed(2)}ms\n` +
            `Physics Time: ${this.physicsTime.toFixed(2)}ms\n` +
            `Draw Calls: ${this.renderStats.drawCalls}\n` +
            `Triangles: ${this.renderStats.triangles}\n` +
            `Points: ${this.renderStats.points}\n` +
            `Lines: ${this.renderStats.lines}`
        );
    }

    public getStats(): {
        fps: number;
        frameTime: number;
        physicsTime: number;
        renderStats: {
            drawCalls: number;
            triangles: number;
            points: number;
            lines: number;
        };
    } {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            physicsTime: this.physicsTime,
            renderStats: { ...this.renderStats }
        };
    }
} 