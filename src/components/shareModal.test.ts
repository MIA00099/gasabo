import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const SHARE_MODAL_CODE = readFileSync('src/components/ShareModal.js', 'utf8');
const PRODUCT_DETAIL_PAGE = readFileSync('src/modules/marketplace/ProductDetailPage.js', 'utf8');
const PRODUCT_DETAIL_MODAL = readFileSync('src/modules/marketplace/ProductDetailModal.js', 'utf8');
const REAL_ESTATE_VIEW = readFileSync('src/modules/realestate/RealEstateView.js', 'utf8');
const PRODUCTS_PAGE = readFileSync('src/modules/marketplace/ProductsPage.js', 'utf8');
const MARKETPLACE_VIEW = readFileSync('src/modules/marketplace/MarketplaceView.js', 'utf8');

describe('ShareModal component file', () => {
  it('is present on disk at src/components/ShareModal.js', () => {
    expect(existsSync('src/components/ShareModal.js')).toBe(true);
  });

  it('exports openShareModal, copyToClipboard, and showShareToast', () => {
    expect(SHARE_MODAL_CODE).toContain('export function openShareModal');
    expect(SHARE_MODAL_CODE).toContain('copyToClipboard');
    expect(SHARE_MODAL_CODE).toContain('export function showShareToast');
  });

  it('includes social media share channel links', () => {
    expect(SHARE_MODAL_CODE).toContain('api.whatsapp.com');
    expect(SHARE_MODAL_CODE).toContain('facebook.com/sharer');
    expect(SHARE_MODAL_CODE).toContain('twitter.com/intent/tweet');
    expect(SHARE_MODAL_CODE).toContain('linkedin.com/sharing');
    expect(SHARE_MODAL_CODE).toContain('t.me/share');
    expect(SHARE_MODAL_CODE).toContain('mailto:');
  });

  it('includes copy link input field and toast notification feedback', () => {
    expect(SHARE_MODAL_CODE).toContain('id="share-link-input"');
    expect(SHARE_MODAL_CODE).toContain('id="share-copy-btn"');
    expect(SHARE_MODAL_CODE).toContain('km-share-toast');
    expect(SHARE_MODAL_CODE).toContain('Link copied to clipboard!');
  });

  it('integrates with accessibility helper makeAccessibleModal', () => {
    expect(SHARE_MODAL_CODE).toContain("import { makeAccessibleModal } from './modalA11y.js'");
    expect(SHARE_MODAL_CODE).toContain('makeAccessibleModal(overlay');
  });
});

describe('Share functionality integration across modules', () => {
  it('ProductDetailPage.js integrates openShareModal', () => {
    expect(PRODUCT_DETAIL_PAGE).toContain("import { openShareModal } from '../../components/ShareModal.js'");
    expect(PRODUCT_DETAIL_PAGE).toContain('id="detail-share-btn"');
    expect(PRODUCT_DETAIL_PAGE).toContain('fa-share-nodes');
    expect(PRODUCT_DETAIL_PAGE).toContain('openShareModal({');
  });

  it('ProductDetailModal.js integrates openShareModal', () => {
    expect(PRODUCT_DETAIL_MODAL).toContain("import { openShareModal } from '../../components/ShareModal.js'");
    expect(PRODUCT_DETAIL_MODAL).toContain('id="modal-share-btn"');
    expect(PRODUCT_DETAIL_MODAL).toContain('fa-share-nodes');
    expect(PRODUCT_DETAIL_MODAL).toContain('openShareModal({');
  });

  it('RealEstateView.js integrates card and detail openShareModal and official social links', () => {
    expect(REAL_ESTATE_VIEW).toContain("import { openShareModal, showShareToast } from '../../components/ShareModal.js'");
    expect(REAL_ESTATE_VIEW).toContain('re-share-head-btn');
    expect(REAL_ESTATE_VIEW).toContain('re-share-card-btn');
    expect(REAL_ESTATE_VIEW).toContain('re-card-share-btn');
    expect(REAL_ESTATE_VIEW).toContain('fa-share-nodes');
    expect(REAL_ESTATE_VIEW).toContain('openShareModal({');
    expect(REAL_ESTATE_VIEW).toContain('instagram.com/gasabo_real_estate');
    expect(REAL_ESTATE_VIEW).toContain('youtube.com/@GasaboRealEstate');
    expect(REAL_ESTATE_VIEW).toContain('facebook.com/profile.php?id=100063657936349');
    expect(REAL_ESTATE_VIEW).toContain('tiktok.com/@gasaborealestate');
  });

  it('ProductsPage.js integrates quick share on product cards', () => {
    expect(PRODUCTS_PAGE).toContain("import { openShareModal } from '../../components/ShareModal.js'");
    expect(PRODUCTS_PAGE).toContain('prod-card-share-btn');
    expect(PRODUCTS_PAGE).toContain('fa-share-nodes');
    expect(PRODUCTS_PAGE).toContain('openShareModal({');
  });

  it('MarketplaceView.js integrates quick share on product tiles', () => {
    expect(MARKETPLACE_VIEW).toContain("import { openShareModal } from '../../components/ShareModal.js'");
    expect(MARKETPLACE_VIEW).toContain('home-card-share-btn');
    expect(MARKETPLACE_VIEW).toContain('fa-share-nodes');
    expect(MARKETPLACE_VIEW).toContain('openShareModal({');
  });
});
