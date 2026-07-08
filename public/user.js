const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

let booksData = [
    {
        id: 1,
        title: "Your Uploaded Book Cover",
        author: "Unknown Author",
        price: 25.00,
        category: "fiction",
        stock: 3,
        image: "images/dd.jpg"
    },
    {
        id: 2,
        title: "Clean Code",
        author: "Robert C. Martin",
        price: 34.99,
        category: "tech",
        stock: 5,
        image: "images/bb.jpg"
    },
    {
        id: 3,
        title: "Atomic Habits",
        author: "James Clear",
        price: 18.20,
        category: "self-help",
        stock: 2,
        image: "images/ss.jpg"
    },
    {
        id: 4,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: 14.50,
        category: "fiction",
        stock: 0,
        image: "images/hh.jpg"
    },
    {
        id: 5,
        title: "English Book",
        author: "Marijn Haverbeke",
        price: 28.99,
        category: "tech",
        stock: 6,
        image: "images/hh (2).jpg"
    },
    {
        id: 6,
        title: "Deep Work",
        author: "Cal Newport",
        price: 16.99,
        category: "self-help",
        stock: 1,
        image: "images/The Joys of Motherhood.jpg"
        
    }


    
];

let cart = [];
let activeCategory = "all";
let searchQuery = "";
let apiAvailable = false;
const LOW_STOCK_THRESHOLD = 3;

