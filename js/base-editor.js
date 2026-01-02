// Base Editor for Acrylic Stand Creator

class BaseEditor {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.canvas = null;
        this.ctx = null;
        
        // Base properties
        this.baseShape = 'rectangle'; // rectangle, rounded, circle, heart, star, custom
        this.baseColor = '#FFB6C1';
        this.baseGradient = null;
        this.gradientEnabled = false;
        this.gradientColor1 = '#FFB6C1';
        this.gradientColor2 = '#E6E6FA';
        this.baseOpacity = 1.0;
        this.baseSize = 100; // Percentage
        this.baseWidth = 200;
        this.baseHeight = 60;
        
        // Text on base
        this.baseTexts = [];
        this.nextTextId = 1;
        this.selectedTextId = null;
        
        // Motifs on base (integrate with decoration system)
        this.baseMotifsEnabled = true;
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.render();
    }
    
    // Create canvas for base rendering
    createCanvas() {
        const baseElement = document.getElementById('selected-base');
        if (!baseElement) return;
        
        // Remove default styling classes that conflict with canvas
        baseElement.classList.remove('base-default', 'base-round', 'base-square');
        baseElement.classList.add('base-custom-canvas');
        
        // Create canvas if it doesn't exist
        let canvas = baseElement.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            baseElement.innerHTML = '';
            baseElement.appendChild(canvas);
        }
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = 300;
        this.canvas.height = 100;
    }
    
    // Set base shape
    setShape(shape) {
        this.baseShape = shape;
        this.render();
    }
    
    // Set base color
    setColor(color) {
        this.baseColor = color;
        if (!this.gradientEnabled) {
            this.render();
        }
    }
    
    // Enable/disable gradient
    setGradientEnabled(enabled) {
        this.gradientEnabled = enabled;
        this.render();
    }
    
    // Set gradient colors
    setGradientColors(color1, color2) {
        this.gradientColor1 = color1;
        this.gradientColor2 = color2;
        if (this.gradientEnabled) {
            this.render();
        }
    }
    
    // Set opacity
    setOpacity(opacity) {
        this.baseOpacity = Math.max(0, Math.min(1, opacity));
        this.render();
    }
    
    // Set size
    setSize(size) {
        this.baseSize = Math.max(50, Math.min(200, size));
        this.render();
    }
    
    // Add text to base
    addText(text, options = {}) {
        const textObj = {
            id: this.nextTextId++,
            text: text,
            x: 50, // Percentage
            y: 50, // Percentage
            fontSize: options.fontSize || 16,
            fontFamily: options.fontFamily || 'sans-serif',
            color: options.color || '#000000',
            rotation: 0
        };
        
        this.baseTexts.push(textObj);
        this.render();
        
        return textObj.id;
    }
    
    // Update text
    updateText(id, text) {
        const textObj = this.baseTexts.find(t => t.id === id);
        if (textObj) {
            textObj.text = text;
            this.render();
        }
    }
    
    // Update text style
    updateTextStyle(id, style) {
        const textObj = this.baseTexts.find(t => t.id === id);
        if (textObj) {
            if (style.fontSize) textObj.fontSize = style.fontSize;
            if (style.fontFamily) textObj.fontFamily = style.fontFamily;
            if (style.color) textObj.color = style.color;
            this.render();
        }
    }
    
    // Update text position
    updateTextPosition(id, x, y) {
        const textObj = this.baseTexts.find(t => t.id === id);
        if (textObj) {
            textObj.x = x;
            textObj.y = y;
            this.render();
        }
    }
    
    // Remove text
    removeText(id) {
        this.baseTexts = this.baseTexts.filter(t => t.id !== id);
        if (this.selectedTextId === id) {
            this.selectedTextId = null;
        }
        this.render();
    }
    
    // Select text for editing
    selectText(id) {
        this.selectedTextId = id;
        this.render();
    }
    
    // Render base
    render() {
        if (!this.canvas || !this.ctx) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Calculate scaled dimensions
        const scale = this.baseSize / 100;
        const scaledWidth = this.baseWidth * scale;
        const scaledHeight = this.baseHeight * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        
        // Set opacity
        ctx.globalAlpha = this.baseOpacity;
        
        // Set fill style
        if (this.gradientEnabled) {
            const gradient = ctx.createLinearGradient(x, y, x + scaledWidth, y + scaledHeight);
            gradient.addColorStop(0, this.gradientColor1);
            gradient.addColorStop(1, this.gradientColor2);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.baseColor;
        }
        
        // Draw shape
        ctx.save();
        ctx.beginPath();
        
        switch (this.baseShape) {
            case 'rectangle':
                ctx.rect(x, y, scaledWidth, scaledHeight);
                break;
                
            case 'rounded':
                this.drawRoundedRect(ctx, x, y, scaledWidth, scaledHeight, 10);
                break;
                
            case 'circle':
                const radius = Math.min(scaledWidth, scaledHeight) / 2;
                ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
                break;
                
            case 'heart':
                this.drawHeart(ctx, width / 2, height / 2, Math.min(scaledWidth, scaledHeight) / 2);
                break;
                
            case 'star':
                this.drawStar(ctx, width / 2, height / 2, 5, Math.min(scaledWidth, scaledHeight) / 2, Math.min(scaledWidth, scaledHeight) / 4);
                break;
                
            case 'custom':
                // For custom shapes, use a polygon or path
                ctx.rect(x, y, scaledWidth, scaledHeight);
                break;
        }
        
        ctx.fill();
        ctx.restore();
        
        // Reset opacity for text
        ctx.globalAlpha = 1.0;
        
        // Draw texts
        this.baseTexts.forEach(textObj => {
            ctx.save();
            
            const textX = (textObj.x / 100) * width;
            const textY = (textObj.y / 100) * height;
            
            ctx.translate(textX, textY);
            ctx.rotate((textObj.rotation * Math.PI) / 180);
            
            ctx.font = `${textObj.fontSize}px ${textObj.fontFamily}`;
            ctx.fillStyle = textObj.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText(textObj.text, 0, 0);
            
            // Draw selection indicator
            if (textObj.id === this.selectedTextId) {
                ctx.strokeStyle = '#007BFF';
                ctx.lineWidth = 2;
                const metrics = ctx.measureText(textObj.text);
                const textWidth = metrics.width;
                const textHeight = textObj.fontSize;
                ctx.strokeRect(-textWidth / 2 - 5, -textHeight / 2 - 5, textWidth + 10, textHeight + 10);
            }
            
            ctx.restore();
        });
    }
    
    // Draw rounded rectangle
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    
    // Draw heart shape
    drawHeart(ctx, x, y, size) {
        ctx.moveTo(x, y + size / 4);
        ctx.bezierCurveTo(x, y, x - size / 2, y - size / 2, x - size, y + size / 4);
        ctx.bezierCurveTo(x - size, y + size / 2, x - size / 2, y + size, x, y + size * 1.3);
        ctx.bezierCurveTo(x + size / 2, y + size, x + size, y + size / 2, x + size, y + size / 4);
        ctx.bezierCurveTo(x + size / 2, y - size / 2, x, y, x, y + size / 4);
    }
    
    // Draw star shape
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
    }
    
    // Get base as data URL
    getBaseImage() {
        if (!this.canvas) return null;
        return this.canvas.toDataURL('image/png');
    }
    
    // Get base configuration
    getConfig() {
        return {
            shape: this.baseShape,
            color: this.baseColor,
            gradientEnabled: this.gradientEnabled,
            gradientColor1: this.gradientColor1,
            gradientColor2: this.gradientColor2,
            opacity: this.baseOpacity,
            size: this.baseSize,
            texts: this.baseTexts
        };
    }
    
    // Set base configuration
    setConfig(config) {
        if (config.shape) this.baseShape = config.shape;
        if (config.color) this.baseColor = config.color;
        if (config.gradientEnabled !== undefined) this.gradientEnabled = config.gradientEnabled;
        if (config.gradientColor1) this.gradientColor1 = config.gradientColor1;
        if (config.gradientColor2) this.gradientColor2 = config.gradientColor2;
        if (config.opacity !== undefined) this.baseOpacity = config.opacity;
        if (config.size) this.baseSize = config.size;
        if (config.texts) this.baseTexts = config.texts;
        
        this.render();
    }
    
    // Setup drag interaction for text
    setupTextDragging() {
        if (!this.canvas) return;
        
        let isDragging = false;
        let draggedTextId = null;
        
        const getMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };
        
        const getTouchPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const touch = e.touches[0];
            
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            };
        };
        
        const findTextAtPosition = (x, y) => {
            for (let i = this.baseTexts.length - 1; i >= 0; i--) {
                const textObj = this.baseTexts[i];
                const textX = (textObj.x / 100) * this.canvas.width;
                const textY = (textObj.y / 100) * this.canvas.height;
                
                this.ctx.font = `${textObj.fontSize}px ${textObj.fontFamily}`;
                const metrics = this.ctx.measureText(textObj.text);
                const textWidth = metrics.width;
                const textHeight = textObj.fontSize;
                
                if (Math.abs(x - textX) < textWidth / 2 + 5 && Math.abs(y - textY) < textHeight / 2 + 5) {
                    return textObj.id;
                }
            }
            return null;
        };
        
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = getMousePos(e);
            const textId = findTextAtPosition(pos.x, pos.y);
            
            if (textId) {
                isDragging = true;
                draggedTextId = textId;
                this.selectText(textId);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (isDragging && draggedTextId) {
                const pos = getMousePos(e);
                const xPercent = (pos.x / this.canvas.width) * 100;
                const yPercent = (pos.y / this.canvas.height) * 100;
                this.updateTextPosition(draggedTextId, xPercent, yPercent);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
            draggedTextId = null;
        });
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const pos = getTouchPos(e);
            const textId = findTextAtPosition(pos.x, pos.y);
            
            if (textId) {
                isDragging = true;
                draggedTextId = textId;
                this.selectText(textId);
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (isDragging && draggedTextId) {
                const pos = getTouchPos(e);
                const xPercent = (pos.x / this.canvas.width) * 100;
                const yPercent = (pos.y / this.canvas.height) * 100;
                this.updateTextPosition(draggedTextId, xPercent, yPercent);
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            isDragging = false;
            draggedTextId = null;
        });
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BaseEditor = BaseEditor;
}
