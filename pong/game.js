class TrippyPong {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameRunning = false;
        this.playerScore = 0;
        this.aiScore = 0;
        
        // Game objects
        this.ball = {
            x: this.width / 2,
            y: this.height / 2,
            radius: 8,
            dx: 4,
            dy: 4,
            trail: [],
            trailLength: 25
        };
        
        this.playerPaddle = {
            x: 50,
            y: this.height / 2 - 50,
            width: 15,
            height: 100,
            speed: 8,
            dy: 0
        };
        
        this.aiPaddle = {
            x: this.width - 65,
            y: this.height / 2 - 50,
            width: 15,
            height: 100,
            speed: 6
        };
        
        // Trippy effects
        this.time = 0;
        this.particles = [];
        this.waveOffset = 0;
        this.colorShift = 0;
        this.psychedelicMode = true;
        
        // Input handling
        this.keys = {};
        this.setupInput();
        
        // Start the game loop
        this.gameLoop();
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                this.gameRunning = !this.gameRunning;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.time += 0.016;
        this.waveOffset += 0.05;
        this.colorShift += 0.02;
        
        // Update ball
        this.updateBall();
        
        // Update paddles
        this.updatePaddles();
        
        // Update particles
        this.updateParticles();
        
        // Add new particles
        this.addParticles();
    }
    
    updateBall() {
        // Update ball trail
        this.ball.trail.push({ 
            x: this.ball.x, 
            y: this.ball.y,
            time: this.time,
            speed: Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy)
        });
        if (this.ball.trail.length > this.ball.trailLength) {
            this.ball.trail.shift();
        }
        
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Ball collision with top and bottom
        if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= this.height) {
            this.ball.dy = -this.ball.dy;
            this.createParticleBurst(this.ball.x, this.ball.y);
        }
        
        // Ball collision with paddles
        if (this.checkPaddleCollision(this.playerPaddle) || this.checkPaddleCollision(this.aiPaddle)) {
            this.ball.dx = -this.ball.dx;
            this.ball.dy += (Math.random() - 0.5) * 2;
            this.createParticleBurst(this.ball.x, this.ball.y);
        }
        
        // Score points
        if (this.ball.x <= 0) {
            this.aiScore++;
            this.resetBall();
        } else if (this.ball.x >= this.width) {
            this.playerScore++;
            this.resetBall();
        }
        
        // Update score display
        document.getElementById('playerScore').textContent = this.playerScore;
        document.getElementById('aiScore').textContent = this.aiScore;
    }
    
    updatePaddles() {
        // Player paddle movement
        if (this.keys['w']) {
            this.playerPaddle.y -= this.playerPaddle.speed;
        }
        if (this.keys['s']) {
            this.playerPaddle.y += this.playerPaddle.speed;
        }
        
        // Keep paddles in bounds
        this.playerPaddle.y = Math.max(0, Math.min(this.height - this.playerPaddle.height, this.playerPaddle.y));
        this.aiPaddle.y = Math.max(0, Math.min(this.height - this.aiPaddle.height, this.aiPaddle.y));
        
        // AI paddle movement
        const aiCenter = this.aiPaddle.y + this.aiPaddle.height / 2;
        const ballCenter = this.ball.y;
        
        if (aiCenter < ballCenter - 10) {
            this.aiPaddle.y += this.aiPaddle.speed;
        } else if (aiCenter > ballCenter + 10) {
            this.aiPaddle.y -= this.aiPaddle.speed;
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            particle.size *= 0.98;
            
            if (particle.life <= 0 || particle.size <= 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    addParticles() {
        // Add ambient particles
        if (Math.random() < 0.3) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 1,
                life: Math.random() * 0.5 + 0.5,
                color: this.getTrippyColor()
            });
        }
    }
    
    createParticleBurst(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                size: Math.random() * 4 + 2,
                life: 1,
                color: this.getTrippyColor()
            });
        }
    }
    
    checkPaddleCollision(paddle) {
        return this.ball.x - this.ball.radius < paddle.x + paddle.width &&
               this.ball.x + this.ball.radius > paddle.x &&
               this.ball.y - this.ball.radius < paddle.y + paddle.height &&
               this.ball.y + this.ball.radius > paddle.y;
    }
    
    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
        this.ball.dy = (Math.random() - 0.5) * 4;
    }
    
    getTrippyColor() {
        const hue = (this.time * 50 + this.colorShift * 100) % 360;
        return `hsl(${hue}, 100%, 70%)`;
    }
    
    drawTrippyBackground() {
        // Create gradient background
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width / 2
        );
        
        const hue1 = (this.time * 30) % 360;
        const hue2 = (this.time * 30 + 120) % 360;
        const hue3 = (this.time * 30 + 240) % 360;
        
        gradient.addColorStop(0, `hsla(${hue1}, 80%, 20%, 0.8)`);
        gradient.addColorStop(0.5, `hsla(${hue2}, 80%, 15%, 0.6)`);
        gradient.addColorStop(1, `hsla(${hue3}, 80%, 10%, 0.4)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw fractal patterns
        this.drawFractalPatterns();
    }
    
    drawFractalPatterns() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        
        // Fast fractal-like patterns using mathematical functions
        this.drawFastFractalWaves();
        this.drawSpiralPatterns();
        this.drawGeometricFractals();
        
        this.ctx.restore();
    }
    
    drawFastFractalWaves() {
        const timeOffset = this.time * 0.5;
        
        // Multiple wave layers that create fractal-like complexity
        for (let layer = 0; layer < 4; layer++) {
            const layerOffset = layer * 0.7;
            const amplitude = 30 + layer * 20;
            const frequency = 0.02 + layer * 0.01;
            
            this.ctx.strokeStyle = `hsla(${(this.time * 30 + layer * 90) % 360}, 100%, 70%, 0.4)`;
            this.ctx.lineWidth = 2 + layer * 0.5;
            
            this.ctx.beginPath();
            for (let x = 0; x < this.width; x += 2) {
                const y = this.height / 2 + 
                         Math.sin(x * frequency + timeOffset + layerOffset) * amplitude +
                         Math.sin(x * frequency * 2 + timeOffset * 1.5 + layerOffset) * (amplitude * 0.5) +
                         Math.sin(x * frequency * 4 + timeOffset * 2 + layerOffset) * (amplitude * 0.25);
                
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }
    
    drawSpiralPatterns() {
        const timeOffset = this.time * 0.3;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Draw multiple animated spirals
        for (let i = 0; i < 3; i++) {
            const spiralOffset = i * Math.PI * 2 / 3;
            const radius = 50 + i * 30;
            const speed = 0.02 + i * 0.01;
            
            this.ctx.strokeStyle = `hsla(${(this.time * 40 + i * 120) % 360}, 100%, 70%, 0.5)`;
            this.ctx.lineWidth = 3;
            
            this.ctx.beginPath();
            for (let angle = 0; angle < Math.PI * 8; angle += 0.1) {
                const r = radius * (angle / (Math.PI * 8)) + Math.sin(angle * 3 + timeOffset) * 20;
                const x = centerX + Math.cos(angle + spiralOffset + timeOffset) * r;
                const y = centerY + Math.sin(angle + spiralOffset + timeOffset) * r;
                
                if (angle === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }
    
    drawGeometricFractals() {
        const timeOffset = this.time * 0.4;
        
        // Draw animated geometric patterns that look fractal-like
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + timeOffset;
            const distance = 100 + Math.sin(timeOffset * 2 + i) * 50;
            const x = this.width / 2 + Math.cos(angle) * distance;
            const y = this.height / 2 + Math.sin(angle) * distance;
            
            this.drawRecursiveSquares(x, y, 40, 3, i);
        }
    }
    
    drawRecursiveSquares(x, y, size, depth, layer) {
        if (depth <= 0) return;
        
        const hue = (this.time * 50 + layer * 60) % 360;
        this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.3 + depth * 0.1})`;
        this.ctx.lineWidth = depth * 2;
        
        // Draw square
        this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        
        // Draw smaller squares at corners
        const newSize = size * 0.4;
        this.drawRecursiveSquares(x - size / 2, y - size / 2, newSize, depth - 1, layer);
        this.drawRecursiveSquares(x + size / 2, y - size / 2, newSize, depth - 1, layer);
        this.drawRecursiveSquares(x - size / 2, y + size / 2, newSize, depth - 1, layer);
        this.drawRecursiveSquares(x + size / 2, y + size / 2, newSize, depth - 1, layer);
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    drawBall() {
        // Draw enhanced ball trail
        this.ball.trail.forEach((pos, index) => {
            const progress = index / this.ball.trail.length;
            const alpha = progress * 0.8;
            const size = this.ball.radius * (0.3 + progress * 0.7);
            
            // Color based on trail position and time
            const hue = (this.time * 100 + index * 15) % 360;
            const trailColor = `hsla(${hue}, 100%, 70%, ${alpha})`;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = trailColor;
            this.ctx.shadowColor = trailColor;
            this.ctx.shadowBlur = 20 + progress * 10;
            
            // Draw main trail circle
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw outer glow ring
            this.ctx.globalAlpha = alpha * 0.3;
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = trailColor;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, size + 3, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw inner glow
            this.ctx.globalAlpha = alpha * 0.6;
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, size * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
        
        // Draw main ball with enhanced effects
        this.ctx.save();
        
        // Outer glow
        this.ctx.shadowColor = this.getTrippyColor();
        this.ctx.shadowBlur = 30;
        this.ctx.fillStyle = this.getTrippyColor();
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius + 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Main ball
        this.ctx.shadowBlur = 25;
        this.ctx.fillStyle = this.getTrippyColor();
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner glow
        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = 0.4;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Core
        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = 0.8;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawPaddle(paddle, isPlayer = false) {
        this.ctx.save();
        
        // Create gradient for paddle
        const gradient = this.ctx.createLinearGradient(
            paddle.x, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height
        );
        
        const hue = isPlayer ? (this.time * 60) % 360 : (this.time * 60 + 180) % 360;
        gradient.addColorStop(0, `hsl(${hue}, 100%, 70%)`);
        gradient.addColorStop(1, `hsl(${hue + 60}, 100%, 50%)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = this.getTrippyColor();
        this.ctx.shadowBlur = 15;
        this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Add inner glow
        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillRect(paddle.x + 2, paddle.y + 2, paddle.width - 4, paddle.height - 4);
        
        this.ctx.restore();
    }
    
    drawCenterLine() {
        this.ctx.save();
        this.ctx.strokeStyle = this.getTrippyColor();
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        this.ctx.lineDashOffset = this.time * 2;
        this.ctx.shadowColor = this.getTrippyColor();
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw trippy background
        this.drawTrippyBackground();
        
        // Draw particles
        this.drawParticles();
        
        // Draw center line
        this.drawCenterLine();
        
        // Draw paddles
        this.drawPaddle(this.playerPaddle, true);
        this.drawPaddle(this.aiPaddle, false);
        
        // Draw ball
        this.drawBall();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new TrippyPong();
}); 