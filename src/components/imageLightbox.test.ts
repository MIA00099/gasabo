// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openImageLightbox } from './imageLightbox.js';

const IMAGES = ['/one.jpg', '/two.jpg', '/three.jpg'];

const currentImg = () => document.querySelector('img')?.getAttribute('src');
const counter = () => document.querySelector('[aria-live="polite"]')?.textContent;

const touchEvent = (type: string, touches: any[], changedTouches = touches) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as any;
  Object.defineProperty(event, 'touches', { value: touches });
  Object.defineProperty(event, 'changedTouches', { value: changedTouches });
  return event;
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.removeProperty('overflow');
  vi.useRealTimers();
});

describe('image lightbox gallery controls', () => {
  it('locks the page behind it and still closes cleanly', () => {
    const close = openImageLightbox(IMAGES, 'Earbuds');

    expect(document.body.style.overflow).toBe('hidden');
    expect(currentImg()).toBe('/one.jpg');

    close();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('changes photos with wheel or trackpad scrolling inside the open viewer', () => {
    vi.useFakeTimers();
    openImageLightbox(IMAGES, 'Earbuds');
    const overlay = document.querySelector('[role="dialog"]')!;

    overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }));
    expect(currentImg()).toBe('/two.jpg');
    expect(counter()).toBe('2 / 3');

    vi.advanceTimersByTime(330);
    overlay.dispatchEvent(new WheelEvent('wheel', { deltaX: -80, bubbles: true, cancelable: true }));
    expect(currentImg()).toBe('/one.jpg');
    expect(counter()).toBe('1 / 3');
  });

  it('changes photos with horizontal touch swipes on mobile Safari style input', () => {
    openImageLightbox(IMAGES, 'Earbuds');
    const overlay = document.querySelector('[role="dialog"]')!;

    overlay.dispatchEvent(touchEvent('touchstart', [{ clientX: 220, clientY: 100 }]));
    overlay.dispatchEvent(touchEvent('touchmove', [{ clientX: 130, clientY: 104 }]));
    overlay.dispatchEvent(touchEvent('touchend', [], [{ clientX: 120, clientY: 104 }]));
    expect(currentImg()).toBe('/two.jpg');

    overlay.dispatchEvent(touchEvent('touchstart', [{ clientX: 120, clientY: 100 }]));
    overlay.dispatchEvent(touchEvent('touchend', [], [{ clientX: 220, clientY: 100 }]));
    expect(currentImg()).toBe('/one.jpg');
  });
});
