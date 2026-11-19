// DRINKIT Application Core Controller

const DRINKIT_APP = {
  cart: [],
  currentCoupon: null,
  activeLocation: 'Lucknow, Uttar Pradesh',

  init() {
    this.loadState();
    this.setupListeners();
    this.updateCartBadges();
    this.checkAgeVerification();
    this.renderPopularProducts();
  },

  loadState() {
    const savedCart = localStorage.getItem('drinkit_cart');
    if (savedCart) {
      try {
        this.cart = JSON.parse(savedCart);
        // Sync fresh local product images
        this.cart.forEach(item => {
          const p = DRINKIT_PRODUCTS.find(x => x.id === item.id);
          if (p && p.image) item.image = p.image;
        });
      } catch (e) {
        this.cart = [];
      }
    }

    const savedLoc = localStorage.getItem('drinkit_location');
    if (savedLoc) {
      this.activeLocation = savedLoc;
      const locEls = document.querySelectorAll('.active-loc-name');
      locEls.forEach(el => el.textContent = savedLoc);
    }

    const savedCoupon = localStorage.getItem('drinkit_coupon');
    if (savedCoupon) {
      this.currentCoupon = savedCoupon;
    }
  },

  saveState() {
    localStorage.setItem('drinkit_cart', JSON.stringify(this.cart));
    localStorage.setItem('drinkit_location', this.activeLocation);
    if (this.currentCoupon) {
      localStorage.setItem('drinkit_coupon', this.currentCoupon);
    } else {
      localStorage.removeItem('drinkit_coupon');
    }
    this.updateCartBadges();
  },

  setupListeners() {
    // Search form submission
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const val = input.value.trim();
          if (val) {
            window.location.href = `shop.html?search=${encodeURIComponent(val)}`;
          }
        }
      });
    });

    // Cart trigger buttons
    document.querySelectorAll('.cart-btn, .open-cart-drawer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleCartDrawer(true);
      });
    });

    // Close cart drawer
    document.querySelectorAll('.close-drawer-btn, .cart-drawer-overlay').forEach(el => {
      el.addEventListener('click', () => {
        this.toggleCartDrawer(false);
      });
    });

    // Location picker open
    document.querySelectorAll('.top-bar-left, .open-location-modal').forEach(el => {
      el.addEventListener('click', () => {
        const modal = document.getElementById('locationModal');
        if (modal) modal.classList.add('active');
      });
    });
  },

  // Age Verification Check (Legal requirement for alcohol e-commerce)
  checkAgeVerification() {
    const isVerified = localStorage.getItem('drinkit_age_verified');
    const modal = document.getElementById('ageModal');
    if (!isVerified && modal) {
      modal.classList.add('active');
    }
  },

  confirmAge(isAdult) {
    const modal = document.getElementById('ageModal');
    if (isAdult) {
      localStorage.setItem('drinkit_age_verified', 'true');
      if (modal) modal.classList.remove('active');
      this.showToast('Age verified! Welcome to Drinkit.');
    } else {
      alert('You must be 21 or older to access alcoholic beverages on Drinkit.');
      window.location.href = 'https://www.google.com';
    }
  },

  // Location selector
  selectLocation(cityName) {
    this.activeLocation = cityName;
    localStorage.setItem('drinkit_location', cityName);
    document.querySelectorAll('.active-loc-name').forEach(el => el.textContent = cityName);
    const modal = document.getElementById('locationModal');
    if (modal) modal.classList.remove('active');
    this.showToast(`Delivering in 10 mins to ${cityName}!`);
  },

  // Cart operations
  addToCart(productId, count = 1) {
    const product = DRINKIT_PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = this.cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      this.cart[existingIndex].qty += count;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        volume: product.volume,
        image: product.image,
        qty: count
      });
    }

    this.saveState();
    this.renderPopularProducts();
    this.renderCartDrawer();
    this.showToast(`Added ${product.name} to cart!`);
  },

  updateQuantity(productId, delta) {
    const existingIndex = this.cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      this.cart[existingIndex].qty += delta;
      if (this.cart[existingIndex].qty <= 0) {
        this.cart.splice(existingIndex, 1);
        this.showToast('Item removed from cart');
      }
      this.saveState();
      this.renderPopularProducts();
      this.renderCartDrawer();
      if (typeof renderCartPage === 'function') renderCartPage();
    }
  },

  getCartCount() {
    return this.cart.reduce((total, item) => total + item.qty, 0);
  },

  getCartTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.qty), 0);
  },

  updateCartBadges() {
    const count = this.getCartCount();
    document.querySelectorAll('.cart-badge, .mob-cart-badge').forEach(el => {
      el.textContent = count;
    });
  },

  toggleCartDrawer(show) {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (!drawer || !overlay) return;

    if (show) {
      this.renderCartDrawer();
      drawer.classList.add('active');
      overlay.classList.add('active');
    } else {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    }
  },

  renderCartDrawer() {
    const container = document.getElementById('cartDrawerItems');
    const subtotalEl = document.getElementById('drawerSubtotal');
    const discountEl = document.getElementById('drawerDiscount');
    const totalEl = document.getElementById('drawerTotal');
    const checkoutBtn = document.getElementById('drawerCheckoutBtn');

    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px 10px; color: #94a3b8;">
          <div style="font-size: 48px; margin-bottom: 12px;">🛒</div>
          <h4 style="color:#1e293b; font-size:16px; margin-bottom:6px;">Your cart is empty</h4>
          <p style="font-size:13px;">Add chilled drinks and party snacks to get 10-minute delivery!</p>
          <a href="shop.html" style="display:inline-block; margin-top:16px; background:#21a038; color:#fff; padding:8px 18px; border-radius:8px; font-weight:700; font-size:13px;">Explore Catalog</a>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '₹0';
      if (discountEl) discountEl.textContent = '₹0';
      if (totalEl) totalEl.textContent = '₹0';
      if (checkoutBtn) {
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.pointerEvents = 'none';
      }
      return;
    }

    if (checkoutBtn) {
      checkoutBtn.style.opacity = '1';
      checkoutBtn.style.pointerEvents = 'auto';
    }

    let html = '';
    this.cart.forEach(item => {
      html += `
        <div class="cart-item-row">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-vol">${item.volume}</div>
            <div class="cart-item-price">₹${item.price}</div>
          </div>
          <div class="qty-counter">
            <button onclick="DRINKIT_APP.updateQuantity('${item.id}', -1)">-</button>
            <span class="qty-number">${item.qty}</span>
            <button onclick="DRINKIT_APP.updateQuantity('${item.id}', 1)">+</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

    const subtotal = this.getCartTotal();
    const discount = this.currentCoupon === 'DRINKIT100' && subtotal >= 499 ? 100 : 0;
    const delivery = subtotal > 500 ? 0 : 29;
    const total = Math.max(0, subtotal - discount + delivery);

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
    if (discountEl) discountEl.textContent = `-₹${discount}`;
    if (totalEl) totalEl.textContent = `₹${total}`;
  },

  // Render Popular Near You products on homepage
  renderPopularProducts() {
    const grid = document.getElementById('popularProductsGrid');
    if (!grid) return;

    const popularList = DRINKIT_PRODUCTS.slice(0, 6);
    let html = '';

    popularList.forEach(prod => {
      const inCart = this.cart.find(c => c.id === prod.id);
      const actionHtml = inCart ? `
        <div class="qty-counter">
          <button onclick="DRINKIT_APP.updateQuantity('${prod.id}', -1)">-</button>
          <span class="qty-number">${inCart.qty}</span>
          <button onclick="DRINKIT_APP.updateQuantity('${prod.id}', 1)">+</button>
        </div>
      ` : `
        <button class="add-btn" onclick="DRINKIT_APP.addToCart('${prod.id}', 1)">
          ADD <span style="font-size:16px; margin-left:2px;">+</span>
        </button>
      `;

      html += `
        <div class="product-card">
          ${prod.isDeal ? '<span class="product-badge">DEAL</span>' : ''}
          <div class="prod-img-box" onclick="window.location.href='product-detail.html?id=${prod.id}'">
            <img src="${prod.image}" alt="${prod.name}" loading="lazy">
          </div>
          <div class="prod-title" onclick="window.location.href='product-detail.html?id=${prod.id}'">${prod.name}</div>
          <div class="prod-volume">${prod.volume}</div>
          <div class="prod-footer">
            <div class="prod-price">₹${prod.price} <span class="original">₹${prod.originalPrice}</span></div>
            ${actionHtml}
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  },

  applyCouponCode(code) {
    if (code.toUpperCase() === 'DRINKIT100') {
      const subtotal = this.getCartTotal();
      if (subtotal < 499) {
        this.showToast('DRINKIT100 is valid on orders above ₹499!');
        return false;
      }
      this.currentCoupon = 'DRINKIT100';
      this.saveState();
      this.renderCartDrawer();
      if (typeof renderCartPage === 'function') renderCartPage();
      this.showToast('Coupon DRINKIT100 applied! Saved ₹100.');
      return true;
    } else {
      this.showToast('Invalid Coupon Code.');
      return false;
    }
  },

  showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DRINKIT_APP.init();
});