// =============================================
// SESSION HELPERS — defined early so auth guard can use them
// =============================================
function getCurrentUser() {
    try {
        const raw = localStorage.getItem('currentUser');
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function setCurrentUser(userData) {
    try { localStorage.setItem('currentUser', JSON.stringify(userData)); } catch (e) {}
}


document.addEventListener("DOMContentLoaded", () => {
    // Auth guard: redirect to login if no session
    const currentUser = getCurrentUser();
    if (!currentUser) {
        // Show a friendly redirect instead of a silent loop
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;
                        background:#f8fafc;font-family:'Segoe UI',sans-serif;gap:1rem;text-align:center;padding:2rem;">
                <span style="font-size:3rem;">📚</span>
                <h2 style="color:#1e293b;margin:0;">Please log in to access your dashboard</h2>
                <p style="color:#64748b;margin:0;">You need to sign in before you can view your dashboard.</p>
                <a href="login.html" style="background:#4f46e5;color:#fff;padding:0.75rem 2rem;border-radius:0.6rem;
                   text-decoration:none;font-weight:600;margin-top:0.5rem;">Go to Login →</a>
            </div>`;
        setTimeout(() => { window.location.href = "login.html"; }, 2500);
        return;
    }

    // Display user avatar initials
    const avatarEl = document.getElementById("user-avatar");
    if (avatarEl && currentUser.fullname) {
        avatarEl.textContent = currentUser.fullname.charAt(0).toUpperCase();
        avatarEl.title = `Logged in as ${currentUser.fullname}`;
    }

    loadBooks();
    loadCart();
    updateCartUI();
    setupCartUI();
    setupFilters();
    renderPurchases();
    setupNavigation();
});

async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE}/api/books`);

        if (!response.ok) {
            throw new Error(`Book request failed: ${response.status}`);
        }

        booksData = await response.json();
        apiAvailable = true;
    } catch (error) {
        apiAvailable = false;
        console.warn('Could not load books from backend. Fallback sample books are shown.', error);
    }

    // ensure numeric stock property exists on fallback/sample entries
    booksData = booksData.map((b) => ({ stock: 0, ...b }));

    populateCategoryChips();
    renderBooks();
    // ensure any saved cart quantities don't exceed freshly loaded stock
    reconcileCartWithStock();
}

function reconcileCartWithStock() {
    if (!Array.isArray(cart) || !Array.isArray(booksData)) return;
    let changed = false;
    cart.forEach(item => {
        const bk = booksData.find(b => Number(b.id) === Number(item.id));
        if (bk) {
            const available = Number(bk.stock) || 0;
            if (item.quantity > available) {
                item.quantity = available;
                changed = true;
            }
        }
    });
    if (changed) saveCart();
    updateCartUI();
}

function renderBooks() {
    const booksGrid = document.getElementById("books-grid");
    booksGrid.innerHTML = "";

    const filteredBooks = booksData.filter((book) => {
        const query = (searchQuery || '').trim().toLowerCase();
        const matchesCategory = activeCategory === "all" || (book.category || '') === activeCategory;
        const matchesSearch =
            (book.title || '').toString().toLowerCase().includes(query) ||
            (book.author || '').toString().toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });

    if (filteredBooks.length === 0) {
        console.debug('renderBooks: no results', { searchQuery, activeCategory, totalBooks: booksData.length });
        booksGrid.innerHTML = "<p class='text-muted'>No books found matching your search.</p>";
        return;
    }

    filteredBooks.forEach((book) => {
        const card = document.createElement('div');
        card.className = 'book-card';

        const top = document.createElement('div');
        const cover = document.createElement('div');
        cover.className = 'book-cover';
        const img = document.createElement('img');
        img.className = 'book-img';
        img.src = book.image || '';
        img.alt = book.title || '';
        cover.appendChild(img);
        top.appendChild(cover);

        const h4 = document.createElement('h4');
        h4.className = 'book-title';
        h4.textContent = book.title || '';
        top.appendChild(h4);

        const pa = document.createElement('p');
        pa.className = 'book-author';
        pa.textContent = book.author || '';
        top.appendChild(pa);

        const footer = document.createElement('div');
        footer.className = 'book-footer';

        const left = document.createElement('div');
        const price = document.createElement('span');
        price.className = 'book-price';
        price.textContent = `₵${(Number(book.price) || 0).toFixed(2)}`;
        left.appendChild(price);

        const stockDiv = document.createElement('div');
        stockDiv.className = 'book-stock';
        if (Number(book.stock) > 0) {
            stockDiv.textContent = `${Number(book.stock)} in stock`;
            if (Number(book.stock) <= LOW_STOCK_THRESHOLD) {
                const badge = document.createElement('span');
                badge.className = 'low-stock-badge';
                badge.textContent = 'Low stock';
                stockDiv.appendChild(document.createTextNode(' '));
                stockDiv.appendChild(badge);
            }
        } else {
            const strong = document.createElement('strong');
            strong.className = 'out-of-stock';
            strong.textContent = 'Out of stock';
            stockDiv.appendChild(strong);
        }
        left.appendChild(stockDiv);

        const addBtn = document.createElement('button');
        addBtn.className = 'add-to-cart';
        addBtn.type = 'button';
        addBtn.dataset.bookId = String(book.id);
        addBtn.textContent = 'Add +';
        if (Number(book.stock) <= 0) addBtn.disabled = true;

        footer.appendChild(left);
        footer.appendChild(addBtn);

        card.appendChild(top);
        card.appendChild(footer);

        if (Number(book.stock) > 0 && Number(book.stock) <= LOW_STOCK_THRESHOLD) card.classList.add('low-stock');
        addBtn.addEventListener('click', () => addToCart(book.id));
        booksGrid.appendChild(card);
    });
}

function setupFilters() {
    document.getElementById("search-input").addEventListener("input", (event) => {
        searchQuery = event.target.value;
        renderBooks();
    });

    // category chips are generated dynamically by populateCategoryChips()
}

function populateCategoryChips() {
    const container = document.getElementById('category-tags');
    if (!container) return;
    // normalize category keys once
    booksData = booksData.map(b => ({ ...b, category: (b.category || 'Uncategorized').toString().toLowerCase().replace(/\s+/g, '-') }));
    const categories = Array.from(new Set(booksData.map(b => b.category)));
    container.innerHTML = '';

    const makeChip = (key, label, isActive = false) => {
        const btn = document.createElement('button');
        btn.className = 'category-chip' + (isActive ? ' active' : '');
        btn.dataset.category = key;
        btn.type = 'button';
        btn.textContent = label;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = key;
            renderBooks();
        });
        return btn;
    };

    container.appendChild(makeChip('all', 'All Books', activeCategory === 'all'));
    categories.forEach((cat) => {
        const key = cat;
        const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
        container.appendChild(makeChip(key, label, activeCategory === key));
    });
}

function addToCart(id) {
    const targetBook = booksData.find((book) => Number(book.id) === Number(id));
    if (!targetBook) return;

    const existingItem = cart.find((item) => Number(item.id) === Number(id));

    const currentQty = existingItem ? existingItem.quantity : 0;
    if (targetBook.stock <= currentQty) {
        alert('Cannot add more — reached available stock.');
        return;
    }

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...targetBook, quantity: 1 });
    }

    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter((item) => Number(item.id) !== Number(id));
    updateCartUI();
}

