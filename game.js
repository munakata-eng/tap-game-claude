class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.bgCtx = this.backgroundCanvas.getContext('2d');
        
        this.stage = 1;
        this.gold = 0;
        this.baseDamage = 1;
        this.clickDamage = 1;
        this.petDPS = 0;
        this.lastPetAttack = 0;
        
        this.combo = 0;
        this.comboTimer = 0;
        this.lastClickTime = 0;
        
        this.enemy = {
            maxHp: 50,
            currentHp: 50,
            goldReward: 15,
            type: 'slime',
            imageNumber: 1,
            image: null
        };
        
        this.upgrades = [
            {
                id: 'sword',
                name: '🗡️ 手裏剣',
                baseCost: 10,
                costMultiplier: 1.15,
                level: 0,
                effect: 1,
                description: '忍術威力 +1'
            },
            {
                id: 'hero',
                name: '⚔️ 忍刀',
                baseCost: 100,
                costMultiplier: 1.3,
                level: 0,
                effect: 5,
                description: '忍術威力 +5'
            },
            {
                id: 'magic',
                name: '🌸 桜吹雪ノ術',
                baseCost: 1000,
                costMultiplier: 1.5,
                level: 0,
                effect: 25,
                description: '忍術威力 +25'
            },
            {
                id: 'legendary',
                name: '🔥 火遁ノ術',
                baseCost: 10000,
                costMultiplier: 1.8,
                level: 0,
                effect: 100,
                description: '忍術威力 +100'
            },
            {
                id: 'divine',
                name: '⛩️ 秘伝ノ巻物',
                baseCost: 100000,
                costMultiplier: 2.0,
                level: 0,
                effect: 500,
                description: '忍術威力 +500'
            }
        ];
        
        this.pets = [
            {
                id: 'kitsune',
                name: '🦊 狐火',
                baseCost: 50,
                costMultiplier: 1.4,
                level: 0,
                dps: 0.5,
                description: '毎秒 0.5 ダメージ'
            },
            {
                id: 'tengu',
                name: '👺 天狗',
                baseCost: 500,
                costMultiplier: 1.5,
                level: 0,
                dps: 5,
                description: '毎秒 5 ダメージ'
            },
            {
                id: 'oni',
                name: '👹 鬼神',
                baseCost: 5000,
                costMultiplier: 1.6,
                level: 0,
                dps: 50,
                description: '毎秒 50 ダメージ'
            },
            {
                id: 'ryujin',
                name: '🐲 龍神',
                baseCost: 50000,
                costMultiplier: 1.8,
                level: 0,
                dps: 500,
                description: '毎秒 500 ダメージ'
            }
        ];
        
        this.particles = [];
        this.damageNumbers = [];
        this.enemyShake = 0;
        this.enemyAnimation = 0;
        this.backgroundParticles = [];
        this.slashEffects = [];
        
        this.enemyTypes = ['slime', 'demon', 'dragon', 'boss'];
        this.enemyImages = {};
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.init();
    }
    
    resize() {
        this.backgroundCanvas.width = window.innerWidth;
        this.backgroundCanvas.height = window.innerHeight;
        
        // キャンバスのサイズを保持
        const rect = this.canvas.getBoundingClientRect();
        this.canvasScale = {
            x: this.canvas.width / rect.width,
            y: this.canvas.height / rect.height
        };
    }
    
    init() {
        // セーブデータの読み込み
        this.loadGame();
        
        // 敵画像のプリロード
        this.preloadEnemyImages();
        
        // クリックとタッチイベントの両方をサポート
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // タッチイベントの改善版
        let touchStartTime;
        let touchStartX, touchStartY;
        let hasMoved = false;
        
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            hasMoved = false;
        }, { passive: true });
        
        this.canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const moveX = Math.abs(touch.clientX - touchStartX);
            const moveY = Math.abs(touch.clientY - touchStartY);
            if (moveX > 10 || moveY > 10) {
                hasMoved = true;
            }
        }, { passive: true });
        
        this.canvas.addEventListener('touchend', (e) => {
            if (!hasMoved && Date.now() - touchStartTime < 300) {
                const touch = e.changedTouches[0];
                this.handleClick(touch);
            }
        }, { passive: true });
        
        this.renderUpgrades();
        
        // モバイルデバイスでは背景パーティクル数を減らす
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const particleCount = isMobile ? 15 : 30;
        
        for (let i = 0; i < particleCount; i++) {
            this.backgroundParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
        
        this.resize();
        this.gameLoop();
        this.updateUI();
        
        // 自動保存を3秒ごとに実行
        setInterval(() => this.saveGame(), 3000);
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        // キャンバスの実際のサイズと表示サイズの比率を計算
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // クリック位置をキャンバス座標に変換
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const now = Date.now();
        if (now - this.lastClickTime < 500) {
            this.combo++;
            this.comboTimer = 60;
        } else {
            this.combo = 1;
            this.comboTimer = 60;
        }
        this.lastClickTime = now;
        
        const isCritical = Math.random() < 0.1 + Math.min(this.combo * 0.02, 0.5);
        const damage = isCritical ? this.clickDamage * 3 : this.clickDamage;
        
        this.dealDamage(damage);
        this.createDamageNumber(x, y, damage, isCritical);
        this.createClickEffect(x, y, isCritical);
        this.createSlashEffect(x, y);
        this.enemyShake = 15;
        
        // コンボ表示は削除（内部的にはコンボ機能は維持）
    }
    
    updateComboDisplay() {
        const comboDisplay = document.getElementById('comboDisplay');
        comboDisplay.textContent = `${this.combo}x COMBO!`;
        comboDisplay.classList.add('active');
        comboDisplay.style.background = `linear-gradient(45deg, 
            hsl(${this.combo * 20}, 100%, 50%), 
            hsl(${this.combo * 20 + 60}, 100%, 50%))`;
        comboDisplay.style.webkitBackgroundClip = 'text';
        comboDisplay.style.backgroundClip = 'text';
        comboDisplay.style.webkitTextFillColor = 'transparent';
        comboDisplay.style.color = 'transparent';
        
        setTimeout(() => {
            if (this.comboTimer <= 0) {
                comboDisplay.classList.remove('active');
            }
        }, 2000);
    }
    
    dealDamage(damage) {
        this.enemy.currentHp -= damage;
        
        if (this.enemy.currentHp <= 0) {
            const goldEarned = this.enemy.goldReward;
            this.gold += goldEarned;
            this.createDeathEffect();
            this.createGoldEffect(goldEarned);
            this.nextEnemy();
        }
        
        this.updateUI();
    }
    
    createDeathEffect() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = Math.random() * 10 + 5;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                size: Math.random() * 10 + 5,
                color: `hsl(${Math.random() * 60 + 300}, 100%, 50%)`
            });
        }
    }
    
    createGoldEffect(goldAmount) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // ゴールド獲得表示（画面上部に表示）
        const goldDiv = document.createElement('div');
        goldDiv.className = 'gold-popup';
        goldDiv.innerHTML = `<span class="gold-plus">+</span><span class="gold-amount">${this.formatNumber(goldAmount)}</span><span class="gold-coin">💰</span>`;
        
        const rect = this.canvas.getBoundingClientRect();
        const screenX = rect.left + (centerX / this.canvas.width) * rect.width;
        const screenY = rect.top + 100; // 画面上部に固定
        
        goldDiv.style.left = screenX + 'px';
        goldDiv.style.top = screenY + 'px';
        document.body.appendChild(goldDiv);
        
        // 画面端に向かう大きなゴールドエフェクト
        for (let i = 0; i < 8; i++) {
            const coinDiv = document.createElement('div');
            coinDiv.className = 'gold-particle';
            coinDiv.textContent = '💰';
            coinDiv.style.fontSize = '36px';
            
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 150 + Math.random() * 100;
            const x = screenX + Math.cos(angle) * distance;
            const y = screenY + Math.sin(angle) * distance;
            
            coinDiv.style.left = screenX + 'px';
            coinDiv.style.top = screenY + 'px';
            coinDiv.style.setProperty('--end-x', `${x - screenX}px`);
            coinDiv.style.setProperty('--end-y', `${y - screenY}px`);
            
            document.body.appendChild(coinDiv);
            
            setTimeout(() => coinDiv.remove(), 1500);
        }
        
        // 画面全体に黄金の輝きエフェクト
        const flashDiv = document.createElement('div');
        flashDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at ${screenX}px ${screenY}px, rgba(255,215,0,0.3), transparent 70%);
            pointer-events: none;
            z-index: 50;
            animation: goldFlash 0.5s ease-out;
        `;
        document.body.appendChild(flashDiv);
        
        setTimeout(() => {
            flashDiv.remove();
        }, 500);
        
        setTimeout(() => {
            goldDiv.remove();
        }, 2500);
    }
    
    nextEnemy() {
        if (this.enemy.currentHp <= 0) {
            this.stage++;
            const stageIndex = Math.min(Math.floor(this.stage / 10), this.enemyTypes.length - 1);
            this.enemy.type = this.enemyTypes[stageIndex];
            this.enemy.maxHp = Math.floor(50 * Math.pow(1.25, this.stage - 1));
            this.enemy.currentHp = this.enemy.maxHp;
            this.enemy.goldReward = Math.floor(15 * Math.pow(1.4, this.stage - 1));
            
            // ランダムな敵画像を選択
            this.enemy.imageNumber = Math.floor(Math.random() * 41) + 1;
            if (this.enemyImages[this.enemy.imageNumber]) {
                this.enemy.image = this.enemyImages[this.enemy.imageNumber];
                this.debugImageLogged = false; // デバッグフラグをリセット
            }
        }
    }
    
    formatNumber(num) {
        if (num < 1000) return Math.floor(num).toString();
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
        if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';
        if (num < 1000000000000000) return (num / 1000000000000).toFixed(1) + 'T';
        return (num / 1000000000000000).toFixed(1) + 'Q';
    }
    
    updateUI() {
        document.getElementById('stage').textContent = this.stage;
        document.getElementById('gold').textContent = this.formatNumber(this.gold);
        document.getElementById('damage').textContent = this.formatNumber(this.clickDamage);
        document.getElementById('dps').textContent = this.formatNumber(this.petDPS);
        
        const hpPercent = (this.enemy.currentHp / this.enemy.maxHp) * 100;
        document.getElementById('enemyHpBar').style.width = hpPercent + '%';
        document.getElementById('enemyHpText').textContent = 
            `${this.formatNumber(this.enemy.currentHp)} / ${this.formatNumber(this.enemy.maxHp)}`;
        
        // アップグレードの購入可能状態を更新
        this.renderUpgrades();
    }
    
    renderUpgrades() {
        // デスクトップとモバイル両方のリストを取得
        const upgradesListDesktop = document.getElementById('upgradesListDesktop');
        const upgradesListMobile = document.getElementById('upgradesListMobile');
        
        // 両方のリストに同じ内容を表示
        [upgradesListDesktop, upgradesListMobile].forEach(upgradesList => {
            if (!upgradesList) return;
            upgradesList.innerHTML = '';
        
        // 武器アップグレード
        const weaponHeader = document.createElement('div');
        weaponHeader.className = 'upgrade-category';
        weaponHeader.innerHTML = '<h4>⚔️ 武器強化</h4>';
        upgradesList.appendChild(weaponHeader);
        
        this.upgrades.forEach(upgrade => {
            const cost = this.getUpgradeCost(upgrade);
            const div = document.createElement('div');
            div.className = 'upgrade-item';
            if (this.gold >= cost) {
                div.classList.add('can-afford');
            }
            
            div.innerHTML = `
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-level">Lv. ${upgrade.level}</div>
                <div class="upgrade-effect">${upgrade.description}</div>
                <div class="upgrade-cost">💰 ${this.formatNumber(cost)}</div>
            `;
            
            div.addEventListener('click', () => this.buyUpgrade(upgrade));
            upgradesList.appendChild(div);
        });
        
        // 式神アップグレード
        const petHeader = document.createElement('div');
        petHeader.className = 'upgrade-category';
        petHeader.innerHTML = '<h4>🌟 式神</h4>';
        upgradesList.appendChild(petHeader);
        
        this.pets.forEach(pet => {
            const cost = this.getPetCost(pet);
            const div = document.createElement('div');
            div.className = 'upgrade-item pet-item';
            if (this.gold >= cost) {
                div.classList.add('can-afford');
            }
            
            div.innerHTML = `
                <div class="upgrade-name">${pet.name}</div>
                <div class="upgrade-level">Lv. ${pet.level}</div>
                <div class="upgrade-effect">${pet.description}</div>
                <div class="upgrade-cost">💰 ${this.formatNumber(cost)}</div>
            `;
            
            div.addEventListener('click', () => this.buyPet(pet));
            upgradesList.appendChild(div);
        });
        });
    }
    
    getUpgradeCost(upgrade) {
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    }
    
    getPetCost(pet) {
        return Math.floor(pet.baseCost * Math.pow(pet.costMultiplier, pet.level));
    }
    
    buyUpgrade(upgrade) {
        const cost = this.getUpgradeCost(upgrade);
        if (this.gold >= cost) {
            this.gold -= cost;
            upgrade.level++;
            this.clickDamage += upgrade.effect;
            this.updateUI();
            this.renderUpgrades();
            this.createUpgradeEffect();
        }
    }
    
    buyPet(pet) {
        const cost = this.getPetCost(pet);
        if (this.gold >= cost) {
            this.gold -= cost;
            pet.level++;
            this.petDPS += pet.dps;
            this.updateUI();
            this.renderUpgrades();
            this.createUpgradeEffect();
        }
    }
    
    createUpgradeEffect() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            // パーティクル数を制限
            if (this.particles.length < 100) {
                this.particles.push({
                    x: centerX + Math.cos(angle) * 100,
                    y: centerY + Math.sin(angle) * 100,
                    vx: -Math.cos(angle) * 3,
                    vy: -Math.sin(angle) * 3,
                    life: 1,
                    size: 8,
                    color: `hsl(${Math.random() * 60 + 40}, 100%, 50%)`
                });
            }
        }
    }
    
    createSlashEffect(x, y) {
        this.slashEffects.push({
            x: x,
            y: y,
            angle: Math.random() * Math.PI * 2,
            life: 1,
            size: 100
        });
    }
    
    createClickEffect(x, y, isCritical) {
        const particleCount = isCritical ? 15 : 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = isCritical ? 15 : 10;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                size: isCritical ? 8 : 5,
                color: isCritical ? 
                    `hsl(${Math.random() * 60}, 100%, 50%)` : 
                    `hsl(${Math.random() * 60 + 30}, 100%, 50%)`
            });
        }
    }
    
    createDamageNumber(x, y, damage, isCritical) {
        const damageDiv = document.createElement('div');
        damageDiv.className = isCritical ? 'damage-number crit' : 'damage-number';
        damageDiv.textContent = isCritical ? `${this.formatNumber(damage)}!` : this.formatNumber(damage);
        
        // キャンバスの位置を取得して、スクリーン座標に変換
        const rect = this.canvas.getBoundingClientRect();
        const screenX = rect.left + (x / this.canvas.width) * rect.width;
        const screenY = rect.top + (y / this.canvas.height) * rect.height;
        
        damageDiv.style.left = (screenX + (Math.random() - 0.5) * 50) + 'px';
        damageDiv.style.top = (screenY + (Math.random() - 0.5) * 50) + 'px';
        document.body.appendChild(damageDiv);
        
        setTimeout(() => {
            damageDiv.remove();
        }, 1500);
    }
    
    drawEnemy() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const shakeX = this.enemyShake * (Math.random() - 0.5);
        const shakeY = this.enemyShake * (Math.random() - 0.5);
        
        this.ctx.save();
        this.ctx.translate(centerX + shakeX, centerY + shakeY);
        
        this.enemyAnimation += 0.05;
        const breathe = Math.sin(this.enemyAnimation) * 5;
        
        // デバッグ: 画像の状態を確認（一度だけ）
        if (!this.debugImageLogged && this.enemy.image) {
            console.log(`画像状態 - complete: ${this.enemy.image.complete}, naturalWidth: ${this.enemy.image.naturalWidth}, src: ${this.enemy.image.src}`);
            this.debugImageLogged = true;
        }
        
        // 画像が読み込まれている場合は画像を表示
        if (this.enemy.image && this.enemy.image.complete && this.enemy.image.naturalWidth > 0) {
            const scale = 1 + breathe * 0.01;
            const imageSize = 640;
            this.ctx.save();
            this.ctx.scale(scale, scale);
            
            // 画像のアスペクト比を保持
            const aspectRatio = this.enemy.image.naturalWidth / this.enemy.image.naturalHeight;
            let drawWidth = imageSize;
            let drawHeight = imageSize;
            
            if (aspectRatio > 1) {
                drawHeight = imageSize / aspectRatio;
            } else {
                drawWidth = imageSize * aspectRatio;
            }
            
            this.ctx.drawImage(
                this.enemy.image, 
                -drawWidth / 2, 
                -drawHeight / 2, 
                drawWidth, 
                drawHeight
            );
            this.ctx.restore();
        } else {
            // 画像がない場合は従来の描画
            switch(this.enemy.type) {
                case 'slime':
                    this.drawSlime(breathe);
                    break;
                case 'demon':
                    this.drawDemon(breathe);
                    break;
                case 'dragon':
                    this.drawDragon(breathe);
                    break;
                case 'boss':
                    this.drawBoss(breathe);
                    break;
            }
        }
        
        this.ctx.restore();
        
        if (this.enemyShake > 0) {
            this.enemyShake *= 0.85;
        }
    }
    
    drawSlime(breathe) {
        const gradient = this.ctx.createRadialGradient(0, -20, 0, 0, 20, 100);
        gradient.addColorStop(0, 'rgba(100, 255, 100, 0.8)');
        gradient.addColorStop(0.5, 'rgba(50, 200, 50, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 150, 0, 0.8)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 80 + breathe, 90 + breathe * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(-20, -30, 20, 30, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(-25, -10, 8, 0, Math.PI * 2);
        this.ctx.arc(25, -10, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawDemon(breathe) {
        this.ctx.fillStyle = '#8B0000';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 90 + breathe, 100 + breathe, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.moveTo(-60, -80);
        this.ctx.lineTo(-40, -120);
        this.ctx.lineTo(-20, -90);
        this.ctx.closePath();
        this.ctx.moveTo(60, -80);
        this.ctx.lineTo(40, -120);
        this.ctx.lineTo(20, -90);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#FF0000';
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.beginPath();
        this.ctx.arc(-30, -20, 12, 0, Math.PI * 2);
        this.ctx.arc(30, -20, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(-40, 20);
        this.ctx.lineTo(-20, 30);
        this.ctx.lineTo(0, 25);
        this.ctx.lineTo(20, 30);
        this.ctx.lineTo(40, 20);
        this.ctx.stroke();
    }
    
    drawDragon(breathe) {
        const gradient = this.ctx.createLinearGradient(-100, -100, 100, 100);
        gradient.addColorStop(0, '#4B0082');
        gradient.addColorStop(0.5, '#8B008B');
        gradient.addColorStop(1, '#9400D3');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 100 + breathe, 110 + breathe, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        for (let i = -3; i <= 3; i++) {
            this.ctx.moveTo(i * 20, -100);
            this.ctx.lineTo(i * 20 - 10, -130);
            this.ctx.lineTo(i * 20 + 10, -130);
            this.ctx.closePath();
        }
        this.ctx.fill();
        
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = '#FF00FF';
        this.ctx.fillStyle = '#FF1493';
        this.ctx.beginPath();
        this.ctx.arc(-35, -30, 15, 0, Math.PI * 2);
        this.ctx.arc(35, -30, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        this.ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 40);
        this.ctx.quadraticCurveTo(-30, 60, -20, 90);
        this.ctx.quadraticCurveTo(0, 80, 20, 90);
        this.ctx.quadraticCurveTo(30, 60, 0, 40);
        this.ctx.fill();
    }
    
    drawBoss(breathe) {
        this.ctx.save();
        this.ctx.scale(1.3, 1.3);
        
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.5, '#1a1a1a');
        gradient.addColorStop(1, '#333333');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 100 + breathe, 100 + breathe, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 5;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#FF0000';
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * 150, Math.sin(angle) * 150);
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
        
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.arc(0, -20, 30, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(0, -20, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    updateBackgroundParticles() {
        this.bgCtx.fillStyle = 'rgba(26, 20, 24, 0.1)';
        this.bgCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        
        this.backgroundParticles.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            if (particle.x < 0 || particle.x > window.innerWidth) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > window.innerHeight) particle.speedY *= -1;
            
            this.bgCtx.save();
            this.bgCtx.globalAlpha = particle.opacity;
            // 桜の花びらのような淡いピンク色
            const hue = 350 + Math.sin(Date.now() * 0.0001) * 10;
            this.bgCtx.fillStyle = `hsl(${hue}, 70%, 80%)`;
            // シンプルな円形に変更（パフォーマンス向上）
            this.bgCtx.beginPath();
            this.bgCtx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            this.bgCtx.fill();
            this.bgCtx.restore();
        });
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            particle.vy += 0.5;
            particle.vx *= 0.98;
            
            if (particle.life > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = particle.color;
                // shadowBlurを削除（パフォーマンス向上）
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                return true;
            }
            return false;
        });
    }
    
    updateSlashEffects() {
        this.slashEffects = this.slashEffects.filter(slash => {
            slash.life -= 0.05;
            
            if (slash.life > 0) {
                this.ctx.save();
                this.ctx.translate(slash.x, slash.y);
                this.ctx.rotate(slash.angle);
                this.ctx.globalAlpha = slash.life;
                
                const gradient = this.ctx.createLinearGradient(-slash.size, 0, slash.size, 0);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(1, 'transparent');
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 5 * slash.life;
                this.ctx.beginPath();
                this.ctx.moveTo(-slash.size, 0);
                this.ctx.lineTo(slash.size, 0);
                this.ctx.stroke();
                
                this.ctx.restore();
                return true;
            }
            return false;
        });
    }
    
    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // フレームスキップを実装（モバイルでは2フレームに1回背景更新）
        this.frameCount = (this.frameCount || 0) + 1;
        const isMobile = window.innerWidth <= 768;
        
        if (!isMobile || this.frameCount % 2 === 0) {
            this.updateBackgroundParticles();
        }
        
        // ペットの自動攻撃
        this.updatePetAttacks();
        
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) {
                this.combo = 0;
            }
        }
        
        this.drawEnemy();
        this.updateSlashEffects();
        this.updateParticles();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updatePetAttacks() {
        if (this.petDPS > 0) {
            const now = Date.now();
            const timeSinceLastAttack = now - this.lastPetAttack;
            
            // 1秒ごとにペットが攻撃
            if (timeSinceLastAttack >= 1000) {
                this.dealDamage(this.petDPS);
                this.createPetAttackEffect();
                this.lastPetAttack = now;
            }
        }
    }
    
    createPetAttackEffect() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // ペットの攻撃エフェクト
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            this.particles.push({
                x: centerX + Math.cos(angle) * 50,
                y: centerY + Math.sin(angle) * 50,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 1,
                size: 6,
                color: `hsl(${Math.random() * 60 + 180}, 100%, 50%)`
            });
        }
        
        // ダメージ表示
        const damageDiv = document.createElement('div');
        damageDiv.className = 'damage-number pet-damage';
        damageDiv.textContent = this.formatNumber(this.petDPS);
        
        const rect = this.canvas.getBoundingClientRect();
        // キャンバスの中心位置を画面座標に変換
        const screenX = rect.left + (centerX / this.canvas.width) * rect.width;
        const screenY = rect.top + (centerY / this.canvas.height) * rect.height;
        
        // ランダムな位置オフセットを追加（画面内に収まるように調整）
        const offsetX = (Math.random() - 0.5) * Math.min(rect.width * 0.3, 100);
        const offsetY = (Math.random() - 0.5) * Math.min(rect.height * 0.3, 100);
        
        damageDiv.style.left = (screenX + offsetX) + 'px';
        damageDiv.style.top = (screenY + offsetY) + 'px';
        document.body.appendChild(damageDiv);
        
        setTimeout(() => {
            damageDiv.remove();
        }, 1500);
    }
    
    saveGame() {
        const saveData = {
            stage: this.stage,
            gold: this.gold,
            clickDamage: this.clickDamage,
            enemy: {
                maxHp: this.enemy.maxHp,
                currentHp: this.enemy.currentHp,
                goldReward: this.enemy.goldReward,
                type: this.enemy.type
            },
            upgrades: this.upgrades.map(upgrade => ({
                id: upgrade.id,
                level: upgrade.level
            })),
            pets: this.pets.map(pet => ({
                id: pet.id,
                level: pet.level
            })),
            petDPS: this.petDPS,
            timestamp: Date.now()
        };
        
        localStorage.setItem('tapHeroSave', JSON.stringify(saveData));
    }
    
    loadGame() {
        const savedData = localStorage.getItem('tapHeroSave');
        if (!savedData) return;
        
        try {
            const data = JSON.parse(savedData);
            
            this.stage = data.stage || 1;
            this.gold = data.gold || 0;
            this.clickDamage = data.clickDamage || 1;
            this.petDPS = data.petDPS || 0;
            
            if (data.enemy) {
                this.enemy.maxHp = data.enemy.maxHp || 100;
                this.enemy.currentHp = data.enemy.currentHp || 100;
                this.enemy.goldReward = data.enemy.goldReward || 10;
                this.enemy.type = data.enemy.type || 'slime';
            }
            
            if (data.upgrades) {
                data.upgrades.forEach(savedUpgrade => {
                    const upgrade = this.upgrades.find(u => u.id === savedUpgrade.id);
                    if (upgrade) {
                        upgrade.level = savedUpgrade.level;
                    }
                });
            }
            
            // ペットデータの読み込み
            if (data.pets) {
                data.pets.forEach(savedPet => {
                    const pet = this.pets.find(p => p.id === savedPet.id);
                    if (pet) {
                        pet.level = savedPet.level;
                    }
                });
            }
            
            // ダメージを再計算
            this.clickDamage = this.baseDamage;
            this.upgrades.forEach(upgrade => {
                this.clickDamage += upgrade.effect * upgrade.level;
            });
            
            this.petDPS = 0;
            this.pets.forEach(pet => {
                this.petDPS += pet.dps * pet.level;
            });
            
            console.log('ゲームデータを読み込みました');
        } catch (error) {
            console.error('セーブデータの読み込みに失敗しました:', error);
        }
    }
    
    resetGame() {
        if (confirm('本当にゲームをリセットしますか？すべての進行状況が失われます。')) {
            localStorage.removeItem('tapHeroSave');
            location.reload();
        }
    }
    
    preloadEnemyImages() {
        // 全41体の敵画像をプリロード
        for (let i = 1; i <= 41; i++) {
            const img = new Image();
            const paddedNumber = String(i).padStart(3, '0');
            // 新しいファイル名（#なし）
            img.src = `assets/${paddedNumber}.png`;
            
            // 画像読み込み完了時の処理
            img.onload = () => {
                console.log(`敵画像 #${paddedNumber} を読み込みました`);
                // 初期の敵画像を設定（最初の画像が読み込まれたとき）
                if (i === 1 && !this.enemy.image) {
                    this.enemy.imageNumber = 1;
                    this.enemy.image = img;
                }
            };
            
            // エラー時の処理
            img.onerror = () => {
                console.error(`敵画像 #${paddedNumber} の読み込みに失敗しました: ${img.src}`);
            };
            
            this.enemyImages[i] = img;
        }
    }
}

