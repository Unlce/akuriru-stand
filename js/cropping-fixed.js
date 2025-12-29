// Simplified Image Cropping Tool for Acrylic Stand Editor

class CroppingTool {
    constructor(canvas, onCropComplete) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.onCropComplete = onCropComplete;
        
        // Cropping state
        this.isActive = false;
        this.currentTool = 'rectangle'; // 'rectangle' or 'freehand'
        this.isDrawing = false;
        this.brushSize = 30;
        
        // Rectangle selection
        this.rectStart = null;
        this.rectEnd = null;
        
        // Freehand path
        this.currentPath = [];
        
        // Mask for tracking what to keep
        this.maskCanvas = null;
        this.maskCtx = null;
        
        // Original image
        this.originalImageData = null;
        
        this.init();
    }
    
    init() {
        // Create mask canvas
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });
        
        // Setup event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        console.log('[CroppingTool] Initialized');
    }
    
    activate(imageData) {
        console.log('[CroppingTool] Activate called with:', typeof imageData, imageData instanceof ImageData);
        
        if (!imageData) {
            console.error('[CroppingTool] No image data provided');
            return;
        }
        
        if (!(imageData instanceof ImageData)) {
            console.error('[CroppingTool] Parameter is not ImageData:', typeof imageData);
            return;
        }
        
        this.isActive = true;
        this.originalImageData = imageData;
        
        // Initialize mask
        this.maskCanvas.width = imageData.width;
        this.maskCanvas.height = imageData.height;
        
        // Always start with everything selected (white) - more intuitive
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        console.log('[CroppingTool] Activated with tool:', this.currentTool);
        console.log('[CroppingTool] ImageData size:', imageData.width, 'x', imageData.height);
        console.log('[CroppingTool] Initial mask: all white (everything selected)');
        this.renderPreview();
    }
    
    deactivate() {
        this.isActive = false;
        this.isDrawing = false;
        this.rectStart = null;
        this.rectEnd = null;
        this.currentPath = [];
        console.log('[CroppingTool] Deactivated');
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.isDrawing = false;
        this.rectStart = null;
        this.rectEnd = null;
        this.currentPath = [];

        // Keep mask as is when switching tools - don't reset
        // User's work is preserved
        
        if (this.isActive) {
            this.renderPreview();
        }
        
        console.log('[CroppingTool] Tool changed to:', tool);
    }
    
    setBrushSize(size) {
        this.brushSize = Math.max(5, Math.min(100, size));
    }
    
    // Get coordinates from event
    getCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        console.log('[CroppingTool] coords:', {x, y, scaleX, scaleY, canvasW: this.canvas.width, rectW: rect.width});
        return { x, y };
    }
    
    // Mouse handlers
    handleMouseDown(e) {
        if (!this.isActive) return;
        
        const coords = this.getCoords(e);
        
        if (this.currentTool === 'rectangle') {
            this.rectStart = coords;
            this.rectEnd = coords;
            this.isDrawing = true;
        } else if (this.currentTool === 'freehand') {
            this.isDrawing = true;
            this.currentPath = [coords];
        }
    }
    
    handleMouseMove(e) {
        if (!this.isActive) return;
        
        const coords = this.getCoords(e);
        
        if (this.isDrawing) {
            if (this.currentTool === 'rectangle') {
                this.rectEnd = coords;
                this.renderPreview();
            } else if (this.currentTool === 'freehand') {
                this.currentPath.push(coords);
                this.drawCurrentPath();
            }
        }
    }
    
    handleMouseUp(e) {
        if (!this.isActive || !this.isDrawing) return;
        
        if (this.currentTool === 'rectangle') {
            this.applyRectangle();
        } else if (this.currentTool === 'freehand') {
            this.applyFreehand();
        }
        
        this.isDrawing = false;
        this.currentPath = [];
        this.renderPreview();
    }
    
    // Touch handlers
    handleTouchStart(e) {
        e.preventDefault();
        if (!this.isActive || e.touches.length === 0) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const coords = {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
        
        if (this.currentTool === 'rectangle') {
            this.rectStart = coords;
            this.rectEnd = coords;
            this.isDrawing = true;
        } else {
            this.isDrawing = true;
            this.currentPath = [coords];
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isActive || !this.isDrawing || e.touches.length === 0) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const coords = {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
        
        if (this.currentTool === 'rectangle') {
            this.rectEnd = coords;
            this.renderPreview();
        } else {
            this.currentPath.push(coords);
            this.drawCurrentPath();
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp(e);
    }
    
    // Apply rectangle selection
    applyRectangle() {
        if (!this.rectStart || !this.rectEnd) return;
        
        const x = Math.min(this.rectStart.x, this.rectEnd.x);
        const y = Math.min(this.rectStart.y, this.rectEnd.y);
        const w = Math.abs(this.rectEnd.x - this.rectStart.x);
        const h = Math.abs(this.rectEnd.y - this.rectStart.y);
        
        // Clear mask and draw white rectangle (selected area)
        this.maskCtx.fillStyle = 'black';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.fillRect(x, y, w, h);
        
        this.rectStart = null;
        this.rectEnd = null;
        
        console.log('[CroppingTool] Rectangle applied:', { x, y, w, h });
    }
    
    // Apply freehand selection
    applyFreehand() {
        if (this.currentPath.length < 2) return;
        
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.strokeStyle = 'white';
        this.maskCtx.lineWidth = this.brushSize;
        this.maskCtx.lineCap = 'round';
        this.maskCtx.lineJoin = 'round';
        
        this.maskCtx.beginPath();
        this.maskCtx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        for (let i = 1; i < this.currentPath.length; i++) {
            this.maskCtx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        this.maskCtx.stroke();
        
        console.log('[CroppingTool] Freehand applied');
    }
    
    // Apply eraser
    applyEraser() {
        if (this.currentPath.length < 2) return;
        
        this.maskCtx.globalCompositeOperation = 'destination-out';
        this.maskCtx.strokeStyle = 'white';
        this.maskCtx.lineWidth = this.brushSize;
        this.maskCtx.lineCap = 'round';
        this.maskCtx.lineJoin = 'round';
        
        this.maskCtx.beginPath();
        this.maskCtx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        for (let i = 1; i < this.currentPath.length; i++) {
            this.maskCtx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        this.maskCtx.stroke();
        
        this.maskCtx.globalCompositeOperation = 'source-over';
        
        console.log('[CroppingTool] Eraser applied');
    }
    
    // Draw current path in real-time
    drawCurrentPath() {
        this.renderPreview();
        
        if (this.currentPath.length < 2) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.7)';
        ctx.lineWidth = this.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        for (let i = 1; i < this.currentPath.length; i++) {
            ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Render preview with mask overlay
    renderPreview() {
        if (!this.isActive || !this.originalImageData) return;
        
        const ctx = this.ctx;
        
        // Draw original image
        ctx.putImageData(this.originalImageData, 0, 0);
        
        // Draw semi-transparent red overlay for non-selected areas
        const maskData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < maskData.data.length; i += 4) {
            if (maskData.data[i] === 0) { // Black in mask = not selected
                // Add red tint and darken to show it will be removed
                imageData.data[i] = imageData.data[i] * 0.3 + 50; // R
                imageData.data[i + 1] = imageData.data[i + 1] * 0.3; // G
                imageData.data[i + 2] = imageData.data[i + 2] * 0.3; // B
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Draw rectangle outline if drawing
        if (this.isDrawing && this.currentTool === 'rectangle' && this.rectStart && this.rectEnd) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                this.rectStart.x,
                this.rectStart.y,
                this.rectEnd.x - this.rectStart.x,
                this.rectEnd.y - this.rectStart.y
            );
            ctx.restore();
        }
    }
    
    // Apply the crop and return canvas
    applyCrop(callback) {
        console.log('[CroppingTool] ===== applyCrop called =====');
        console.log('[CroppingTool] originalImageData exists:', !!this.originalImageData);
        console.log('[CroppingTool] originalImageData size:', this.originalImageData?.width, 'x', this.originalImageData?.height);
        console.log('[CroppingTool] canvas size:', this.canvas.width, 'x', this.canvas.height);
        
        if (!this.originalImageData) {
            console.error('[CroppingTool] No original image data');
            return callback(null);
        }
        
        // Create result canvas
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = this.originalImageData.width;
        resultCanvas.height = this.originalImageData.height;
        const resultCtx = resultCanvas.getContext('2d', { willReadFrequently: true });
        
        console.log('[CroppingTool] resultCanvas size:', resultCanvas.width, 'x', resultCanvas.height);
        console.log('[CroppingTool] resultCtx created:', !!resultCtx);
        
        try {
            console.log('[CroppingTool] Step 1: Drawing original image...');
            // Draw original image
            resultCtx.putImageData(this.originalImageData, 0, 0);
            console.log('[CroppingTool] Step 1: Complete');
            
            console.log('[CroppingTool] Step 2: Getting mask data...');
            // Apply mask
            const maskData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
            console.log('[CroppingTool] Step 2: maskData size:', maskData.width, 'x', maskData.height);
            
            console.log('[CroppingTool] Step 3: Getting result data...');
            const resultData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
            console.log('[CroppingTool] Step 3: resultData size:', resultData.width, 'x', resultData.height);
            
            console.log('[CroppingTool] Step 4: Processing pixels...');
            console.log('[CroppingTool] Processing', maskData.data.length / 4, 'pixels');
            
            // Apply transparency based on mask
            for (let i = 0; i < maskData.data.length; i += 4) {
                if (maskData.data[i] === 0) { // Black = remove
                    resultData.data[i + 3] = 0;
                }
            }
            console.log('[CroppingTool] Step 4: Complete');
            
            console.log('[CroppingTool] Step 5: Putting data back...');
            resultCtx.putImageData(resultData, 0, 0);
            console.log('[CroppingTool] Step 5: Complete');
            
            console.log('[CroppingTool] Step 6: Converting to blob...');
            // Convert to blob URL
            resultCanvas.toBlob((blob) => {
                console.log('[CroppingTool] Blob callback called');
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    console.log('[CroppingTool] Crop applied successfully, blob size:', blob.size);
                    callback(url);
                } else {
                    console.error('[CroppingTool] Failed to create blob');
                    callback(null);
                }
            }, 'image/png');
            console.log('[CroppingTool] Step 6: toBlob called, waiting for callback...');
        } catch (err) {
            console.error('[CroppingTool] Error in applyCrop:', err);
            console.error('[CroppingTool] Error stack:', err.stack);
            callback(null);
        }
    }
    
    // Reset mask
    reset() {
        // Reset to all selected (white)
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        this.renderPreview();
        console.log('[CroppingTool] Reset - all selected');
    }
}

// Export to window
if (typeof window !== 'undefined') {
    window.CroppingTool = CroppingTool;
}