function changeQuantity(id, delta) {
    const book = booksData.find(b => Number(b.id) === Number(id));
    const item = cart.find(i => Number(i.id) === Number(id));
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(id);
        return;
    }
    const available = book ? Number(book.stock) || 0 : 0;
    if (newQty > available) {
        alert('Cannot increase — exceeds available stock.');
        item.quantity = available;
    } else {
        item.quantity = newQty;
    }
    if (item.quantity <= 0) removeFromCart(id);
    else updateCartUI();
}

function updateCartUI() {
    // Remove any zero-quantity items before rendering or saving
    cart = cart.filter((item) => Number(item.quantity) > 0);

    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const container = document.getElementById("cart-items-container");
    const totalSpan = document.getElementById("cart-total");

    document.getElementById("cart-count").innerText = count;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
        totalSpan.innerText = "0.00";
        saveCart();
        updateAddButtons();
        return;
    }

    container.innerHTML = '';
    let totalPrice = 0;

    cart.forEach((item) => {
        totalPrice += (Number(item.price) || 0) * (Number(item.quantity) || 0);

        const div = document.createElement('div');
        div.className = 'cart-item';

        const left = document.createElement('div');
        const title = document.createElement('h5');
        title.textContent = item.title || '';
        left.appendChild(title);
        const price = document.createElement('small');
        price.className = 'text-muted';
        price.textContent = `₵${(Number(item.price) || 0).toFixed(2)}`;
        left.appendChild(price);

        const right = document.createElement('div');
        const qtyControl = document.createElement('div');
        qtyControl.className = 'qty-control';
        qtyControl.setAttribute('role', 'group');
        qtyControl.setAttribute('aria-label', 'Quantity controls');

        const dec = document.createElement('button');
        dec.className = 'qty-decrease';
        dec.dataset.id = String(item.id);
        dec.setAttribute('aria-label', 'Decrease quantity');
        dec.textContent = '-';
        dec.addEventListener('click', (e) => { e.preventDefault(); changeQuantity(item.id, -1); });

        const num = document.createElement('span');
        num.className = 'qty-number';
        num.textContent = String(item.quantity);

        const inc = document.createElement('button');
        inc.className = 'qty-increase';
        inc.dataset.id = String(item.id);
        inc.setAttribute('aria-label', 'Increase quantity');
        inc.textContent = '+';
        inc.addEventListener('click', (e) => { e.preventDefault(); changeQuantity(item.id, 1); });

        qtyControl.appendChild(dec);
        qtyControl.appendChild(num);
        qtyControl.appendChild(inc);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.type = 'button';
        closeBtn.style.fontSize = '1.15rem';
        closeBtn.innerText = '×';
        closeBtn.addEventListener('click', () => removeFromCart(item.id));

        right.appendChild(qtyControl);
        right.appendChild(closeBtn);

        div.appendChild(left);
        div.appendChild(right);
        container.appendChild(div);
    });

    totalSpan.innerText = totalPrice.toFixed(2);

    saveCart();
    updateAddButtons();
}

function saveCart() {
    try {
        localStorage.setItem('bookshop_cart', JSON.stringify(cart));
    } catch (e) {
        // ignore localStorage errors
    }
}

function loadCart() {
    try {
        const raw = localStorage.getItem('bookshop_cart');
        if (raw) cart = JSON.parse(raw);
    } catch (e) {
        cart = [];
    }
}

function updateAddButtons() {
    document.querySelectorAll('.add-to-cart').forEach((btn) => {
        const id = Number(btn.dataset.bookId);
        const book = booksData.find(b => Number(b.id) === id);
        if (!book) return;
        const inCart = cart.find(i => Number(i.id) === id);
        const qty = inCart ? inCart.quantity : 0;
        if (book.stock <= qty) btn.disabled = true;
        else btn.disabled = false;
    });
}

function setupCartUI() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("overlay");
    const toggleBtn = document.getElementById("cart-toggle-btn");
    const closeBtn = document.getElementById("close-cart-btn");
    const checkoutBtn = document.getElementById("checkout-btn");

    const openCart = () => {
        drawer.classList.add("open");
        overlay.classList.add("open");
    };

    const closeCart = () => {
        drawer.classList.remove("open");
        overlay.classList.remove("open");
    };

    toggleBtn.addEventListener("click", openCart);
    closeBtn.addEventListener("click", closeCart);
    overlay.addEventListener("click", closeCart);

    checkoutBtn.addEventListener("click", () => {
        if (cart.length === 0) {
            alert("Your cart is empty.");
            return;
        }
        try {
            window.name = JSON.stringify({ bookshop_cart: cart });
        } catch (e) {
            // ignore serialization errors
        }
        window.location.href = "checkout.html";
    });
}

