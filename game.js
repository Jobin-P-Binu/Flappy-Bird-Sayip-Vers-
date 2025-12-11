/* Game Constants */
const CONSTANTS = {
    GRAVITY: 0.25,
    FLAP_STRENGTH: -6, // Jump power
    PIPE_SPEED: 3,
    PIPE_SPAWN_RATE: 100, // Frames
    PIPE_GAP: 200,
    WIND_CHANGE_INTERVAL: 300, // Frames (approx 5 seconds)
    MAX_WIND_FORCE: 2
};

/* Assets */
const birdImage = new Image();
birdImage.src = 'Assets/bird_spritesheet.png';

const bgm = document.getElementById('bgm');

/* Game State */
let canvas, ctx;
let frames = 0;
let score = 0;
let highScore = 0;
let gameRunning = false;
let gameOver = false;

/* Game Objects */
let bird;
let pipes = [];
let wind = { x: 0, y: 0 };

class Bird {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = 100;
        this.y = 200;
        this.velocity = 0;
        this.drift = 0; // Horizontal drift from wind

        // Animation Props
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.animationSpeed = 10; // Switch frame every 10 ticks
        this.totalFrames = 3;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        // Rotate based on velocity
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(rotation);

        if (birdImage.complete && birdImage.naturalWidth > 0) {
            const frameWidth = birdImage.naturalWidth / this.totalFrames;
            const frameHeight = birdImage.naturalHeight;

            ctx.drawImage(
                birdImage,
                this.frameIndex * frameWidth, 0, frameWidth, frameHeight, // Source
                -this.width / 2, -this.height / 2, this.width, this.height // Destination
            );
        } else {
            // Fallback
            ctx.fillStyle = 'yellow';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.restore();
    }

    update() {
        // Animation Logic
        this.frameTimer++;
        if (this.frameTimer >= this.animationSpeed) {
            this.frameTimer = 0;
            this.frameIndex = (this.frameIndex + 1) % this.totalFrames;
        }

        // Apply Gravity
        this.velocity += CONSTANTS.GRAVITY;

        // Apply Wind to Velocity (Vertical wind effect)
        this.velocity += wind.y * 0.05;

        // Apply Velocity
        this.y += this.velocity;

        // Apply Horizontal Wind Drift
        this.x += wind.x;
        // Clamp X position
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;

        // Floor Collision
        if (this.y + this.height >= canvas.height) {
            this.y = canvas.height - this.height;
            endGame();
        }

        // Ceiling Collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    flap() {
        this.velocity = CONSTANTS.FLAP_STRENGTH;
    }
}

class Pipe {
    constructor() {
        this.width = 60;
        this.x = canvas.width;
        this.topHeight = Math.floor(Math.random() * (canvas.height - CONSTANTS.PIPE_GAP - 100)) + 50;
        this.bottomY = this.topHeight + CONSTANTS.PIPE_GAP;
        this.passed = false;
    }

    draw() {
        ctx.fillStyle = '#2ecc71'; // Green pipe
        // Top Pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Bottom Pipe
        ctx.fillRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY);

        // Outline
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, 0, this.width, this.topHeight);
        ctx.strokeRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY);
    }

    update() {
        this.x -= CONSTANTS.PIPE_SPEED;
    }
}

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Resize handler
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Input
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') handleInput();
    });
    window.addEventListener('mousedown', handleInput);
    window.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling
        handleInput();
    }, { passive: false });

    // UI Buttons
    document.getElementById('restart-btn').addEventListener('click', resetGame);

    resetGame();
    loop();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function handleInput() {
    if (gameOver) return;

    if (!gameRunning) {
        gameRunning = true;
        bird.flap(); // First flap to start
        playBGM();
    } else {
        bird.flap();
    }
}

function playBGM() {
    if (bgm) {
        bgm.play().catch(e => console.log("Audio play failed interaction required"));
    }
}

function stopBGM() {
    if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
    }
}

function resetGame() {
    bird = new Bird();
    pipes = [];
    score = 0;
    frames = 0;
    gameRunning = false;
    gameOver = false;
    wind = { x: 0, y: 0 };

    document.getElementById('score-display').innerText = score;
    document.getElementById('game-over-screen').style.display = 'none';
    updateWindIndicator();
    stopBGM();
    const gameOverMusic = document.getElementById('game-over-music');
    if (gameOverMusic) {
        gameOverMusic.pause();
        gameOverMusic.currentTime = 0;
    }
}

function updateWindSystem() {
    if (frames % CONSTANTS.WIND_CHANGE_INTERVAL === 0) {
        // Random wind
        // x: -2 to 2
        // y: -1 to 1 (Updraft/Downdraft)
        wind.x = (Math.random() * CONSTANTS.MAX_WIND_FORCE * 2) - CONSTANTS.MAX_WIND_FORCE;
        wind.y = (Math.random() * 2) - 1; // Slight vertical wind

        updateWindIndicator();
    }
}

function updateWindIndicator() {
    const arrow = document.getElementById('wind-arrow');
    const text = document.getElementById('wind-text');

    // Calculate angle for arrow
    // atan2(y, x) -> result in radians
    const angle = Math.atan2(wind.y, wind.x);
    arrow.style.transform = `rotate(${angle}rad)`;

    // Strength string
    const strength = Math.abs(wind.x).toFixed(1);
    const dirStr = wind.x > 0 ? "Right" : (wind.x < 0 ? "Left" : "Calm");

    text.innerText = `Wind: ${strength} (${dirStr})`;
}

function checkCollisions() {
    // Pipe Collision
    for (let pipe of pipes) {
        // Horizontal overlap
        if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipe.width) {
            // Vertical check (hit top or bottom pipe)
            if (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY) {
                endGame();
            }
        }
    }
}

function endGame() {
    if (gameOver) return;
    gameOver = true;
    gameRunning = false;

    stopBGM();
    const gameOverMusic = document.getElementById('game-over-music');
    if (gameOverMusic) {
        gameOverMusic.currentTime = 0;
        gameOverMusic.play().catch(e => console.log("Game over audio play failed"));
    }

    document.getElementById('final-score').innerText = `Score: ${score}`;
    document.getElementById('game-over-screen').style.display = 'block';
}

function loop() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameRunning && !gameOver) {
        frames++;

        // Update Wind
        updateWindSystem();

        // Update Bird
        bird.update();

        // Pipe Mangement
        if (frames % CONSTANTS.PIPE_SPAWN_RATE === 0) {
            pipes.push(new Pipe());
        }

        for (let i = 0; i < pipes.length; i++) {
            pipes[i].update();

            // Score
            if (!pipes[i].passed && pipes[i].x + pipes[i].width < bird.x) {
                score++;
                pipes[i].passed = true;
                document.getElementById('score-display').innerText = score;
            }

            // Remove off-screen
            if (pipes[i].x + pipes[i].width < 0) {
                pipes.splice(i, 1);
                i--;
            }
        }

        checkCollisions();
    } else if (!gameRunning && !gameOver) {
        // Idle animation or "Press to Start"
        // Keep bird floating
        bird.y = canvas.height / 2 + Math.sin(Date.now() / 300) * 10;
        bird.velocity = 0;
    }

    // Draw
    for (let pipe of pipes) pipe.draw();
    bird.draw();

    requestAnimationFrame(loop);
}

// Start
init();
