// Main JavaScript for Acrylic Stand Website

// ================================
// Gallery Management
// ================================

class GalleryManager {
    constructor() {
        this.storageKey = 'acrylicStandGallery';
        this.init();
    }

    init() {
        this.loadGallery();
    }

    // Get all gallery items from localStorage
    getItems() {
        const items = localStorage.getItem(this.storageKey);
        return items ? JSON.parse(items) : [];
    }

    // Add new item to gallery
    addItem(item) {
        const items = this.getItems();
        const newItem = {
            id: Date.now(),
            imageData: item.imageData,
            size: item.size,
            baseType: item.baseType,
            createdAt: new Date().toISOString()
        };
        items.unshift(newItem); // Add to beginning (newest first)
        localStorage.setItem(this.storageKey, JSON.stringify(items));
        this.loadGallery();
    }

    // Load and display gallery
    loadGallery() {
        const items = this.getItems();
        const galleryGrid = document.getElementById('gallery-grid');
        const galleryEmpty = document.getElementById('gallery-empty');

        if (!galleryGrid) return;

        if (items.length === 0) {
            galleryGrid.style.display = 'none';
            galleryEmpty.style.display = 'block';
            return;
        }

        galleryGrid.style.display = 'grid';
        galleryEmpty.style.display = 'none';
        galleryGrid.innerHTML = '';

        items.forEach(item => {
            const galleryItem = this.createGalleryItem(item);
            galleryGrid.appendChild(galleryItem);
        });
    }

    // Create gallery item element
    createGalleryItem(item) {
        const div = document.createElement('div');
        div.className = 'gallery-item';

        const sizeNames = {
            card: 'カードサイズ',
            postcard: 'はがきサイズ',
            a5: 'A5サイズ',
            a4: 'A4サイズ'
        };

        const date = new Date(item.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}/${month}/${day}`;

        div.innerHTML = `
            <img src="${item.imageData}" alt="Acrylic Stand" class="gallery-image">
            <div class="gallery-info">
                <div class="gallery-size">${sizeNames[item.size] || 'カードサイズ'}</div>
                <div class="gallery-date">${formattedDate}</div>
            </div>
        `;

        return div;
    }

    // Add sample items for demonstration
    addSampleItems() {
        const sampleItems = [
            {
                imageData: this.createSampleImage('Sample 1'),
                size: 'card',
                baseType: 'default'
            },
            {
                imageData: this.createSampleImage('Sample 2'),
                size: 'postcard',
                baseType: 'round'
            },
            {
                imageData: this.createSampleImage('Sample 3'),
                size: 'a5',
                baseType: 'square'
            }
        ];

        // Only add samples if gallery is empty
        if (this.getItems().length === 0) {
            sampleItems.forEach(item => this.addItem(item));
        }
    }

    // Create a simple sample image (colored rectangle)
    createSampleImage(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#E6E6FA');
        gradient.addColorStop(0.5, '#B0E0E6');
        gradient.addColorStop(1, '#FFB6C1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add text
        ctx.fillStyle = '#2C3E50';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        return canvas.toDataURL('image/png');
    }
}

// ================================
// Smooth Scrolling
// ================================

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ================================
// Modal Management
// ================================

class ModalManager {
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            // Only hide overflow on desktop to prevent mobile scrolling issues
            if (window.innerWidth > 768) {
                document.body.style.overflow = 'hidden';
            }
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus first input in modal
            const firstInput = modal.querySelector('input, button, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            // Reset body overflow, let CSS handle it
            document.body.style.overflow = '';
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    static init() {
        // Close modal when clicking on close button
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                modal.style.display = 'none';
                // Reset body overflow, let CSS handle it
                document.body.style.overflow = '';
                modal.setAttribute('aria-hidden', 'true');
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.style.display = 'none';
                    // Reset body overflow, let CSS handle it
                    document.body.style.overflow = '';
                    this.setAttribute('aria-hidden', 'true');
                }
            });
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'flex') {
                        modal.style.display = 'none';
                        // Reset body overflow, let CSS handle it
                        document.body.style.overflow = '';
                        modal.setAttribute('aria-hidden', 'true');
                    }
                });
            }
        });

        // Ensure body overflow is reset on page load
        document.body.style.overflow = '';
    }
}

// ================================
// Initialization
// ================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize gallery
    window.galleryManager = new GalleryManager();
    
    // Add sample items if gallery is empty (for demonstration)
    window.galleryManager.addSampleItems();

    // Initialize smooth scrolling
    initSmoothScrolling();

    // Initialize modal management
    ModalManager.init();

    // Export ModalManager for use in other scripts
    window.ModalManager = ModalManager;
});