function savePurchases(list) {
    try { localStorage.setItem('bookshop_purchases', JSON.stringify(list)); } catch (e) {}
}

function loadPurchases() {
    try { const raw = localStorage.getItem('bookshop_purchases'); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}

function renderPurchases() {
    const container = document.getElementById('purchases-list');
    if (!container) return;
    const list = loadPurchases();
    if (!list.length) {
        container.innerHTML = '<p class="text-muted">No purchases yet.</p>';
        return;
    }
    container.innerHTML = '';
    list.forEach(p => {
        const wrap = document.createElement('div');
        wrap.className = 'purchase';
        wrap.innerHTML = `<div class="purchase-meta"><strong>Order #${p.id}</strong> <small class="text-muted">${new Date(p.date).toLocaleString()}</small></div>`;
        const ul = document.createElement('ul');
        p.items.forEach(it => {
            const li = document.createElement('li');
            li.textContent = `${it.title} — ${it.qty} × $${it.price.toFixed(2)}`;
            ul.appendChild(li);
        });
        wrap.appendChild(ul);
        wrap.insertAdjacentHTML('beforeend', `<div class="purchase-total">Total: ₵${p.total.toFixed(2)}</div>`);
        container.appendChild(wrap);
    });
}


// =============================================
// NAVIGATION ROUTER
// =============================================
function setupNavigation() {
    const navDashboard = document.getElementById('nav-dashboard');
    const navOrders    = document.getElementById('nav-orders');
    const navProfile   = document.getElementById('nav-profile');
    const navSettings  = document.getElementById('nav-settings');
    const navLogout    = document.getElementById('nav-logout');
    const userAvatar   = document.getElementById('user-avatar');

    if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); showView('dashboard'); });
    if (navOrders)    navOrders.addEventListener('click',    (e) => { e.preventDefault(); showView('orders'); });
    if (navProfile)   navProfile.addEventListener('click',   (e) => { e.preventDefault(); showView('profile'); });
    if (navSettings)  navSettings.addEventListener('click',  (e) => { e.preventDefault(); showView('settings'); });
    if (navLogout)    navLogout.addEventListener('click',    (e) => { e.preventDefault(); handleLogout(); });
    if (userAvatar)   userAvatar.addEventListener('click',   ()  => showView('profile'));

    // Also set up profile and settings form listeners once
    setupProfile();
    setupSettings();
}

function showView(view) {
    // Hide all views
    const views = ['dashboard', 'orders', 'profile', 'settings'];
    views.forEach(v => {
        const el = document.getElementById(`${v}-view`);
        if (el) el.style.display = 'none';
    });

    // Remove active from all nav links
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));

    // Show the selected view and mark nav as active
    const targetView = document.getElementById(`${view}-view`);
    if (targetView) targetView.style.display = '';

    const navLink = document.getElementById(`nav-${view}`);
    if (navLink) navLink.classList.add('active');

    // Show/hide search bar (only on dashboard)
    const searchWrapper = document.getElementById('search-wrapper');
    if (searchWrapper) searchWrapper.style.display = view === 'dashboard' ? '' : 'none';

    // Load data for the requested view
    if (view === 'orders') loadOrders();
    if (view === 'profile') populateProfileForm();
}

// =============================================
// LOGOUT
// =============================================
function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// =============================================
// MY ORDERS
// =============================================
async function loadOrders() {
    const container = document.getElementById('main-orders-list');
    if (!container) return;
    container.innerHTML = '<p class="text-muted">Loading your orders...</p>';

    const currentUser = getCurrentUser();
    const email = currentUser ? currentUser.email : null;

    // Try API first
    if (email) {
        try {
            const resp = await fetch(`${API_BASE}/api/customer/orders?email=${encodeURIComponent(email)}`);
            if (resp.ok) {
                const orders = await resp.json();
                renderOrders(container, orders);
                return;
            }
        } catch (err) {
            // fall through to localStorage
        }
    }

    // Fallback: use bookshop_purchases from localStorage
    const localOrders = loadPurchases();
    if (!localOrders.length) {
        container.innerHTML = `
            <div class="no-orders-msg">
                <span class="no-orders-icon">📦</span>
                <p>You have not placed any orders yet.</p>
                <p style="margin-top:0.5rem; font-size:0.85rem;">Browse books and add them to your cart!</p>
            </div>`;
        return;
    }

    // Map localStorage purchase format to common format
    const mappedOrders = localOrders.map((p, idx) => ({
        id: p.id || (idx + 1),
        date: p.date,
        total: p.total,
        items: (p.items || []).map(it => ({
            title: it.title,
            quantity: it.qty,
            price: it.price
        }))
    }));
    renderOrders(container, mappedOrders);
}

