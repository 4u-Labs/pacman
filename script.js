/**
 * Pac-Man Arcade Retro — 4U.IA.BR
 * Versão 2.0 com Web Audio API Nativo, D-Pad Touch, Swipe para Celular e High Score.
 */

/* Constantes de Direção e Estados */
const NONE        = 4,
      UP          = 3,
      LEFT        = 2,
      DOWN        = 1,
      RIGHT       = 11,
      WAITING     = 5,
      PAUSE       = 6,
      PLAYING     = 7,
      COUNTDOWN   = 8,
      EATEN_PAUSE = 9,
      DYING       = 10;

const Pacman = {};
Pacman.FPS = 30;

Pacman.WALL    = 0;
Pacman.BISCUIT = 1;
Pacman.EMPTY   = 2;
Pacman.BLOCK   = 3;
Pacman.PILL    = 4;

// ==========================================
// SISTEMA DE ÁUDIO NATIVO (Web Audio API)
// ==========================================
class PacAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('pacman_sound_disabled') === 'true';
        this.wakaAlt = false;
        this.introTimeout = null;
    }

    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type = 'square', duration = 0.1, gainVal = 0.15) {
        if (this.isMuted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    play(name) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        switch (name) {
            case 'start':
                this.playIntro();
                break;
            case 'eating':
            case 'eating2':
                this.playWaka();
                break;
            case 'eatpill':
                this.playPill();
                break;
            case 'eatghost':
                this.playGhostEat();
                break;
            case 'die':
                this.playDie();
                break;
        }
    }

    playWaka() {
        this.wakaAlt = !this.wakaAlt;
        const freq = this.wakaAlt ? 330 : 440;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq - 150, this.ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch (e) {}
    }

    playPill() {
        this.playTone(200, 'sine', 0.25, 0.3);
    }

    playGhostEat() {
        const notes = [300, 450, 600, 800, 1100];
        notes.forEach((f, idx) => {
            setTimeout(() => this.playTone(f, 'square', 0.08, 0.2), idx * 40);
        });
    }

    playDie() {
        const freqs = [600, 540, 480, 420, 360, 300, 240, 180, 120];
        freqs.forEach((f, idx) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.09, 0.2), idx * 60);
        });
    }

    playIntro() {
        // Melodia clássica do Pac-Man (arpeggios)
        const melody = [
            { f: 493.88, d: 0.12 }, { f: 987.77, d: 0.12 }, { f: 739.99, d: 0.12 }, { f: 622.25, d: 0.12 },
            { f: 987.77, d: 0.08 }, { f: 739.99, d: 0.16 }, { f: 622.25, d: 0.2 },
            { f: 523.25, d: 0.12 }, { f: 1046.50, d: 0.12 }, { f: 783.99, d: 0.12 }, { f: 659.25, d: 0.12 },
            { f: 1046.50, d: 0.08 }, { f: 783.99, d: 0.16 }, { f: 659.25, d: 0.2 },
            { f: 493.88, d: 0.12 }, { f: 987.77, d: 0.12 }, { f: 739.99, d: 0.12 }, { f: 622.25, d: 0.12 },
            { f: 987.77, d: 0.08 }, { f: 739.99, d: 0.16 }, { f: 622.25, d: 0.2 }
        ];

        let offset = 0;
        melody.forEach(note => {
            setTimeout(() => {
                if (!this.isMuted) this.playTone(note.f, 'square', note.d, 0.22);
            }, offset * 1000);
            offset += note.d + 0.03;
        });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('pacman_sound_disabled', this.isMuted);
        return this.isMuted;
    }

    pause() {}
    resume() {}
    disableSound() { this.isMuted = true; }
}