const game = new Game();

// Xでシェアする機能
function shareToX() {
    const stage = game.stage;
    const gold = game.formatNumber(game.gold);
    const damage = game.formatNumber(game.clickDamage);
    const dps = game.formatNumber(game.petDPS);
    
    const text = `忍者タップ道場で修行${stage}段階まで到達！\n` +
                `🏯 修行: ${stage}段階\n` +
                `💰 小判: ${gold}\n` +
                `⚔️ 忍術威力: ${damage}\n` +
                `🌟 式神術力: ${dps}/秒\n\n` +
                `#忍者タップ道場`;
    
    const url = window.location.href;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    window.open(shareUrl, '_blank', 'width=550,height=420');
}

// ヘルプモーダルの表示/非表示
function toggleHelp() {
    const helpModal = document.getElementById('helpModal');
    helpModal.classList.toggle('active');
    
    // モーダルが開いているときは背景をクリックで閉じる
    if (helpModal.classList.contains('active')) {
        helpModal.addEventListener('click', function(e) {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }
}

// ページ読み込み時にモーダルが表示されないようにする
document.addEventListener('DOMContentLoaded', function() {
    const helpModal = document.getElementById('helpModal');
    if (helpModal) {
        helpModal.classList.remove('active');
        helpModal.style.display = 'none';
        // 少し遅延してから!importantを適用
        setTimeout(() => {
            helpModal.style.setProperty('display', 'none', 'important');
        }, 100);
    }
});

