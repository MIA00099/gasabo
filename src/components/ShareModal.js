import { makeAccessibleModal } from './modalA11y.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

/** Show a temporary global toast notification. */
export function showShareToast(message) {
  let toast = document.getElementById('km-share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'km-share-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translate(-50%, 0);
      background: #0F172A;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 0.92rem;
      padding: 12px 24px;
      border-radius: 9999px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 0;
      pointer-events: none;
      border: 1px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa-solid fa-circle-check text-brand-green"></i> <span>${escapeHtml(message)}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translate(-50%, -8px)';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 0px)';
  }, 2600);
}

/** Copy text to clipboard and show toast notification. */
export async function copyToClipboard(text, successMsg = 'Link copied to clipboard!') {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showShareToast(successMsg);
      return true;
    }
  } catch (err) {
    // Fall back to input selection
  }

  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(input);
    if (successful) {
      showShareToast(successMsg);
      return true;
    }
  } catch (err) {
    // Ignore fallback failure
  }

  prompt('Copy link:', text);
  return false;
}

/**
 * Open the Share Modal.
 *
 * @param {Object} options
 * @param {string} options.title - Item title or headline
 * @param {string} [options.text] - Custom summary or description text
 * @param {string} [options.url] - URL to share (defaults to current window location)
 * @param {string} [options.image] - Optional image URL preview
 * @param {number|string} [options.price] - Optional price
 * @param {string} [options.currency] - Optional currency code (default: RWF)
 * @param {string} [options.location] - Optional location string
 * @param {Function} [onClose] - Callback when modal closes
 * @param {string} [returnFocusTo] - CSS selector for focus return
 */
export function openShareModal(options = {}, onClose, returnFocusTo) {
  const title = options.title || 'Check this out on Kigali Market';
  const rawUrl = options.url || window.location.href;
  const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
  const shareText = options.text || `Check out "${title}" on Kigali Market`;
  const image = options.image || null;
  const price = options.price ? `${options.currency || 'RWF'} ${Number(options.price).toLocaleString()}` : null;
  const location = options.location || null;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedMsgWithUrl = encodeURIComponent(`${shareText}\n${fullUrl}`);

  const channels = [
    {
      name: 'WhatsApp',
      icon: 'fa-brands fa-whatsapp',
      color: '#25D366',
      bg: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white',
      url: `https://api.whatsapp.com/send?text=${encodedMsgWithUrl}`,
    },
    {
      name: 'Facebook',
      icon: 'fa-brands fa-facebook-f',
      color: '#1877F2',
      bg: 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: 'X (Twitter)',
      icon: 'fa-brands fa-x-twitter',
      color: '#0f1419',
      bg: 'bg-black/10 text-gray-900 hover:bg-black hover:text-white',
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      name: 'LinkedIn',
      icon: 'fa-brands fa-linkedin-in',
      color: '#0A66C2',
      bg: 'bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: 'Telegram',
      icon: 'fa-brands fa-telegram',
      color: '#229ED9',
      bg: 'bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9] hover:text-white',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: 'Email',
      icon: 'fa-solid fa-envelope',
      color: '#EA4335',
      bg: 'bg-[#EA4335]/10 text-[#EA4335] hover:bg-[#EA4335] hover:text-white',
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedMsgWithUrl}`,
    },
  ];

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto';

  overlay.innerHTML = `
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative my-auto transition duration-200">
      
      <!-- Close Button -->
      <button type="button" id="share-modal-close" data-modal-close
        class="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition"
        aria-label="Close share dialog">
        <i class="fa-solid fa-xmark text-base"></i>
      </button>

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5 pr-8">
        <div class="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center text-lg font-bold shrink-0">
          <i class="fa-solid fa-share-nodes"></i>
        </div>
        <div>
          <h2 class="text-xl font-extrabold text-gray-900 leading-snug">Share Listing</h2>
          <p class="text-xs text-gray-500">Spread the word with your network</p>
        </div>
      </div>

      <!-- Item Preview Card -->
      <div class="bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-5 flex items-center gap-3">
        ${image ? `
          <img src="${escapeHtml(image)}" alt="" class="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0 bg-white">
        ` : `
          <div class="w-14 h-14 rounded-xl bg-gray-200 text-gray-400 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-link"></i>
          </div>
        `}
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-bold text-gray-900 truncate">${escapeHtml(title)}</h3>
          ${price ? `<div class="text-xs font-extrabold text-brand-green mt-0.5">${escapeHtml(price)}</div>` : ''}
          ${location ? `<div class="text-[11px] text-gray-500 truncate mt-0.5"><i class="fa-solid fa-location-dot text-brand-green text-[10px]"></i> ${escapeHtml(location)}</div>` : ''}
        </div>
      </div>

      <!-- Social Channels Grid -->
      <div class="mb-5">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Share via</label>
        <div class="grid grid-cols-3 gap-2.5">
          ${channels.map((ch) => `
            <a href="${ch.url}" target="_blank" rel="noopener noreferrer"
              class="share-channel-btn flex flex-col items-center justify-center p-3 rounded-2xl transition border border-gray-100 font-semibold ${ch.bg}">
              <i class="${ch.icon} text-xl mb-1.5"></i>
              <span class="text-[11px] font-bold text-gray-800">${escapeHtml(ch.name)}</span>
            </a>
          `).join('')}
        </div>
      </div>

      <!-- Native Share Button (if supported) -->
      ${hasNativeShare ? `
        <button type="button" id="share-native-btn"
          class="w-full mb-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition">
          <i class="fa-solid fa-arrow-up-from-bracket"></i> More Sharing Options...
        </button>
      ` : ''}

      <!-- Direct Link Copy Box -->
      <div>
        <label for="share-link-input" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Direct Link</label>
        <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pl-3">
          <input type="text" id="share-link-input" readonly value="${escapeHtml(fullUrl)}"
            class="bg-transparent text-xs text-gray-700 font-medium flex-1 outline-none truncate select-all">
          <button type="button" id="share-copy-btn"
            class="bg-brand-green hover:bg-green-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm shrink-0 flex items-center gap-1.5">
            <i class="fa-regular fa-copy"></i>
            <span id="share-copy-text">Copy</span>
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const { close } = makeAccessibleModal(overlay, {
    label: `Share: ${title}`,
    onClose,
    returnFocusTo,
  });

  const closeBtn = overlay.querySelector('#share-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Copy button
  const copyBtn = overlay.querySelector('#share-copy-btn');
  const copyText = overlay.querySelector('#share-copy-text');
  const linkInput = overlay.querySelector('#share-link-input');

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (linkInput) {
        linkInput.select();
      }
      const ok = await copyToClipboard(fullUrl);
      if (ok && copyText) {
        copyText.textContent = 'Copied!';
        copyBtn.classList.replace('bg-brand-green', 'bg-green-700');
        setTimeout(() => {
          if (copyText) copyText.textContent = 'Copy';
          if (copyBtn) copyBtn.classList.replace('bg-green-700', 'bg-brand-green');
        }, 2000);
      }
    });
  }

  // Native Share Button
  const nativeBtn = overlay.querySelector('#share-native-btn');
  if (nativeBtn && hasNativeShare) {
    nativeBtn.addEventListener('click', () => {
      navigator.share({
        title,
        text: shareText,
        url: fullUrl,
      }).catch(() => {});
    });
  }

  return { close, overlay };
}
