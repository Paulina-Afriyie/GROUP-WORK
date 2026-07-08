const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';
const CUSTOMER_INFO_KEY = 'bookshop_checkout_info';

let cart = [];
let lastOrder = null;

function loadCart() {
    try {
        const raw = localStorage.getItem('bookshop_cart');
        cart = raw ? JSON.parse(raw) : [];
    } catch (error) {
        cart = [];
    }

    if (!Array.isArray(cart) || cart.length === 0) {
        try {
            const preserved = window.name ? JSON.parse(window.name) : null;
            if (preserved && Array.isArray(preserved.bookshop_cart)) {
                cart = preserved.bookshop_cart;
            }
        } catch (error) {
            // ignore invalid window.name content
        }
    }

    if (!Array.isArray(cart)) {
        cart = [];
    }
}


function saveCustomerInfo() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    const formData = new FormData(form);
    const info = {};
    formData.forEach((value, key) => {
        info[key] = value;
    });

    localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(info));
}

function loadCustomerInfo() {
    try {
        const raw = localStorage.getItem(CUSTOMER_INFO_KEY);
        if (!raw) return;
        const info = JSON.parse(raw);
        const form = document.getElementById('checkout-form');
        if (!form || typeof info !== 'object' || info === null) return;

        Object.entries(info).forEach(([key, value]) => {
            const field = form.elements.namedItem(key);
            if (field) {
                field.value = value;
            }
        });
    } catch (error) {
        // ignore parse errors
    }
}

function renderCheckoutItems() {
    const container = document.getElementById('checkout-items');
    const totalSpan = document.getElementById('checkout-total');
    container.innerHTML = '';

    if ((!Array.isArray(cart) || cart.length === 0) && lastOrder && Array.isArray(lastOrder.items) && lastOrder.items.length > 0) {
        lastOrder.items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'item';
            row.innerHTML = `
                <div>
                    <strong>${item.title}</strong>
                    <br><small>${item.quantity} × ₵${(Number(item.price) || 0).toFixed(2)}</small>
                </div>
                <div>₵${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</div>
            `;
            container.appendChild(row);
        });
        totalSpan.textContent = Number(lastOrder.total || 0).toFixed(2);
        return;
    }

    if (!Array.isArray(cart) || cart.length === 0) {
        container.innerHTML = '<p class="text-muted">Your cart is empty. Please add books before checking out.</p>';
        totalSpan.textContent = '0.00';
        return;
    }

    let total = 0;
    cart.forEach((item) => {
        total += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `
            <div>
                <strong>${item.title}</strong>
                <br><small>${item.quantity} × ₵${(Number(item.price) || 0).toFixed(2)}</small>
            </div>
            <div>₵${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</div>
        `;
        container.appendChild(row);
    });

    totalSpan.textContent = total.toFixed(2);
}

function clearCart() {
    cart = [];
    localStorage.setItem('bookshop_cart', JSON.stringify(cart));
}

function showSuccess() {
    document.getElementById('checkout-form').style.display = 'none';
    const success = document.getElementById('checkout-success');
    success.classList.add('visible');
}

function updatePaymentFields() {
    const method = document.getElementById('payment-method').value;
    const cardFields = document.querySelectorAll('.payment-card');
    const mobileFields = document.querySelectorAll('.payment-mobile-money');
    const cardInputs = Array.from(cardFields).flatMap((group) => Array.from(group.querySelectorAll('input')));
    const mobileInputs = Array.from(mobileFields).flatMap((group) => Array.from(group.querySelectorAll('input, select')));

    if (method === 'card') {
        cardFields.forEach((el) => el.style.display = 'block');
        mobileFields.forEach((el) => el.style.display = 'none');
        cardInputs.forEach((input) => input.required = true);
        mobileInputs.forEach((input) => input.required = false);
    } else if (method === 'mobile_money') {
        cardFields.forEach((el) => el.style.display = 'none');
        mobileFields.forEach((el) => el.style.display = 'grid');
        cardInputs.forEach((input) => input.required = false);
        mobileInputs.forEach((input) => {
            if (input.name === 'mobileProvider' || input.name === 'mobileNumber') {
                input.required = true;
            }
        });
    } else {
        cardFields.forEach((el) => el.style.display = 'none');
        mobileFields.forEach((el) => el.style.display = 'none');
        cardInputs.forEach((input) => input.required = false);
        mobileInputs.forEach((input) => input.required = false);
    }
}

function setupForm() {
    const form = document.getElementById('checkout-form');
    const paymentMethod = document.getElementById('payment-method');

    paymentMethod.addEventListener('change', updatePaymentFields);
    updatePaymentFields();

    form.querySelectorAll('input, select, textarea').forEach((field) => {
        field.addEventListener('change', saveCustomerInfo);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!cart.length) {
            alert('Your cart is empty.');
            return;
        }

        const totalPrice = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_BASE}/api/admin/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart, sales_total_amount: totalPrice, customer_info: payload })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Checkout failed.');
            }

            const result = await response.json().catch(() => ({}));

            lastOrder = {
                items: cart.map((item) => ({ ...item })),
                total: totalPrice
            };

            // Persist to localStorage so "My Orders" view shows this order
            saveOrderToHistory(lastOrder, result.sales_ID);

            clearCart();
            renderCheckoutItems();
            showSuccess();
        } catch (error) {
            // Fallback: save locally even if server failed, so the user's order history is preserved
            if (cart.length > 0) {
                const fallbackOrder = { items: cart.map(item => ({ ...item })), total: totalPrice };
                saveOrderToHistory(fallbackOrder, null);
            }
            alert(error.message || 'Could not complete checkout. Please try again.');
        }
    });
}

function saveOrderToHistory(order, serverId) {
    try {
        const raw = localStorage.getItem('bookshop_purchases');
        const list = raw ? JSON.parse(raw) : [];
        const newEntry = {
            id: serverId || `local-${Date.now()}`,
            date: new Date().toISOString(),
            total: order.total,
            items: (order.items || []).map(it => ({
                title: it.title || it.product_name || 'Book',
                qty: it.quantity || 1,
                price: Number(it.price) || 0
            }))
        };
        list.unshift(newEntry); // newest first
        localStorage.setItem('bookshop_purchases', JSON.stringify(list));
    } catch (e) {
        // ignore storage errors
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadCart();
    renderCheckoutItems();
    loadCustomerInfo();
    setupForm();
});
