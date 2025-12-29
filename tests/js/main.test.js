/**
 * Main.js Tests
 * Tests for GalleryManager and ModalManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import main.js components
import {
    GalleryManager,
    ModalManager,
    initSmoothScrolling
} from '../../js/main.js';

describe('GalleryManager', () => {
  let galleryManager;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="gallery-grid"></div>
      <div id="gallery-empty"></div>
    `;
    galleryManager = new GalleryManager();
  });

  describe('Initialization', () => {
    it('should initialize with storage key', () => {
      expect(galleryManager.storageKey).toBe('acrylicStandGallery');
    });

    it('should return empty array when no items exist', () => {
      const items = galleryManager.getItems();
      expect(items).toEqual([]);
    });
  });

  describe('Add Item', () => {
    it('should add item to gallery', () => {
      const item = {
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default'
      };

      galleryManager.addItem(item);
      const items = galleryManager.getItems();

      expect(items).toHaveLength(1);
      expect(items[0].size).toBe('card');
      expect(items[0].baseType).toBe('default');
    });

    it('should add item with timestamp id', () => {
      const item = {
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default'
      };

      const beforeTime = Date.now();
      galleryManager.addItem(item);
      const afterTime = Date.now();

      const items = galleryManager.getItems();
      expect(items[0].id).toBeGreaterThanOrEqual(beforeTime);
      expect(items[0].id).toBeLessThanOrEqual(afterTime);
    });

    it('should add item with ISO timestamp', () => {
      const item = {
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default'
      };

      galleryManager.addItem(item);
      const items = galleryManager.getItems();

      expect(items[0].createdAt).toBeTruthy();
      const date = new Date(items[0].createdAt);
      expect(date.toISOString()).toBe(items[0].createdAt);
    });

    it('should add newest items first', () => {
      const item1 = {
        imageData: 'data:image/png;base64,test1',
        size: 'card',
        baseType: 'default'
      };
      const item2 = {
        imageData: 'data:image/png;base64,test2',
        size: 'postcard',
        baseType: 'round'
      };

      galleryManager.addItem(item1);
      galleryManager.addItem(item2);

      const items = galleryManager.getItems();
      expect(items[0].size).toBe('postcard'); // Newest first
      expect(items[1].size).toBe('card');
    });

    it('should persist items to localStorage', () => {
      const item = {
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default'
      };

      galleryManager.addItem(item);

      const stored = localStorage.getItem('acrylicStandGallery');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
    });
  });

  describe('Get Items', () => {
    it('should retrieve items from localStorage', () => {
      const items = [{
        id: 12345,
        imageData: 'test',
        size: 'card',
        baseType: 'default',
        createdAt: new Date().toISOString()
      }];

      localStorage.setItem('acrylicStandGallery', JSON.stringify(items));

      const retrieved = galleryManager.getItems();
      expect(retrieved).toEqual(items);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('acrylicStandGallery', 'invalid json');

      expect(() => galleryManager.getItems()).toThrow();
    });
  });

  describe('Load Gallery', () => {
    it('should show empty state when no items', () => {
      galleryManager.loadGallery();

      const grid = document.getElementById('gallery-grid');
      const empty = document.getElementById('gallery-empty');

      expect(grid.style.display).toBe('none');
      expect(empty.style.display).toBe('block');
    });

    it('should show grid when items exist', () => {
      const item = {
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default'
      };

      galleryManager.addItem(item);

      const grid = document.getElementById('gallery-grid');
      const empty = document.getElementById('gallery-empty');

      expect(grid.style.display).toBe('grid');
      expect(empty.style.display).toBe('none');
    });

    it('should render gallery items', () => {
      const item = {
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default'
      };

      galleryManager.addItem(item);

      const grid = document.getElementById('gallery-grid');
      const items = grid.querySelectorAll('.gallery-item');

      expect(items.length).toBe(1);
    });

    it('should handle missing gallery grid element', () => {
      document.body.innerHTML = '';
      expect(() => galleryManager.loadGallery()).not.toThrow();
    });
  });

  describe('Create Gallery Item', () => {
    it('should create gallery item element', () => {
      const item = {
        id: 12345,
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default',
        createdAt: new Date().toISOString()
      };

      const element = galleryManager.createGalleryItem(item);

      expect(element.className).toBe('gallery-item');
      expect(element.querySelector('.gallery-image')).toBeTruthy();
      expect(element.querySelector('.gallery-info')).toBeTruthy();
    });

    it('should display correct size name', () => {
      const item = {
        id: 12345,
        imageData: 'data:image/png;base64,test',
        size: 'postcard',
        baseType: 'default',
        createdAt: new Date().toISOString()
      };

      const element = galleryManager.createGalleryItem(item);
      const sizeElement = element.querySelector('.gallery-size');

      expect(sizeElement.textContent).toBe('はがきサイズ');
    });

    it('should format date correctly', () => {
      const date = new Date('2025-01-15T10:30:00');
      const item = {
        id: 12345,
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default',
        createdAt: date.toISOString()
      };

      const element = galleryManager.createGalleryItem(item);
      const dateElement = element.querySelector('.gallery-date');

      expect(dateElement.textContent).toBe('2025/01/15');
    });

    it('should handle all size types', () => {
      const sizes = {
        card: 'カードサイズ',
        postcard: 'はがきサイズ',
        a5: 'A5サイズ',
        a4: 'A4サイズ'
      };

      Object.entries(sizes).forEach(([size, expected]) => {
        const item = {
          id: 12345,
          imageData: 'data:image/png;base64,test',
          size,
          baseType: 'default',
          createdAt: new Date().toISOString()
        };

        const element = galleryManager.createGalleryItem(item);
        const sizeElement = element.querySelector('.gallery-size');

        expect(sizeElement.textContent).toBe(expected);
      });
    });

    it('should use default size for unknown size', () => {
      const item = {
        id: 12345,
        imageData: 'data:image/png;base64,test',
        size: 'unknown',
        baseType: 'default',
        createdAt: new Date().toISOString()
      };

      const element = galleryManager.createGalleryItem(item);
      const sizeElement = element.querySelector('.gallery-size');

      expect(sizeElement.textContent).toBe('カードサイズ');
    });
  });

  describe('Sample Items', () => {
    // Skip these tests as they require Canvas API features (createLinearGradient)
    // which are not fully supported in happy-dom test environment
    it.skip('should add sample items when gallery is empty', () => {
      galleryManager.addSampleItems();

      const items = galleryManager.getItems();
      expect(items.length).toBeGreaterThan(0);
    });

    it.skip('should not add samples when gallery has items', () => {
      galleryManager.addItem({
        imageData: 'data:image/png;base64,test',
        size: 'card',
        baseType: 'default'
      });

      const countBefore = galleryManager.getItems().length;
      galleryManager.addSampleItems();
      const countAfter = galleryManager.getItems().length;

      expect(countAfter).toBe(countBefore);
    });
  });
});

describe('ModalManager', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-modal" class="modal" aria-hidden="true" style="display: none;">
        <div class="modal-content">
          <button class="close-modal">×</button>
          <input type="text" id="test-input">
        </div>
      </div>
    `;
  });

  describe('Show Modal', () => {
    it('should display modal', () => {
      ModalManager.show('test-modal');

      const modal = document.getElementById('test-modal');
      expect(modal.style.display).toBe('flex');
    });

    it('should set aria-hidden to false', () => {
      ModalManager.show('test-modal');

      const modal = document.getElementById('test-modal');
      expect(modal.getAttribute('aria-hidden')).toBe('false');
    });

    it('should hide body overflow on desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      ModalManager.show('test-modal');

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should not hide body overflow on mobile', () => {
      // Reset body overflow before test
      document.body.style.overflow = '';

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });

      ModalManager.show('test-modal');

      // On mobile (width 500 < 768), overflow should remain empty (not 'hidden')
      expect(document.body.style.overflow).toBe('');
    });

    it('should handle non-existent modal gracefully', () => {
      expect(() => ModalManager.show('non-existent-modal')).not.toThrow();
    });
  });

  describe('Hide Modal', () => {
    it('should hide modal', () => {
      ModalManager.show('test-modal');
      ModalManager.hide('test-modal');

      const modal = document.getElementById('test-modal');
      expect(modal.style.display).toBe('none');
    });

    it('should set aria-hidden to true', () => {
      ModalManager.show('test-modal');
      ModalManager.hide('test-modal');

      const modal = document.getElementById('test-modal');
      expect(modal.getAttribute('aria-hidden')).toBe('true');
    });

    it('should reset body overflow', () => {
      ModalManager.show('test-modal');
      ModalManager.hide('test-modal');

      expect(document.body.style.overflow).toBe('');
    });

    it('should handle non-existent modal gracefully', () => {
      expect(() => ModalManager.hide('non-existent-modal')).not.toThrow();
    });
  });

  describe('Initialize', () => {
    it('should initialize modal event listeners', () => {
      expect(() => ModalManager.init()).not.toThrow();
    });

    it('should close modal on close button click', () => {
      ModalManager.init();
      ModalManager.show('test-modal');

      const closeBtn = document.querySelector('.close-modal');
      closeBtn.click();

      const modal = document.getElementById('test-modal');
      expect(modal.style.display).toBe('none');
    });

    it('should close modal on outside click', () => {
      ModalManager.init();
      ModalManager.show('test-modal');

      const modal = document.getElementById('test-modal');
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      Object.defineProperty(event, 'target', { value: modal, enumerable: true });
      modal.dispatchEvent(event);

      expect(modal.style.display).toBe('none');
    });

    it('should not close modal on content click', () => {
      ModalManager.init();
      ModalManager.show('test-modal');

      const content = document.querySelector('.modal-content');
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      Object.defineProperty(event, 'target', { value: content, enumerable: true });
      content.dispatchEvent(event);

      const modal = document.getElementById('test-modal');
      expect(modal.style.display).toBe('flex');
    });

    it('should close modal on Escape key', () => {
      ModalManager.init();
      ModalManager.show('test-modal');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      const modal = document.getElementById('test-modal');
      expect(modal.style.display).toBe('none');
    });
  });
});

describe('Smooth Scrolling', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a href="#section1">Link</a>
      <div id="section1">Section 1</div>
    `;

    // Mock scrollIntoView (not supported by happy-dom)
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('should initialize smooth scrolling', () => {
    expect(() => initSmoothScrolling()).not.toThrow();
  });

  it('should prevent default anchor behavior', () => {
    initSmoothScrolling();

    const link = document.querySelector('a[href^="#"]');
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });

    const spy = vi.spyOn(event, 'preventDefault');
    link.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
  });

  it('should handle missing target gracefully', () => {
    document.body.innerHTML = '<a href="#missing">Link</a>';

    expect(() => {
      initSmoothScrolling();
      const link = document.querySelector('a');
      link.click();
    }).not.toThrow();
  });
});