// ==========================================
// MAPA E LABIRINTO DO PAC-MAN
// ==========================================
Pacman.MAP = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 4, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 4, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 3, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 2, 1, 1, 1, 0, 3, 3, 3, 0, 1, 1, 1, 2, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    [0, 4, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 4, 0],
    [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

Pacman.WALLS = [
    [{"move": [0, 9.5]}, {"line": [3, 9.5]}, {"curve": [3.5, 9.5, 3.5, 9]}, {"line": [3.5, 8]},
     {"curve": [3.5, 7.5, 3, 7.5]}, {"line": [1, 7.5]}, {"curve": [0.5, 7.5, 0.5, 7]}, {"line": [0.5, 1]},
     {"curve": [0.5, 0.5, 1, 0.5]}, {"line": [9, 0.5]}, {"curve": [9.5, 0.5, 9.5, 1]}, {"line": [9.5, 3.5]}],
    [{"move": [9.5, 1]}, {"curve": [9.5, 0.5, 10, 0.5]}, {"line": [18, 0.5]}, {"curve": [18.5, 0.5, 18.5, 1]},
     {"line": [18.5, 7]}, {"curve": [18.5, 7.5, 18, 7.5]}, {"line": [16, 7.5]}, {"curve": [15.5, 7.5, 15.5, 8]},
     {"line": [15.5, 9]}, {"curve": [15.5, 9.5, 16, 9.5]}, {"line": [19, 9.5]}],
    [{"move": [2.5, 5.5]}, {"line": [3.5, 5.5]}],
    [{"move": [3, 2.5]}, {"curve": [3.5, 2.5, 3.5, 3]}, {"curve": [3.5, 3.5, 3, 3.5]}, {"curve": [2.5, 3.5, 2.5, 3]}, {"curve": [2.5, 2.5, 3, 2.5]}],
    [{"move": [15.5, 5.5]}, {"line": [16.5, 5.5]}],
    [{"move": [16, 2.5]}, {"curve": [16.5, 2.5, 16.5, 3]}, {"curve": [16.5, 3.5, 16, 3.5]}, {"curve": [15.5, 3.5, 15.5, 3]}, {"curve": [15.5, 2.5, 16, 2.5]}],
    [{"move": [6, 2.5]}, {"line": [7, 2.5]}, {"curve": [7.5, 2.5, 7.5, 3]}, {"curve": [7.5, 3.5, 7, 3.5]}, {"line": [6, 3.5]}, {"curve": [5.5, 3.5, 5.5, 3]}, {"curve": [5.5, 2.5, 6, 2.5]}],
    [{"move": [12, 2.5]}, {"line": [13, 2.5]}, {"curve": [13.5, 2.5, 13.5, 3]}, {"curve": [13.5, 3.5, 13, 3.5]}, {"line": [12, 3.5]}, {"curve": [11.5, 3.5, 11.5, 3]}, {"curve": [11.5, 2.5, 12, 2.5]}],
    [{"move": [7.5, 5.5]}, {"line": [9, 5.5]}, {"curve": [9.5, 5.5, 9.5, 6]}, {"line": [9.5, 7.5]}],
    [{"move": [9.5, 6]}, {"curve": [9.5, 5.5, 10.5, 5.5]}, {"line": [11.5, 5.5]}],
    [{"move": [5.5, 5.5]}, {"line": [5.5, 7]}, {"curve": [5.5, 7.5, 6, 7.5]}, {"line": [7.5, 7.5]}],
    [{"move": [6, 7.5]}, {"curve": [5.5, 7.5, 5.5, 8]}, {"line": [5.5, 9.5]}],
    [{"move": [13.5, 5.5]}, {"line": [13.5, 7]}, {"curve": [13.5, 7.5, 13, 7.5]}, {"line": [11.5, 7.5]}],
    [{"move": [13, 7.5]}, {"curve": [13.5, 7.5, 13.5, 8]}, {"line": [13.5, 9.5]}],
    [{"move": [0, 11.5]}, {"line": [3, 11.5]}, {"curve": [3.5, 11.5, 3.5, 12]}, {"line": [3.5, 13]}, {"curve": [3.5, 13.5, 3, 13.5]}, {"line": [1, 13.5]}, {"curve": [0.5, 13.5, 0.5, 14]}, {"line": [0.5, 17]}, {"curve": [0.5, 17.5, 1, 17.5]}, {"line": [1.5, 17.5]}],
    [{"move": [1, 17.5]}, {"curve": [0.5, 17.5, 0.5, 18]}, {"line": [0.5, 21]}, {"curve": [0.5, 21.5, 1, 21.5]}, {"line": [18, 21.5]}, {"curve": [18.5, 21.5, 18.5, 21]}, {"line": [18.5, 18]}, {"curve": [18.5, 17.5, 18, 17.5]}, {"line": [17.5, 17.5]}],
    [{"move": [18, 17.5]}, {"curve": [18.5, 17.5, 18.5, 17]}, {"line": [18.5, 14]}, {"curve": [18.5, 13.5, 18, 13.5]}, {"line": [16, 13.5]}, {"curve": [15.5, 13.5, 15.5, 13]}, {"line": [15.5, 12]}, {"curve": [15.5, 11.5, 16, 11.5]}, {"line": [19, 11.5]}],
    [{"move": [5.5, 11.5]}, {"line": [5.5, 13.5]}],
    [{"move": [13.5, 11.5]}, {"line": [13.5, 13.5]}],
    [{"move": [2.5, 15.5]}, {"line": [3, 15.5]}, {"curve": [3.5, 15.5, 3.5, 16]}, {"line": [3.5, 17.5]}],
    [{"move": [16.5, 15.5]}, {"line": [16, 15.5]}, {"curve": [15.5, 15.5, 15.5, 16]}, {"line": [15.5, 17.5]}],
    [{"move": [5.5, 15.5]}, {"line": [7.5, 15.5]}],
    [{"move": [11.5, 15.5]}, {"line": [13.5, 15.5]}],
    [{"move": [2.5, 19.5]}, {"line": [5, 19.5]}, {"curve": [5.5, 19.5, 5.5, 19]}, {"line": [5.5, 17.5]}],
    [{"move": [5.5, 19]}, {"curve": [5.5, 19.5, 6, 19.5]}, {"line": [7.5, 19.5]}],
    [{"move": [11.5, 19.5]}, {"line": [13, 19.5]}, {"curve": [13.5, 19.5, 13.5, 19]}, {"line": [13.5, 17.5]}],
    [{"move": [13.5, 19]}, {"curve": [13.5, 19.5, 14, 19.5]}, {"line": [16.5, 19.5]}],
    [{"move": [7.5, 13.5]}, {"line": [9, 13.5]}, {"curve": [9.5, 13.5, 9.5, 14]}, {"line": [9.5, 15.5]}],
    [{"move": [9.5, 14]}, {"curve": [9.5, 13.5, 10, 13.5]}, {"line": [11.5, 13.5]}],
    [{"move": [7.5, 17.5]}, {"line": [9, 17.5]}, {"curve": [9.5, 17.5, 9.5, 18]}, {"line": [9.5, 19.5]}],
    [{"move": [9.5, 18]}, {"curve": [9.5, 17.5, 10, 17.5]}, {"line": [11.5, 17.5]}],
    [{"move": [8.5, 9.5]}, {"line": [8, 9.5]}, {"curve": [7.5, 9.5, 7.5, 10]}, {"line": [7.5, 11]}, {"curve": [7.5, 11.5, 8, 11.5]},
     {"line": [11, 11.5]}, {"curve": [11.5, 11.5, 11.5, 11]}, {"line": [11.5, 10]}, {"curve": [11.5, 9.5, 11, 9.5]}, {"line": [10.5, 9.5]}]
];

function cloneMap(grid) {
    return grid.map(row => [...row]);
}

// ==========================================
// CLASSE PACMAN.MAP
// ==========================================
Pacman.Map = function (size) {
    let height = null,
        width = null,
        blockSize = size,
        pillSize = 0,
        map = null;

    function withinBounds(y, x) {
        return y >= 0 && y < height && x >= 0 && x < width;
    }

    function isWall(pos) {
        return withinBounds(pos.y, pos.x) && map[pos.y][pos.x] === Pacman.WALL;
    }

    function isFloorSpace(pos) {
        if (!withinBounds(pos.y, pos.x)) return false;
        const piece = map[pos.y][pos.x];
        return piece === Pacman.EMPTY || piece === Pacman.BISCUIT || piece === Pacman.PILL;
    }

    function drawWall(ctx) {
        ctx.strokeStyle = "#2121ff";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

        for (let i = 0; i < Pacman.WALLS.length; i++) {
            const line = Pacman.WALLS[i];
            ctx.beginPath();
            for (let j = 0; j < line.length; j++) {
                const p = line[j];
                if (p.move) ctx.moveTo(p.move[0] * blockSize, p.move[1] * blockSize);
                else if (p.line) ctx.lineTo(p.line[0] * blockSize, p.line[1] * blockSize);
                else if (p.curve) ctx.quadraticCurveTo(p.curve[0] * blockSize, p.curve[1] * blockSize, p.curve[2] * blockSize, p.curve[3] * blockSize);
            }
            ctx.stroke();
        }
    }

    function reset() {
        map = cloneMap(Pacman.MAP);
        height = map.length;
        width = map[0].length;
    }

    function drawPills(ctx) {
        if (++pillSize > 30) pillSize = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (map[i][j] === Pacman.PILL) {
                    ctx.beginPath();
                    ctx.fillStyle = "#000";
                    ctx.fillRect((j * blockSize), (i * blockSize), blockSize, blockSize);
                    ctx.fillStyle = "#ffff00";
                    ctx.arc((j * blockSize) + blockSize / 2, (i * blockSize) + blockSize / 2, Math.abs(5 - (pillSize / 3)), 0, Math.PI * 2, false);
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    function draw(ctx) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width * blockSize, height * blockSize);
        drawWall(ctx);
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                drawBlock(i, j, ctx);
            }
        }
    }

    function drawBlock(y, x, ctx) {
        const layout = map[y][x];
        if (layout === Pacman.PILL) return;
        ctx.beginPath();
        if (layout === Pacman.EMPTY || layout === Pacman.BLOCK || layout === Pacman.BISCUIT) {
            ctx.fillStyle = "#000";
            ctx.fillRect((x * blockSize), (y * blockSize), blockSize, blockSize);
            if (layout === Pacman.BISCUIT) {
                ctx.fillStyle = "#ffb8de";
                ctx.fillRect((x * blockSize) + (blockSize / 2.5), (y * blockSize) + (blockSize / 2.5), blockSize / 5, blockSize / 5);
            }
        }
        ctx.closePath();
    }

    reset();

    return {
        draw,
        drawBlock,
        drawPills,
        block: (pos) => map[pos.y][pos.x],
        setBlock: (pos, type) => { map[pos.y][pos.x] = type; },
        reset,
        isWallSpace: isWall,
        isFloorSpace,
        get height() { return height; },
        get width() { return width; },
        get blockSize() { return blockSize; }
    };
};