function renderOrders(container, orders) {
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="no-orders-msg">
                <span class="no-orders-icon">📦</span>
                <p>You have not placed any orders yet.</p>
                <p style="margin-top:0.5rem; font-size:0.85rem;">Browse books and add them to your cart!</p>
            </div>`;
        return;
    }

    container.innerHTML = '';
    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';

        const date = order.date ? new Date(order.date).toLocaleString() : 'Unknown date';
        const total = Number(order.total || order.sales_total_amount || 0).toFixed(2);

        const itemsHtml = Array.isArray(order.items) && order.items.length
            ? order.items.map(it => {
                const qty = it.quantity || it.qty || 1;
                const price = Number(it.price || it.sales_details_price || 0).toFixed(2);
                const name = it.title || it.product_name || 'Book';
                return `<li>${name} &times; ${qty} @ ₵${price}</li>`;
            }).join('')
            : '<li>Order details not available</li>';

        card.innerHTML = `
            <div class="order-card-header">
                <strong>Order #${order.id || order.sales_ID}</strong>
                <span class="order-date">${date}</span>
            </div>
            <ul class="order-items-list">${itemsHtml}</ul>
            <div class="order-total">Total: ₵${total}</div>
        `;
        container.appendChild(card);
    });
}

// =============================================
// PROFILE
// =============================================
function populateProfileForm() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const nameField  = document.getElementById('profile-name');
    const emailField = document.getElementById('profile-email');
    if (nameField)  nameField.value  = currentUser.fullname || '';
    if (emailField) emailField.value = currentUser.email    || '';
}

function setupProfile() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('profile-message');
        const currentUser = getCurrentUser();
        const fullname = document.getElementById('profile-name').value.trim();
        const email    = document.getElementById('profile-email').value.trim();

        if (!fullname || !email) {
            showFormMsg(msgEl, 'Please fill in all fields.', 'error');
            return;
        }

        try {
            const resp = await fetch(`${API_BASE}/api/customer/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldEmail: currentUser ? currentUser.email : email, fullname, email })
            });
            if (resp.ok) {
                setCurrentUser({ ...currentUser, fullname, email });
                showFormMsg(msgEl, '✅ Profile updated successfully!', 'success');
                const avatarEl = document.getElementById('user-avatar');
                if (avatarEl) avatarEl.textContent = fullname.charAt(0).toUpperCase();
            } else {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.message || 'Update failed.');
            }
        } catch (err) {
            // Offline fallback: update localStorage only
            if (currentUser) {
                setCurrentUser({ ...currentUser, fullname, email });
                showFormMsg(msgEl, '✅ Profile saved locally (server unavailable).', 'success');
                const avatarEl = document.getElementById('user-avatar');
                if (avatarEl) avatarEl.textContent = fullname.charAt(0).toUpperCase();
            } else {
                showFormMsg(msgEl, err.message || 'Could not update profile.', 'error');
            }
        }
    });
}

// =============================================
// SETTINGS – CHANGE PASSWORD
// =============================================
function setupSettings() {
    const form = document.getElementById('settings-password-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('settings-message');
        const currentUser = getCurrentUser();
        const currentPwd = document.getElementById('current-password').value;
        const newPwd     = document.getElementById('new-password').value;

        if (!currentPwd || !newPwd) {
            showFormMsg(msgEl, 'Please fill in both password fields.', 'error');
            return;
        }
        if (newPwd.length < 6) {
            showFormMsg(msgEl, 'New password must be at least 6 characters.', 'error');
            return;
        }

        try {
            const resp = await fetch(`${API_BASE}/api/customer/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser ? currentUser.email : '',
                    currentPassword: currentPwd,
                    newPassword: newPwd
                })
            });
            if (resp.ok) {
                showFormMsg(msgEl, '✅ Password changed successfully!', 'success');
                form.reset();
            } else {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.message || 'Could not change password.');
            }
        } catch (err) {
            showFormMsg(msgEl, err.message || 'Server unavailable. Password not changed.', 'error');
        }
    });
}

// =============================================
// UTILITY
// =============================================
function showFormMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = `form-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4500);
}
