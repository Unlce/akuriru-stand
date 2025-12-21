// Image Cropping Tool for Acrylic Stand Editor

class CroppingTool {
    constructor(canvas, onCropComplete) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onCropComplete = onCropComplete;
        
        // Cropping state
        this.isActive = false;
        this.currentTool = 'freehand'; // 'freehand', 'polygon', 'eraser'
        this.isDrawing = false;
        this.brushSize = 20;
        
        // Original image data
        this.originalImageData = null;
        this.croppedCanvas = null;
        this.maskCanvas = null;
        this.maskCtx = null;
        
        // Drawing paths
        this.currentPath = [];
        this.polygonPoints = [];
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 20;
        
        this.init();
    }
    
    init() {
        // Create mask canvas for cropping
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d');
        
        // Setup event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    // Activate cropping mode
    activate(imageData) {
        if (!imageData) return;
        
        this.isActive = true;
        this.originalImageData = imageData;
        
        // Initialize mask canvas
        this.maskCanvas.width = this.canvas.width;
        this.maskCanvas.height = this.canvas.height;
        
        // Start with full mask (everything selected)
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        // Save initial state
        this.saveHistory();
        
        // Note: renderPreview() will be called by the parent editor's render() method
    }
    
    // Deactivate cropping mode
    deactivate() {
        this.isActive = false;
        this.currentPath = [];
        this.polygonPoints = [];
        this.isDrawing = false;
    }
    
    // Set current tool
    setTool(tool) {
        this.currentTool = tool;
        this.currentPath = [];
        this.polygonPoints = [];
        this.isDrawing = false;
    }
    
    // Set brush size for eraser
    setBrushSize(size) {
        this.brushSize = Math.max(5, Math.min(100, size));
    }
    
    // Mouse event handlers
    handleMouseDown(e) {
        if (!this.isActive) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentTool === 'freehand' || this.currentTool === 'eraser') {
            this.isDrawing = true;
            this.currentPath = [{ x, y }];
        } else if (this.currentTool === 'polygon') {
            this.polygonPoints.push({ x, y });
            this.renderPreview();
        }
    }
    
    handleMouseMove(e) {
        if (!this.isActive) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDrawing && (this.currentTool === 'freehand' || this.currentTool === 'eraser')) {
            this.currentPath.push({ x, y });
            this.drawPath();
        }
        
        // Show cursor preview
        this.renderPreview();
    }
    
    handleMouseUp(e) {
        if (!this.isActive) return;
        
        if (this.isDrawing) {
            this.isDrawing = false;
            
            if (this.currentTool === 'freehand') {
                this.applyFreehandSelection();
            } else if (this.currentTool === 'eraser') {
                this.applyEraser();
            }
            
            this.currentPath = [];
            this.saveHistory();
            this.renderPreview();
        }
    }
    
    // Touch event handlers
    handleTouchStart(e) {
        e.preventDefault();
        if (!this.isActive || e.touches.length === 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (this.currentTool === 'freehand' || this.currentTool === 'eraser') {
            this.isDrawing = true;
            this.currentPath = [{ x, y }];
        } else if (this.currentTool === 'polygon') {
            this.polygonPoints.push({ x, y });
            this.renderPreview();
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isActive || !this.isDrawing || e.touches.length === 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (this.currentTool === 'freehand' || this.currentTool === 'eraser') {
            this.currentPath.push({ x, y });
            this.drawPath();
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.isActive) return;
        
        if (this.isDrawing) {
            this.isDrawing = false;
            
            if (this.currentTool === 'freehand') {
                this.applyFreehandSelection();
            } else if (this.currentTool === 'eraser') {
                this.applyEraser();
            }
            
            this.currentPath = [];
            this.saveHistory();
            this.renderPreview();
        }
    }
    
    // Draw current path
    drawPath() {
        if (this.currentPath.length < 2) return;
        
        this.renderPreview();
        
        this.ctx.save();
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 123, 255, 0.8)';
        this.ctx.lineWidth = this.currentTool === 'eraser' ? this.brushSize : 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        
        for (let i = 1; i < this.currentPath.length; i++) {
            this.ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    // Apply freehand selection to mask
    applyFreehandSelection() {
        if (this.currentPath.length < 3) return;
        
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.beginPath();
        this.maskCtx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        
        for (let i = 1; i < this.currentPath.length; i++) {
            this.maskCtx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        
        this.maskCtx.closePath();
        this.maskCtx.fill();
    }
    
    // Apply polygon selection to mask
    applyPolygonSelection() {
        if (this.polygonPoints.length < 3) return;
        
        // Clear previous mask
        this.maskCtx.fillStyle = 'black';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        // Draw polygon
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.beginPath();
        this.maskCtx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
        
        for (let i = 1; i < this.polygonPoints.length; i++) {
            this.maskCtx.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
        }
        
        this.maskCtx.closePath();
        this.maskCtx.fill();
        
        this.polygonPoints = [];
        this.saveHistory();
        this.renderPreview();
    }
    
    // Apply eraser to mask
    applyEraser() {
        if (this.currentPath.length < 2) return;
        
        this.maskCtx.globalCompositeOperation = 'destination-out';
        this.maskCtx.strokeStyle = 'black';
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
    }
    
    // Complete polygon selection
    completePolygon() {
        if (this.currentTool === 'polygon' && this.polygonPoints.length >= 3) {
            this.applyPolygonSelection();
        }
    }
    
    // Clear polygon points
    clearPolygon() {
        this.polygonPoints = [];
        this.renderPreview();
    }
    
    // Render preview with mask overlay
    renderPreview() {
        // This will be called by the parent editor to redraw the base image
        // then we overlay the mask visualization
        if (!this.isActive) return;
        
        // Create overlay canvas
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = this.canvas.width;
        overlayCanvas.height = this.canvas.height;
        const overlayCtx = overlayCanvas.getContext('2d');
        
        // Draw dark overlay on ALL areas first
        overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        // Clear selected areas using the mask
        // Use destination-out to remove overlay where mask is white
        overlayCtx.globalCompositeOperation = 'destination-out';
        overlayCtx.drawImage(this.maskCanvas, 0, 0);
        overlayCtx.globalCompositeOperation = 'source-over';
        
        // Draw overlay on main canvas
        this.ctx.drawImage(overlayCanvas, 0, 0);
        
        // Draw polygon points if in polygon mode
        if (this.currentTool === 'polygon' && this.polygonPoints.length > 0) {
            this.ctx.save();
            this.ctx.strokeStyle = '#007BFF';
            this.ctx.fillStyle = '#007BFF';
            this.ctx.lineWidth = 2;
            
            // Draw lines between points
            if (this.polygonPoints.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
                for (let i = 1; i < this.polygonPoints.length; i++) {
                    this.ctx.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
                }
                this.ctx.stroke();
            }
            
            // Draw points
            this.polygonPoints.forEach(point => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            this.ctx.restore();
        }
    }
    
    // Apply crop and return cropped image
    applyCrop() {
        if (!this.isActive || !this.originalImageData) return null;
        
        // Create result canvas
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = this.canvas.width;
        resultCanvas.height = this.canvas.height;
        const resultCtx = resultCanvas.getContext('2d');
        
        // Draw original image
        const img = new Image();
        img.src = this.originalImageData;
        
        return new Promise((resolve) => {
            img.onload = () => {
                // Draw image
                resultCtx.drawImage(img, 0, 0, resultCanvas.width, resultCanvas.height);
                
                // Apply mask
                resultCtx.globalCompositeOperation = 'destination-in';
                resultCtx.drawImage(this.maskCanvas, 0, 0);
                resultCtx.globalCompositeOperation = 'source-over';
                
                resolve(resultCanvas.toDataURL('image/png'));
            };
        });
    }
    
    // Reset to original image
    reset() {
        this.maskCtx.fillStyle = 'white';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        this.currentPath = [];
        this.polygonPoints = [];
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();
        this.renderPreview();
    }
    
    // Save current state to history
    saveHistory() {
        // Remove any states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Save current mask state
        const maskData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        this.history.push(maskData);
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }
    
    // Undo last action
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const maskData = this.history[this.historyIndex];
            this.maskCtx.putImageData(maskData, 0, 0);
            this.renderPreview();
        }
    }
    
    // Redo last undone action
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const maskData = this.history[this.historyIndex];
            this.maskCtx.putImageData(maskData, 0, 0);
            this.renderPreview();
        }
    }
    
    // Check if can undo
    canUndo() {
        return this.historyIndex > 0;
    }
    
    // Check if can redo
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CroppingTool = CroppingTool;
}
