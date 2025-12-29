/**
 * Utility Classes Tests
 * Tests for ToastManager, LoadingManager, ImageQualityChecker, and SessionProtector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import utilities from utils.js
// Note: We need to mock the window object for browser-specific code
import {
    ToastManager,
    LoadingManager,
    ImageQualityChecker,
    SessionProtector
} from '../../js/utils.js';

describe('ToastManager', () => {
  let toastManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    toastManager = new ToastManager();
  });

  it('should create a toast container', () => {
    const container = document.querySelector('.toast-container');
    expect(container).toBeTruthy();
  });

  it('should show toast with correct message', () => {
    const message = 'Test message';
    toastManager.show(message, 'info', 5000);

    const toastMessage = document.querySelector('.toast-message');
    expect(toastMessage.textContent).toBe(message);
  });

  it('should show success toast', () => {
    toastManager.success('Success message');

    const toast = document.querySelector('.toast.success');
    expect(toast).toBeTruthy();
  });

  it('should show error toast', () => {
    toastManager.error('Error message');

    const toast = document.querySelector('.toast.error');
    expect(toast).toBeTruthy();
  });

  it('should show warning toast', () => {
    toastManager.warning('Warning message');

    const toast = document.querySelector('.toast.warning');
    expect(toast).toBeTruthy();
  });

  it('should show info toast', () => {
    toastManager.info('Info message');

    const toast = document.querySelector('.toast.info');
    expect(toast).toBeTruthy();
  });

  it('should display correct icons for each type', () => {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    Object.entries(icons).forEach(([type, icon]) => {
      toastManager.show('Test', type, 5000);
      const toastIcon = document.querySelector(`.toast.${type} .toast-icon`);
      expect(toastIcon.textContent).toBe(icon);
    });
  });

  it('should display default titles for each type', () => {
    const titles = {
      success: '成功',
      error: 'エラー',
      warning: '警告',
      info: 'お知らせ'
    };

    Object.entries(titles).forEach(([type, title]) => {
      document.body.innerHTML = '';
      toastManager = new ToastManager();
      toastManager.show('Test', type, 5000);
      const toastTitle = document.querySelector(`.toast.${type} .toast-title`);
      expect(toastTitle.textContent).toBe(title);
    });
  });

  it('should use custom title when provided', () => {
    const customTitle = 'Custom Title';
    toastManager.show('Test', 'info', 5000, customTitle);

    const toastTitle = document.querySelector('.toast-title');
    expect(toastTitle.textContent).toBe(customTitle);
  });

  it('should have close button', () => {
    toastManager.show('Test', 'info', 5000);

    const closeBtn = document.querySelector('.toast-close');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.textContent).toBe('×');
  });

  it('should remove toast when close button clicked', () => {
    vi.useFakeTimers();

    toastManager.show('Test', 'info', 5000);
    const toast = document.querySelector('.toast');
    const closeBtn = toast.querySelector('.toast-close');

    closeBtn.click();
    vi.advanceTimersByTime(400);

    expect(document.querySelector('.toast')).toBeNull();

    vi.useRealTimers();
  });
});

describe('LoadingManager', () => {
  let loadingManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    loadingManager = new LoadingManager();
  });

  it('should create loading overlay', () => {
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay).toBeTruthy();
  });

  it('should have spinner element', () => {
    const spinner = document.querySelector('.spinner-large');
    expect(spinner).toBeTruthy();
  });

  it('should have loading text element', () => {
    const text = document.querySelector('.loading-text');
    expect(text).toBeTruthy();
  });

  it('should show loading overlay', () => {
    loadingManager.show();

    const overlay = document.querySelector('.loading-overlay');
    expect(overlay.classList.contains('active')).toBe(true);
  });

  it('should hide loading overlay', () => {
    loadingManager.show();
    loadingManager.hide();

    const overlay = document.querySelector('.loading-overlay');
    expect(overlay.classList.contains('active')).toBe(false);
  });

  it('should update loading text', () => {
    const customMessage = 'アップロード中...';
    loadingManager.show(customMessage);

    const text = document.querySelector('.loading-text');
    expect(text.textContent).toBe(customMessage);
  });

  it('should use default text when no message provided', () => {
    loadingManager.show();

    const text = document.querySelector('.loading-text');
    expect(text.textContent).toBe('処理中...');
  });
});

describe('ImageQualityChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new ImageQualityChecker(800, 800, 10 * 1024 * 1024);
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(checker.formatBytes(0)).toBe('0 Bytes');
      expect(checker.formatBytes(1024)).toBe('1 KB');
      expect(checker.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(checker.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle fractional values', () => {
      const result = checker.formatBytes(1536);
      expect(result).toBe('1.5 KB');
    });

    it('should handle large values', () => {
      const result = checker.formatBytes(10 * 1024 * 1024);
      expect(result).toBe('10 MB');
    });
  });

  describe('File size validation', () => {
    it('should accept files within size limit', async () => {
      const file = new File(['test'], 'test.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });

      const result = await checker.check(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files exceeding size limit', async () => {
      const file = new File(['test'], 'test.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 });

      const result = await checker.check(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('File type validation', () => {
    it('should accept valid image types', async () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      for (const type of validTypes) {
        const file = new File(['test'], 'test.jpg', {
          type,
          lastModified: Date.now()
        });
        Object.defineProperty(file, 'size', { value: 1024 });

        const result = await checker.check(file);
        expect(result.errors.filter(e => e.includes('ファイル形式'))).toHaveLength(0);
      }
    });

    it('should reject invalid file types', async () => {
      const file = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
        lastModified: Date.now()
      });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = await checker.check(file);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ファイル形式'))).toBe(true);
    });
  });

  describe('Constructor configuration', () => {
    it('should use default values', () => {
      const defaultChecker = new ImageQualityChecker();
      expect(defaultChecker.minWidth).toBe(800);
      expect(defaultChecker.minHeight).toBe(800);
      expect(defaultChecker.maxSize).toBe(10 * 1024 * 1024);
    });

    it('should accept custom configuration', () => {
      const customChecker = new ImageQualityChecker(1200, 1200, 5 * 1024 * 1024);
      expect(customChecker.minWidth).toBe(1200);
      expect(customChecker.minHeight).toBe(1200);
      expect(customChecker.maxSize).toBe(5 * 1024 * 1024);
    });
  });
});

describe('SessionProtector', () => {
  let protector;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    protector = new SessionProtector();
  });

  afterEach(() => {
    if (protector.autoSaveInterval) {
      clearInterval(protector.autoSaveInterval);
    }
    vi.useRealTimers();
  });

  it('should initialize with no unsaved changes', () => {
    expect(protector.hasUnsavedChanges).toBe(false);
  });

  it('should mark as changed', () => {
    protector.markAsChanged();
    expect(protector.hasUnsavedChanges).toBe(true);
  });

  it('should mark as saved', () => {
    protector.markAsChanged();
    protector.markAsSaved();
    expect(protector.hasUnsavedChanges).toBe(false);
  });

  it('should start auto-save interval', () => {
    expect(protector.autoSaveInterval).toBeTruthy();
  });

  it('should clear saved data', () => {
    localStorage.setItem('acrylic_stand_draft', 'test');
    protector.clearSaved();
    expect(localStorage.getItem('acrylic_stand_draft')).toBeNull();
  });

  it('should return null when no saved data exists', () => {
    const loaded = protector.loadFromLocalStorage();
    expect(loaded).toBeNull();
  });

  it('should return null for expired data', () => {
    const oldData = {
      imageData: 'test',
      timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
    };
    localStorage.setItem('acrylic_stand_draft', JSON.stringify(oldData));

    const loaded = protector.loadFromLocalStorage();
    expect(loaded).toBeNull();
    expect(localStorage.getItem('acrylic_stand_draft')).toBeNull();
  });

  it('should load valid saved data', () => {
    const data = {
      imageData: 'test',
      timestamp: Date.now(),
      rotation: 90,
      scale: 100
    };
    localStorage.setItem('acrylic_stand_draft', JSON.stringify(data));

    const loaded = protector.loadFromLocalStorage();
    expect(loaded).toEqual(data);
  });

  it('should handle invalid JSON in localStorage', () => {
    localStorage.setItem('acrylic_stand_draft', 'invalid json');

    const loaded = protector.loadFromLocalStorage();
    expect(loaded).toBeNull();
  });

  it('should accept fresh data (within 24 hours)', () => {
    const recentData = {
      imageData: 'test',
      timestamp: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
    };
    localStorage.setItem('acrylic_stand_draft', JSON.stringify(recentData));

    const loaded = protector.loadFromLocalStorage();
    expect(loaded).toBeTruthy();
    expect(loaded.imageData).toBe('test');
  });
});

describe('NetworkMonitor', () => {
  it('should detect online status', () => {
    // Browser default is online
    expect(navigator.onLine).toBe(true);
  });

  it('should provide connection check method', () => {
    const checkConnection = () => navigator.onLine;
    expect(checkConnection()).toBe(true);
  });
});
