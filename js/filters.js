// Image Filters Module for Acrylic Stand Creator

class ImageFilters {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.originalImageData = null;
        this.currentFilter = 'none';
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            blur: 0
        };
    }

    // Save original image data for reset
    saveOriginalImageData() {
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    // Reset to original image
    reset() {
        if (this.originalImageData) {
            this.ctx.putImageData(this.originalImageData, 0, 0);
            this.currentFilter = 'none';
            this.adjustments = {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                blur: 0
            };
        }
    }

    // Apply predefined filters
    applyFilter(filterName) {
        console.log('[Filters] applyFilter called with:', filterName);
        console.log('[Filters] Canvas:', this.canvas.width, 'x', this.canvas.height);
        console.log('[Filters] Context:', this.ctx);
        
        // Always save current state as original if not already saved
        if (!this.originalImageData) {
            this.saveOriginalImageData();
            console.log('[Filters] Original image data saved');
        }
        
        // If changing to a different filter, restore original first
        if (this.currentFilter !== filterName && this.originalImageData) {
            this.ctx.putImageData(this.originalImageData, 0, 0);
            console.log('[Filters] Restored original image');
        }

        this.currentFilter = filterName;
        console.log('[Filters] Current filter set to:', this.currentFilter);

        if (filterName === 'none') {
            // Reset to original
            if (this.originalImageData) {
                this.ctx.putImageData(this.originalImageData, 0, 0);
                console.log('[Filters] Reset to original (none filter)');
            }
            return;
        }

        console.log('[Filters] Applying filter:', filterName);
        
        switch(filterName) {
            case 'grayscale':
                this.grayscale();
                break;
            case 'sepia':
                this.sepia();
                break;
            case 'vintage':
                this.vintage();
                break;
            case 'invert':
                this.invert();
                break;
            case 'brighten':
                this.brightness(30);
                break;
            case 'darken':
                this.brightness(-30);
                break;
            case 'high-contrast':
                this.contrast(40);
                break;
            case 'blur':
                this.blur(3);
                break;
            default:
                console.warn('[Filters] Unknown filter:', filterName);
                break;
        }
        
        console.log('[Filters] Filter application complete');
    }

    // Grayscale filter
    grayscale() {
        console.log('[Filters] Applying grayscale filter');
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;     // Red
            data[i + 1] = avg; // Green
            data[i + 2] = avg; // Blue
        }

        this.ctx.putImageData(imageData, 0, 0);
        console.log('[Filters] Grayscale filter applied');
    }

    // Sepia filter
    sepia() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    // Vintage filter (sepia + vignette + grain)
    vintage() {
        // Apply sepia first
        this.sepia();

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        for (let y = 0; y < this.canvas.height; y++) {
            for (let x = 0; x < this.canvas.width; x++) {
                const i = (y * this.canvas.width + x) * 4;
                
                // Vignette effect
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const vignette = 1 - (dist / maxDist) * 0.5;

                // Add grain
                const grain = (Math.random() - 0.5) * 15;

                data[i] = Math.max(0, Math.min(255, data[i] * vignette + grain));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * vignette + grain));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * vignette + grain));
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    // Invert colors
    invert() {
        console.log('[Filters] Applying invert filter');
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];         // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
        }

        this.ctx.putImageData(imageData, 0, 0);
        console.log('[Filters] Invert filter applied');
    }

    // Brightness adjustment (-100 to 100)
    brightness(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] + value));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + value));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + value));
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.adjustments.brightness = value;
    }

    // Contrast adjustment (-50 to 50, more gentle)
    contrast(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        // Gentler contrast formula: value is now between -50 and 50
        const factor = (value + 100) / 100;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.adjustments.contrast = value;
    }

    // Saturation adjustment (-100 to 100)
    saturation(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const factor = (value + 100) / 100;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;

            data[i] = Math.max(0, Math.min(255, gray + factor * (r - gray)));
            data[i + 1] = Math.max(0, Math.min(255, gray + factor * (g - gray)));
            data[i + 2] = Math.max(0, Math.min(255, gray + factor * (b - gray)));
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.adjustments.saturation = value;
    }

    // Simple blur effect
    blur(radius = 3) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const output = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const i = (ny * width + nx) * 4;
                            r += data[i];
                            g += data[i + 1];
                            b += data[i + 2];
                            count++;
                        }
                    }
                }

                const i = (y * width + x) * 4;
                output[i] = r / count;
                output[i + 1] = g / count;
                output[i + 2] = b / count;
                output[i + 3] = data[i + 3]; // Preserve alpha channel
            }
        }

        for (let i = 0; i < data.length; i += 4) {
            data[i] = output[i];
            data[i + 1] = output[i + 1];
            data[i + 2] = output[i + 2];
            data[i + 3] = output[i + 3]; // Preserve alpha channel
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.adjustments.blur = radius;
    }

    // Apply adjustment with slider value
    applyAdjustment(type, value) {
        console.log('[Filters] applyAdjustment called:', type, value);
        
        // Update the adjustment value first
        this.adjustments[type] = value;
        
        // Check if all adjustments are at default (0)
        const allDefault = this.adjustments.brightness === 0 &&
                          this.adjustments.contrast === 0 &&
                          this.adjustments.saturation === 0 &&
                          this.adjustments.blur === 0;
        
        if (allDefault) {
            // All adjustments are 0, just show original
            if (this.originalImageData) {
                this.ctx.putImageData(this.originalImageData, 0, 0);
                console.log('[Filters] All adjustments at 0, showing original');
            }
            return;
        }
        
        // Save original if not already saved
        if (!this.originalImageData) {
            this.saveOriginalImageData();
            console.log('[Filters] Original image data saved for adjustments');
        }
        
        // Start from original image
        this.ctx.putImageData(this.originalImageData, 0, 0);
        
        // Apply adjustments in order, only if not zero
        if (this.adjustments.brightness !== 0) {
            console.log('[Filters] Applying brightness:', this.adjustments.brightness);
            this.brightness(this.adjustments.brightness);
        }
        
        if (this.adjustments.contrast !== 0) {
            console.log('[Filters] Applying contrast:', this.adjustments.contrast);
            this.contrast(this.adjustments.contrast);
        }
        
        if (this.adjustments.saturation !== 0) {
            console.log('[Filters] Applying saturation:', this.adjustments.saturation);
            this.saturation(this.adjustments.saturation);
        }
        
        if (this.adjustments.blur > 0) {
            console.log('[Filters] Applying blur:', this.adjustments.blur);
            this.blur(this.adjustments.blur);
        }
        
        console.log('[Filters] Adjustment complete');
    }

    // Simple background removal (chroma key / color threshold)
    removeBackground(targetColor = { r: 255, g: 255, b: 255 }, threshold = 30) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate color distance
            const distance = Math.sqrt(
                Math.pow(r - targetColor.r, 2) +
                Math.pow(g - targetColor.g, 2) +
                Math.pow(b - targetColor.b, 2)
            );

            // If color is close to target, make it transparent
            if (distance < threshold) {
                data[i + 3] = 0; // Set alpha to 0
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    // Edge-based background removal (simplified)
    smartRemoveBackground() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Sample corners to detect background color
        const corners = [
            { x: 0, y: 0 },
            { x: width - 1, y: 0 },
            { x: 0, y: height - 1 },
            { x: width - 1, y: height - 1 }
        ];

        let avgR = 0, avgG = 0, avgB = 0;
        corners.forEach(corner => {
            const i = (corner.y * width + corner.x) * 4;
            avgR += data[i];
            avgG += data[i + 1];
            avgB += data[i + 2];
        });

        const bgColor = {
            r: avgR / corners.length,
            g: avgG / corners.length,
            b: avgB / corners.length
        };

        // Remove background based on detected color
        this.removeBackground(bgColor, 50);
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.ImageFilters = ImageFilters;
    console.log('[Filters] ImageFilters class exported to window');
}