// ==========================================
// CLASSE PACMAN.USER (PAC-MAN)
// ==========================================
Pacman.User = function (game, map) {
    let position = null,
        direction = null,
        eaten = null,
        due = null,
        lives = null,
        score = 5,
        keyMap = {};

    keyMap[37] = LEFT;  keyMap[65] = LEFT;  // Left / A
    keyMap[38] = UP;    keyMap[87] = UP;    // Up / W
    keyMap[39] = RIGHT; keyMap[68] = RIGHT; // Right / D
    keyMap[40] = DOWN;  keyMap[83] = DOWN;  // Down / S

    function addScore(n) {
        score += n;
        if (score >= 10000 && score - n < 10000) {
            lives += 1;
        }
    }

    function initUser() {
        score = 0;
        lives = 3;
        newLevel();
    }

    function newLevel() {
        resetPosition();
        eaten = 0;
    }

    function resetPosition() {
        position = { x: 90, y: 120 };
        direction = LEFT;
        due = LEFT;
    }

    function reset() {
        initUser();
        resetPosition();
    }

    function keyDown(e) {
        if (typeof keyMap[e.keyCode] !== "undefined") {
            due = keyMap[e.keyCode];
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        return true;
    }

    function setDirection(dir) {
        due = dir;
    }

    function getNewCoord(dir, current) {
        return {
            x: current.x + (dir === LEFT && -2 || dir === RIGHT && 2 || 0),
            y: current.y + (dir === DOWN && 2 || dir === UP && -2 || 0)
        };
    }

    function onWholeSquare(x) { return x % 10 === 0; }
    function pointToCoord(x) { return Math.round(x / 10); }

    function nextSquare(x, dir) {
        const rem = x % 10;
        if (rem === 0) return x;
        if (dir === RIGHT || dir === DOWN) return x + (10 - rem);
        return x - rem;
    }

    function next(pos, dir) {
        return {
            y: pointToCoord(nextSquare(pos.y, dir)),
            x: pointToCoord(nextSquare(pos.x, dir))
        };
    }

    function onGridSquare(pos) {
        return onWholeSquare(pos.y) && onWholeSquare(pos.x);
    }

    function isOnSamePlane(d1, d2) {
        return ((d1 === LEFT || d1 === RIGHT) && (d2 === LEFT || d2 === RIGHT)) ||
               ((d1 === UP || d1 === DOWN) && (d2 === UP || d2 === DOWN));
    }

    function move() {
        let npos = null,
            oldPosition = position;

        if (due !== direction) {
            npos = getNewCoord(due, position);
            if (isOnSamePlane(due, direction) || (onGridSquare(position) && map.isFloorSpace(next(npos, due)))) {
                direction = due;
            } else {
                npos = null;
            }
        }

        if (npos === null) npos = getNewCoord(direction, position);

        if (onGridSquare(position) && map.isWallSpace(next(npos, direction))) {
            direction = NONE;
        }

        if (direction === NONE) return { new: position, old: position };

        if (npos.y === 100 && npos.x >= 190 && direction === RIGHT) npos = { y: 100, x: -10 };
        if (npos.y === 100 && npos.x <= -12 && direction === LEFT) npos = { y: 100, x: 190 };

        position = npos;
        const nextWhole = next(position, direction);
        const block = map.block(nextWhole);

        const remX = position.x % 10;
        const remY = position.y % 10;
        const isMid = (remX > 3 && remX < 7) || (remY > 3 && remY < 7);

        if (isMid && (block === Pacman.BISCUIT || block === Pacman.PILL)) {
            map.setBlock(nextWhole, Pacman.EMPTY);
            addScore(block === Pacman.BISCUIT ? 10 : 50);
            eaten += 1;
            if (eaten === 182) game.completedLevel();
            if (block === Pacman.PILL) game.eatenPill();
        }

        return { new: position, old: oldPosition };
    }

    function calcAngle(dir, pos) {
        if (dir === RIGHT && (pos.x % 10 < 5)) return { start: 0.25, end: 1.75, direction: false };
        if (dir === DOWN && (pos.y % 10 < 5))  return { start: 0.75, end: 2.25, direction: false };
        if (dir === UP && (pos.y % 10 < 5))    return { start: 1.25, end: 1.75, direction: true };
        if (dir === LEFT && (pos.x % 10 < 5))  return { start: 0.75, end: 1.25, direction: true };
        return { start: 0, end: 2, direction: false };
    }

    function draw(ctx) {
        const s = map.blockSize;
        const angle = calcAngle(direction, position);
        ctx.fillStyle = "#ffff00";
        ctx.beginPath();
        ctx.moveTo(((position.x / 10) * s) + s / 2, ((position.y / 10) * s) + s / 2);
        ctx.arc(((position.x / 10) * s) + s / 2, ((position.y / 10) * s) + s / 2, s / 2, Math.PI * angle.start, Math.PI * angle.end, angle.direction);
        ctx.fill();
    }

    function drawDead(ctx, amount) {
        const size = map.blockSize;
        const half = size / 2;
        if (amount >= 1) return;
        ctx.fillStyle = "#ffff00";
        ctx.beginPath();
        ctx.moveTo(((position.x / 10) * size) + half, ((position.y / 10) * size) + half);
        ctx.arc(((position.x / 10) * size) + half, ((position.y / 10) * size) + half, half, 0, Math.PI * 2 * amount, true);
        ctx.fill();
    }

    initUser();

    return {
        draw,
        drawDead,
        loseLife: () => { lives -= 1; },
        getLives: () => lives,
        score: () => score,
        addScore,
        theScore: () => score,
        keyDown,
        setDirection,
        move,
        newLevel,
        reset,
        resetPosition
    };
};

// ==========================================
// CLASSE PACMAN.GHOST (FANTASMAS)
// ==========================================
Pacman.Ghost = function (game, map, colour) {
    let position = null,
        direction = null,
        eatable = null,
        eaten = null,
        due = null;

    function getNewCoord(dir, current) {
        const speed = isVulnerable() ? 1 : isHidden() ? 4 : 2;
        const xSpeed = (dir === LEFT && -speed || dir === RIGHT && speed || 0);
        const ySpeed = (dir === DOWN && speed || dir === UP && -speed || 0);
        return {
            x: addBounded(current.x, xSpeed),
            y: addBounded(current.y, ySpeed)
        };
    }

    function addBounded(x1, x2) {
        const rem = x1 % 10;
        const result = rem + x2;
        if (rem !== 0 && result > 10) return x1 + (10 - rem);
        if (rem > 0 && result < 0) return x1 - rem;
        return x1 + x2;
    }

    function isVulnerable() { return eatable !== null; }
    function isDangerous() { return eaten === null; }
    function isHidden() { return eatable === null && eaten !== null; }

    function getRandomDirection() {
        const moves = (direction === LEFT || direction === RIGHT) ? [UP, DOWN] : [LEFT, RIGHT];
        return moves[Math.floor(Math.random() * 2)];
    }

    function reset() {
        eaten = null;
        eatable = null;
        position = { x: 90, y: 80 };
        direction = getRandomDirection();
        due = getRandomDirection();
    }

    function onWholeSquare(x) { return x % 10 === 0; }
    function oppositeDirection(dir) {
        if (dir === LEFT) return RIGHT;
        if (dir === RIGHT) return LEFT;
        if (dir === UP) return DOWN;
        return UP;
    }

    function makeEatable() {
        direction = oppositeDirection(direction);
        eatable = game.getTick();
    }

    function eat() {
        eatable = null;
        eaten = game.getTick();
    }

    function secondsAgo(tick) {
        return (game.getTick() - tick) / Pacman.FPS;
    }

    function getColour() {
        if (eatable) {
            if (secondsAgo(eatable) > 5) {
                return game.getTick() % 20 > 10 ? "#ffffff" : "#2121ff";
            }
            return "#2121ff";
        }
        if (eaten) return "#222222";
        return colour;
    }

    function draw(ctx) {
        const s = map.blockSize;
        const top = (position.y / 10) * s;
        const left = (position.x / 10) * s;

        if (eatable && secondsAgo(eatable) > 8) eatable = null;
        if (eaten && secondsAgo(eaten) > 3) eaten = null;

        const tl = left + s;
        const base = top + s - 3;
        const inc = s / 10;
        const high = game.getTick() % 10 > 5 ? 3 : -3;
        const low = game.getTick() % 10 > 5 ? -3 : 3;

        ctx.fillStyle = getColour();
        ctx.beginPath();
        ctx.moveTo(left, base);
        ctx.quadraticCurveTo(left, top, left + (s / 2), top);
        ctx.quadraticCurveTo(left + s, top, left + s, base);

        // Ondinhas da saia do fantasma
        ctx.quadraticCurveTo(tl - (inc * 1), base + high, tl - (inc * 2), base);
        ctx.quadraticCurveTo(tl - (inc * 3), base + low, tl - (inc * 4), base);
        ctx.quadraticCurveTo(tl - (inc * 5), base + high, tl - (inc * 6), base);
        ctx.quadraticCurveTo(tl - (inc * 7), base + low, tl - (inc * 8), base);
        ctx.quadraticCurveTo(tl - (inc * 9), base + high, tl - (inc * 10), base);
        ctx.closePath();
        ctx.fill();

        // Olhos
        ctx.beginPath();
        ctx.fillStyle = "#fff";
        ctx.arc(left + 6, top + 6, s / 6, 0, Math.PI * 2, false);
        ctx.arc((left + s) - 6, top + 6, s / 6, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();

        // Pupilas olhando para a direção do movimento
        const f = s / 12;
        const off = {};
        off[RIGHT] = [f, 0];
        off[LEFT]  = [-f, 0];
        off[UP]    = [0, -f];
        off[DOWN]  = [0, f];

        ctx.beginPath();
        ctx.fillStyle = "#000";
        const o = off[direction] || [0, 0];
        ctx.arc(left + 6 + o[0], top + 6 + o[1], s / 15, 0, Math.PI * 2, false);
        ctx.arc((left + s) - 6 + o[0], top + 6 + o[1], s / 15, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
    }

    function move() {
        const oldPos = position;
        const onGrid = onWholeSquare(position.y) && onWholeSquare(position.x);
        let npos = null;

        if (due !== direction) {
            npos = getNewCoord(due, position);
            const nX = (due === RIGHT || due === DOWN) ? position.x + (10 - (position.x % 10)) : position.x - (position.x % 10);
            const nY = (due === RIGHT || due === DOWN) ? position.y + (10 - (position.y % 10)) : position.y - (position.y % 10);
            if (onGrid && map.isFloorSpace({ y: Math.round(nY / 10), x: Math.round(nX / 10) })) {
                direction = due;
            } else {
                npos = null;
            }
        }

        if (npos === null) npos = getNewCoord(direction, position);

        if (onGrid && map.isWallSpace({ y: Math.round(npos.y / 10), x: Math.round(npos.x / 10) })) {
            due = getRandomDirection();
            return move();
        }

        if (npos.y === 100 && npos.x >= 190 && direction === RIGHT) position = { y: 100, x: -10 };
        else if (npos.y === 100 && npos.x <= -10 && direction === LEFT) position = { y: 100, x: 190 };
        else position = npos;

        const nextY = Math.round(((direction === RIGHT || direction === DOWN) ? position.y + (10 - (position.y % 10)) : position.y - (position.y % 10)) / 10);
        const nextX = Math.round(((direction === RIGHT || direction === DOWN) ? position.x + (10 - (position.x % 10)) : position.x - (position.x % 10)) / 10);

        if (onGrid && map.isWallSpace({ y: nextY, x: nextX })) {
            due = getRandomDirection();
        }

        return { new: position, old: oldPos };
    }

    return {
        eat,
        isVunerable: isVulnerable,
        isDangerous,
        makeEatable,
        reset,
        move,
        draw
    };
};

// ==========================================
// CONTROLLER PRINCIPAL DO JOGO
// ==========================================
const PACMAN = (function () {
    let state = WAITING,
        audio = null,
        ghosts = [],
        ghostSpecs = ["#00ffde", "#ff0000", "#ffb8de", "#ffb847"],
        eatenCount = 0,
        level = 0,
        tick = 0,
        ghostPos, userPos,
        stateChanged = true,
        timerStart = null,
        lastTime = 0,
        ctx = null,
        timer = null,
        map = null,
        user = null,
        stored = null,
        highScore = parseInt(localStorage.getItem('pacman_high_score') || '10000', 10);

    const scoreDisplay = document.getElementById('current-score');
    const highScoreDisplay = document.getElementById('high-score');
    const soundLabel = document.getElementById('sound-label');

    function getTick() { return tick; }

    function drawScore(text, position) {
        ctx.fillStyle = "#ffff00";
        ctx.font = "12px 'Press Start 2P', monospace";
        ctx.fillText(text, (position["new"].x / 10) * map.blockSize, ((position["new"].y + 5) / 10) * map.blockSize);
    }

    function dialog(text) {
        ctx.fillStyle = "#ffff00";
        ctx.font = "14px 'Press Start 2P', monospace";
        const width = ctx.measureText(text).width;
        const x = ((map.width * map.blockSize) - width) / 2;
        ctx.fillText(text, x, (map.height * 10) + 8);
    }

    function soundDisabled() {
        return audio ? audio.isMuted : false;
    }

    function startLevel() {
        user.resetPosition();
        for (let i = 0; i < ghosts.length; i++) ghosts[i].reset();
        audio.play("start");
        timerStart = tick;
        setState(COUNTDOWN);
    }

    function startNewGame() {
        setState(WAITING);
        level = 1;
        user.reset();
        map.reset();
        map.draw(ctx);
        startLevel();
    }

    function togglePause() {
        if (state === PAUSE) {
            audio.resume();
            map.draw(ctx);
            setState(stored);
        } else if (state === PLAYING || state === COUNTDOWN) {
            stored = state;
            setState(PAUSE);
            audio.pause();
            map.draw(ctx);
            dialog("PAUSADO");
        }
    }

    function toggleSound() {
        const muted = audio.toggleMute();
        if (soundLabel) soundLabel.textContent = muted ? '🔇 MUDO' : '🔊 SOM';
    }

    function setDirection(dir) {
        if (user && state !== PAUSE) {
            user.setDirection(dir);
            if (state === WAITING) startNewGame();
        }
    }

    function keyDown(e) {
        if (e.keyCode === 78) { // N
            startNewGame();
        } else if (e.keyCode === 83) { // S
            toggleSound();
        } else if (e.keyCode === 80) { // P
            togglePause();
        } else if (state !== PAUSE) {
            return user.keyDown(e);
        }
        return true;
    }

    function loseLife() {
        setState(WAITING);
        user.loseLife();
        if (user.getLives() > 0) {
            startLevel();
        } else {
            dialog("GAME OVER");
        }
    }

    function setState(nState) {
        state = nState;
        stateChanged = true;
    }

    function collided(u, g) {
        return Math.sqrt(Math.pow(g.x - u.x, 2) + Math.pow(g.y - u.y, 2)) < 10;
    }

    function drawFooter() {
        const topLeft = (map.height * map.blockSize);
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, topLeft, (map.width * map.blockSize), 30);

        // Vidas restantes (ícones do Pacman)
        for (let i = 0; i < user.getLives(); i++) {
            ctx.fillStyle = "#ffff00";
            ctx.beginPath();
            ctx.moveTo(150 + (25 * i) + map.blockSize / 2, (topLeft + 1) + map.blockSize / 2);
            ctx.arc(150 + (25 * i) + map.blockSize / 2, (topLeft + 1) + map.blockSize / 2, map.blockSize / 2, Math.PI * 0.25, Math.PI * 1.75, false);
            ctx.fill();
        }

        // Atualiza elementos do DOM com o placar
        const curScore = user.theScore();
        if (scoreDisplay) scoreDisplay.textContent = String(curScore).padStart(2, '0');
        if (curScore > highScore) {
            highScore = curScore;
            localStorage.setItem('pacman_high_score', highScore);
        }
        if (highScoreDisplay) highScoreDisplay.textContent = highScore;
    }

    function completedLevel() {
        setState(WAITING);
        level += 1;
        map.reset();
        user.newLevel();
        startLevel();
    }

    function eatenPill() {
        audio.play("eatpill");
        timerStart = tick;
        eatenCount = 0;
        for (let i = 0; i < ghosts.length; i++) ghosts[i].makeEatable();
    }

    function mainDraw() {
        let diff;
        ghostPos = [];

        for (let i = 0; i < ghosts.length; i++) ghostPos.push(ghosts[i].move());
        const u = user.move();

        for (let i = 0; i < ghosts.length; i++) redrawBlock(ghostPos[i].old);
        redrawBlock(u.old);

        for (let i = 0; i < ghosts.length; i++) ghosts[i].draw(ctx);
        user.draw(ctx);

        userPos = u["new"];

        for (let i = 0; i < ghosts.length; i++) {
            if (collided(userPos, ghostPos[i]["new"])) {
                if (ghosts[i].isVunerable()) {
                    audio.play("eatghost");
                    ghosts[i].eat();
                    eatenCount += 1;
                    const nScore = eatenCount * 200;
                    drawScore(nScore, ghostPos[i]);
                    user.addScore(nScore);
                    setState(EATEN_PAUSE);
                    timerStart = tick;
                } else if (ghosts[i].isDangerous()) {
                    audio.play("die");
                    setState(DYING);
                    timerStart = tick;
                }
            }
        }
    }

    function mainLoop() {
        let diff;
        if (state !== PAUSE) ++tick;

        map.drawPills(ctx);

        if (state === PLAYING) {
            mainDraw();
        } else if (state === WAITING && stateChanged) {
            stateChanged = false;
            map.draw(ctx);
            dialog("APERTE N P/ JOGAR");
        } else if (state === EATEN_PAUSE) {
            diff = (tick - timerStart) / Pacman.FPS;
            if (diff > 1) {
                map.draw(ctx);
                setState(PLAYING);
            }
        } else if (state === DYING) {
            diff = (tick - timerStart) / Pacman.FPS;
            if (diff > 2.5) {
                loseLife();
            } else {
                redrawBlock(userPos);
                for (let i = 0; i < ghosts.length; i++) redrawBlock(ghostPos[i].old);
                user.drawDead(ctx, (diff) / 2.5);
            }
        } else if (state === COUNTDOWN) {
            diff = 5 + Math.floor((timerStart - tick) / Pacman.FPS);
            if (diff === 0) {
                map.draw(ctx);
                setState(PLAYING);
            } else if (diff !== lastTime) {
                lastTime = diff;
                map.draw(ctx);
                dialog("PRONTO! " + diff);
            }
        }

        drawFooter();
    }

    function redrawBlock(pos) {
        if (!pos) return;
        map.drawBlock(Math.floor(pos.y / 10), Math.floor(pos.x / 10), ctx);
        map.drawBlock(Math.ceil(pos.y / 10), Math.ceil(pos.x / 10), ctx);
    }

    function init(wrapper) {
        const blockSize = wrapper.offsetWidth / 19;
        const canvas = document.createElement("canvas");

        canvas.setAttribute("width", (blockSize * 19) + "px");
        canvas.setAttribute("height", (blockSize * 22) + 30 + "px");

        wrapper.innerHTML = '';
        wrapper.appendChild(canvas);

        ctx = canvas.getContext('2d');
        audio = new PacAudio();
        if (soundLabel) soundLabel.textContent = audio.isMuted ? '🔇 MUDO' : '🔊 SOM';

        map = new Pacman.Map(blockSize);
        user = new Pacman.User({
            completedLevel,
            eatenPill
        }, map);

        for (let i = 0; i < ghostSpecs.length; i++) {
            ghosts.push(new Pacman.Ghost({ getTick }, map, ghostSpecs[i]));
        }

        map.draw(ctx);
        dialog("APERTE N P/ JOGAR");

        document.addEventListener("keydown", keyDown, true);
        timer = window.setInterval(mainLoop, 1000 / Pacman.FPS);
    }

    return {
        init,
        startNewGame,
        togglePause,
        toggleSound,
        setDirection
    };
})();

// ==========================================
// REGISTRO DE EVENTOS E TOUCH (SWIPE + DPAD)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("pacman");
    if (el) PACMAN.init(el);

    // Botões da Interface Arcade
    const btnNewGame = document.getElementById("btn-new-game");
    const btnPause = document.getElementById("btn-pause");
    const btnSound = document.getElementById("btn-sound");
    const btnHelp = document.getElementById("btn-help");
    const helpModal = document.getElementById("help-modal");
    const modalOverlay = document.getElementById("modal-overlay");
    const closeHelpBtn = document.getElementById("close-help-btn");
    const btnModalOk = document.getElementById("btn-modal-ok");

    if (btnNewGame) btnNewGame.addEventListener("click", () => PACMAN.startNewGame());
    if (btnPause) btnPause.addEventListener("click", () => PACMAN.togglePause());
    if (btnSound) btnSound.addEventListener("click", () => PACMAN.toggleSound());

    // Modal de Ajuda
    const openHelp = () => {
        modalOverlay.classList.add("active");
        helpModal.classList.add("active");
    };
    const closeHelp = () => {
        modalOverlay.classList.remove("active");
        helpModal.classList.remove("active");
    };

    if (btnHelp) btnHelp.addEventListener("click", openHelp);
    if (closeHelpBtn) closeHelpBtn.addEventListener("click", closeHelp);
    if (btnModalOk) btnModalOk.addEventListener("click", closeHelp);
    if (modalOverlay) modalOverlay.addEventListener("click", closeHelp);

    // D-Pad Virtual (Touch/Click)
    const bindDpad = (id, dir) => {
        const btn = document.getElementById(id);
        if (btn) {
            const trigger = (e) => {
                e.preventDefault();
                PACMAN.setDirection(dir);
            };
            btn.addEventListener("touchstart", trigger, { passive: false });
            btn.addEventListener("mousedown", trigger);
        }
    };

    bindDpad("dpad-up", UP);
    bindDpad("dpad-down", DOWN);
    bindDpad("dpad-left", LEFT);
    bindDpad("dpad-right", RIGHT);

    // Suporte a Swipe na Tela do Jogo
    const arcadeScreen = document.getElementById("arcade-screen");
    let touchStartX = 0;
    let touchStartY = 0;

    if (arcadeScreen) {
        arcadeScreen.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        arcadeScreen.addEventListener("touchend", (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            // Limiar mínimo de swipe de 25px
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 25) {
                    PACMAN.setDirection(dx > 0 ? RIGHT : LEFT);
                }
            } else {
                if (Math.abs(dy) > 25) {
                    PACMAN.setDirection(dy > 0 ? DOWN : UP);
                }
            }
        }, { passive: true });
    }
});
