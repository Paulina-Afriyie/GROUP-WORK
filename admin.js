const API_BASE = (() => {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && origin !== 'undefined') {
        return origin;
    }
    return 'http://localhost:3001';
})();

function showAdminStatus(message, isError = false) {
    let status = document.getElementById('admin-api-status');
    if (!status) {
        status = document.createElement('div');
        status.id = 'admin-api-status';
        status.style.padding = '10px 14px';
        status.style.background = '#111827';
        status.style.color = '#f8fafc';
        status.style.fontSize = '0.9rem';
        status.style.position = 'fixed';
        status.style.right = '12px';
        status.style.top = '12px';
        status.style.zIndex = '9999';
        status.style.borderRadius = '8px';
        status.style.boxShadow = '0 4px 18px rgba(0,0,0,0.18)';
        document.body.appendChild(status);
    }
    status.textContent = message;
    status.style.background = isError ? '#b91c1c' : '#111827';
}

// NOTE: Removed automatic display of API base for security and cleanliness.
// Use `showAdminStatus(message, isError)` manually in console for debugging when needed.

document.addEventListener("DOMContentLoaded", () => {
    // Admin API base not shown automatically to avoid leaking internal endpoints.
    const dashboardData = {
        staff: {
            title: "Staff Management",
            tableTitle: "Active Personnel Registry",
            headers: ["Staff ID", "Staff Name", "Staff Username", "Staff Role"],
            endpoint: "staff",
            idField: "staff_ID",
            canEdit: true,
            fields: [
                { name: "staff_name", label: "Staff Name", type: "text", required: true },
                { name: "staff_username", label: "Staff Email / Username", type: "email", required: true },
                { name: "staff_role", label: "Staff Role", type: "text", required: true },
                { name: "staff_password", label: "Password", type: "password" }
            ]
        },
        products: {
            title: "Products",
            tableTitle: "Book Product Registry",
            headers: ["Product ID", "Product Name", "Author", "Price", "Quantity", "Supplier ID", "Category ID", "Image"],
            endpoint: "products",
            idField: "product_ID",
            canEdit: true,
            fields: [
                { name: "product_name", label: "Product Name", type: "text", required: true },
                { name: "product_author", label: "Author", type: "text" },
                { name: "product_price", label: "Price", type: "number", step: "0.01", required: true },
                { name: "product_quantity_in_stock", label: "Quantity In Stock", type: "number", required: true },
                { name: "supplier_ID", label: "Supplier ID", type: "number" },
                { name: "category_ID", label: "Category ID", type: "number" },
                { name: "product_image", label: "Product Image", type: "file", accept: "image/*" }
            ]
        },
        category: {
            title: "Category",
            tableTitle: "Book Categories",
            headers: ["Category ID", "Category Name"],
            endpoint: "category",
            idField: "category_ID",
            canEdit: true,
            fields: [
                { name: "category_name", label: "Category Name", type: "text", required: true }
            ]
        },
        stock: {
            title: "Products In Stock",
            tableTitle: "Available Book Inventory",
            headers: ["Product ID", "Book Title", "Author", "Quantity Left", "Unit Price"],
            endpoint: "stock",
            fields: []
        },
        out: {
            title: "Out of Stock Products",
            tableTitle: "Out of Stock Books",
            headers: ["Product ID", "Book Title", "Supplier ID", "Status"],
            endpoint: "out",
            fields: []
        },
        suppliers: {
            title: "Suppliers Database",
            tableTitle: "Verified Suppliers",
            headers: ["Supplier ID", "Supplier Name", "Address", "Phone Number"],
            endpoint: "suppliers",
            idField: "supplier_ID",
            canEdit: true,
            fields: [
                { name: "supplier_name", label: "Supplier Name", type: "text", required: true },
                { name: "supplier_address", label: "Address", type: "text" },
                { name: "supplier_phone_number", label: "Phone Number", type: "tel" }
            ]
        },
        customers: {
            title: "Customer/User Database",
            tableTitle: "Registered Customers",
            headers: ["Customer ID", "Customer Name", "Address", "Phone Number", "Email"],
            endpoint: "customers",
            idField: "customer_ID",
            canEdit: true,
            fields: [
                { name: "customer_name", label: "Customer Name", type: "text", required: true },
                { name: "customer_address", label: "Address", type: "text" },
                { name: "customer_phone_number", label: "Phone Number", type: "tel" },
                { name: "customer_email", label: "Email", type: "email", required: true }
            ]
        },
        sales: {
            title: "Sales",
            tableTitle: "Sales Records",
            headers: ["Sales ID", "Sales Date", "Total Amount", "Staff ID", "Customer ID"],
            endpoint: "sales",
            idField: "sales_ID",
            canEdit: true,
            fields: [
                { name: "sales_date", label: "Sales Date", type: "datetime-local" },
                { name: "sales_total_amount", label: "Total Amount", type: "number", step: "0.01", required: true },
                { name: "staff_ID", label: "Staff ID", type: "number" },
                { name: "customer_ID", label: "Customer ID", type: "number" }
            ]
        },
        salesDetails: {
            title: "Sales Details",
            tableTitle: "Sale Line Items",
            headers: ["Sales Details ID", "Sales ID", "Product ID", "Quantity", "Price"],
            endpoint: "salesDetails",
            idField: "sales_details_ID",
            canEdit: false,
            fields: [
                { name: "sales_ID", label: "Sales ID", type: "number", required: true },
                { name: "product_ID", label: "Product ID", type: "number", required: true },
                { name: "sales_details_quantity", label: "Quantity", type: "number", required: true },
                { name: "sales_details_price", label: "Price", type: "number", step: "0.01", required: true }
            ]
        }
    };

    const pageTitle = document.getElementById("page-title");
    const tableTitle = document.getElementById("table-title");
    const tableHeaders = document.getElementById("table-headers");
    const tableBody = document.getElementById("table-body");
    const navItems = document.querySelectorAll(".nav-item[data-section]");
    const form = document.getElementById("record-form");
    const toggleFormBtn = document.getElementById("toggle-form-btn");
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-modal-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');

    let activeSection = "staff";
    let editMode = false;
    let editRecordId = null;

    function formatCell(value) {
        if (value === null || value === undefined || value === "") return "-";
        return value;
    }

    function buildForm(sectionKey) {
        const data = dashboardData[sectionKey];
        form.innerHTML = "";

        if (!data.fields.length) {
            form.classList.add("hidden");
            toggleFormBtn.classList.add("hidden");
            return;
        }

        toggleFormBtn.classList.remove("hidden");

        const hiddenInput = data.idField ? `<input type="hidden" name="${data.idField}" id="${data.idField}">` : "";
        const originalStaffInput = editMode && sectionKey === 'staff' ? `<input type="hidden" name="original_staff_username" id="original_staff_username">` : "";
        const submitLabel = editMode ? "Update Record" : "Save Record";

        const fields = data.fields.map((field) => `
            <label class="record-field">
                <span>${field.label}</span>
                <input
                    type="${field.type}"
                    name="${field.name}"
                    ${field.step ? `step="${field.step}"` : ""}
                    ${field.placeholder ? `placeholder="${field.placeholder}"` : ""}
                    ${field.accept ? `accept="${field.accept}"` : ""}
                    ${field.required ? "required" : ""}
                >
            </label>
        `).join("");

        form.innerHTML = `
            ${hiddenInput}${originalStaffInput}
            <div class="record-form-grid">${fields}</div>
            <div class="record-form-actions">
                <button class="secondary-action-btn" type="button" id="cancel-form-btn">Cancel</button>
                <button class="primary-action-btn" type="submit">${submitLabel}</button>
            </div>
        `;

        if (editMode && data.idField && editRecordId !== null) {
            const hidden = form.querySelector(`#${data.idField}`);
            if (hidden) hidden.value = editRecordId;
        }

        document.getElementById("cancel-form-btn").addEventListener("click", () => {
            editMode = false;
            editRecordId = null;
            toggleFormBtn.textContent = "Add Record";
            form.reset();
            form.classList.add("hidden");
        });
    }

    function animateStats() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card) => {
            const valueEl = card.querySelector('.value');
            if (!valueEl) return;
            const raw = valueEl.textContent.trim().replace(/,/g, '') || '0';
            const target = parseInt(raw, 10) || 0;
            const duration = 900 + Math.floor(Math.random() * 800);
            const start = performance.now();

            function frame(now) {
                const t = Math.min((now - start) / duration, 1);
                const current = Math.floor(t * target);
                valueEl.textContent = current.toLocaleString();
                const bar = card.querySelector('.stat-bar > i');
                if (bar) {
                    const pct = Math.min(100, Math.round((t * (target > 0 ? Math.min(target, 1000) : 0)) / (target || 1) * 100));
                    bar.style.width = pct + '%';
                }
                if (t < 1) requestAnimationFrame(frame);
                else valueEl.textContent = target.toLocaleString();
            }

            // ensure a stat-bar exists (for older markup it's harmless)
            if (!card.querySelector('.stat-bar')) {
                const barWrap = document.createElement('div');
                barWrap.className = 'stat-bar';
                const barInner = document.createElement('i');
                barWrap.appendChild(barInner);
                card.appendChild(barWrap);
            }

            requestAnimationFrame(frame);
        });
    }

    async function fetchStats() {
        const cards = Array.from(document.querySelectorAll('.stat-card[data-endpoint]'));
        if (!cards.length) return;

        await Promise.all(cards.map(async (card) => {
            const endpoint = card.dataset.endpoint;
            const mode = card.dataset.mode || 'count';
            const sumKey = card.dataset.sumkey;

            try {
                const res = await fetch(`${API_BASE}/api/admin/${endpoint}`);
                if (!res.ok) {
                    console.warn('fetchStats: non-ok response', endpoint, res.status);
                    return;
                }
                const rows = await res.json();

                let value = 0;
                if (mode === 'sum') {
                    // prefer explicit sumKey, otherwise try common names
                    const keysToTry = sumKey ? [sumKey] : [
                        'product_quantity_in_stock', 'quantity', 'product_quantity', 'stock', 'product_stock'
                    ];

                    if (rows.length && typeof rows[0] === 'object') {
                        let found = false;
                        for (const k of keysToTry) {
                            if (rows[0] && Object.prototype.hasOwnProperty.call(rows[0], k)) {
                                value = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            // fallback: sum first numeric field we find
                            const sample = rows[0];
                            const numericKey = Object.keys(sample).find((kk) => !isNaN(Number(sample[kk])));
                            if (numericKey) {
                                value = rows.reduce((s, r) => s + (Number(r[numericKey]) || 0), 0);
                            } else {
                                value = 0;
                            }
                        }
                    }
                } else {
                    value = Array.isArray(rows) ? rows.length : 0;
                }

                console.debug('fetchStats:', endpoint, 'mode=', mode, 'value=', value, 'rows=', Array.isArray(rows) ? rows.length : typeof rows);

                const valueEl = card.querySelector('.value');
                if (valueEl) animateValue(valueEl, value);

                // Fill the small stat bar (log-scale to keep visual range reasonable)
                const bar = card.querySelector('.stat-bar > i');
                if (bar) {
                    const pct = Math.min(100, Math.round(Math.log10(value + 1) / 3 * 100));
                    bar.style.width = pct + '%';
                }
            } catch (e) {
                console.error('fetchStats error for', endpoint, e);
            }
        }));
    }

    function animateValue(el, target) {
        const start = Number(el.textContent.replace(/,/g, '')) || 0;
        const duration = 900 + Math.floor(Math.random() * 600);
        const t0 = performance.now();

        function tick(now) {
            const t = Math.min(1, (now - t0) / duration);
            const cur = Math.floor(start + (target - start) * t);
            el.textContent = cur.toLocaleString();
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = target.toLocaleString();
        }

        requestAnimationFrame(tick);
    }

    function openEditForm(row) {
        if (!row || !dashboardData[activeSection] || !dashboardData[activeSection].canEdit) return;
        editMode = true;
        editRecordId = row[dashboardData[activeSection].idField];
        buildForm(activeSection);
        toggleFormBtn.textContent = "Edit Record";
        form.classList.remove("hidden");
        form.reset();

        Object.entries(row).forEach(([key, value]) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (!input || input.type === 'file') return;
            input.value = value === null ? "" : value;
        });
        if (row.staff_username) {
            const original = form.querySelector('#original_staff_username');
            if (original) original.value = row.staff_username;
        }
    }

    async function loadSection(sectionKey) {
        const data = dashboardData[sectionKey];
        if (!data) return;

        editMode = false;
        editRecordId = null;
        toggleFormBtn.textContent = "Add Record";
        activeSection = sectionKey;
        pageTitle.innerText = data.title;
        tableTitle.innerText = data.tableTitle;
        // Compute headers to render (exclude 'Image' for products since images are hidden)
        const headersToRender = data.headers.filter((h) => !(data.endpoint === 'products' && /image/i.test(h)));
        tableHeaders.innerHTML = headersToRender.map((header) => `<th>${header}</th>`).join("");
        if (data.canEdit) {
            tableHeaders.innerHTML += `<th>Actions</th>`;
        }
        tableBody.innerHTML = `<tr><td colspan="${headersToRender.length + (data.canEdit ? 1 : 0)}">Loading records...</td></tr>`;
        buildForm(sectionKey);

        try {
            const response = await fetch(`${API_BASE}/api/admin/${data.endpoint}`);
            const rows = await response.json();

            if (!response.ok) {
                throw new Error(rows.message || "Could not load records.");
            }

            if (rows.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${headersToRender.length + (data.canEdit ? 1 : 0)}">No records found.</td></tr>`;
                return;
            }

            tableBody.innerHTML = rows.map((row) => {
                // Render each field; exclude `product_image` from table rows for products
                let entriesToRender = Object.entries(row);
                if (data.endpoint === 'products') {
                    entriesToRender = entriesToRender.filter(([k]) => k !== 'product_image');
                }
                const cells = entriesToRender.map(([key, cell]) => `<td>${formatCell(cell)}</td>`).join("");
                const actionCell = data.canEdit ? `<td><button class="action-btn edit-btn" type="button" data-id="${row[data.idField]}">Edit</button> <button class="action-btn remove-btn" type="button" data-id="${row[data.idField]}">Remove</button></td>` : "";
                return `<tr>${cells}${actionCell}</tr>`;
            }).join("");

            if (data.canEdit) {
                tableBody.querySelectorAll('.edit-btn').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.id;
                        const row = rows.find((r) => String(r[data.idField]) === String(id));
                        openEditForm(row);
                    });
                });
                // Attach remove handlers
                tableBody.querySelectorAll('.remove-btn').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.id;
                        const endpoint = data.endpoint;
                        // show modal
                        confirmMessage.textContent = `Delete ${endpoint} record #${id}? This cannot be undone.`;
                        confirmModal.classList.remove('hidden');

                        const onCancel = () => {
                            confirmModal.classList.add('hidden');
                            confirmCancel.removeEventListener('click', onCancel);
                            confirmOk.removeEventListener('click', onOk);
                        };

                        const onOk = async () => {
                            confirmModal.classList.add('hidden');
                            confirmCancel.removeEventListener('click', onCancel);
                            confirmOk.removeEventListener('click', onOk);
                            try {
                                const url = `${API_BASE}/api/admin/${endpoint}/${id}`;
                                const res = await fetch(url, { method: 'DELETE' });
                                const result = await res.json();
                                if (!res.ok) {
                                    alert(result.message || 'Could not delete record.');
                                    return;
                                }
                                await loadSection(activeSection);
                                setTimeout(() => fetchStats(), 350);
                            } catch (err) {
                                alert('Could not delete record. Check that the backend server is running.');
                            }
                        };

                        confirmCancel.addEventListener('click', onCancel);
                        confirmOk.addEventListener('click', onOk);
                    });
                });
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="${data.headers.length}">${error.message}</td></tr>`;
        }
    }

    toggleFormBtn.addEventListener("click", () => {
        editMode = false;
        editRecordId = null;
        toggleFormBtn.textContent = "Add Record";
        buildForm(activeSection);
        form.classList.toggle("hidden");
    });
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = dashboardData[activeSection];
        const formData = new FormData(form);
        const productSection = data.endpoint === 'products';
        const hasFileUpload = Array.from(formData.values()).some((value) =>
            (typeof File !== 'undefined' && value instanceof File && value.size > 0) ||
            (typeof Blob !== 'undefined' && value instanceof Blob && value.size > 0)
        );
        const isUpdate = editMode && editRecordId;
        const url = isUpdate ? `${API_BASE}/api/admin/${data.endpoint}/${editRecordId}` : `${API_BASE}/api/admin/${data.endpoint}`;
        const method = isUpdate ? "PUT" : "POST";

        try {
            const useFormData = productSection || hasFileUpload;
            const entries = Array.from(formData.entries()).map(([key, value]) => {
                if (value instanceof File) {
                    return [key, value.name || value.type || "<file>"];
                }
                return [key, value];
            });
            console.debug("Admin product submit", data.endpoint, entries);
                // Ensure file input is explicitly attached for products (avoids edge cases)
                if (productSection) {
                    const fileInput = form.querySelector('input[type="file"][name="product_image"]');
                    if (fileInput && fileInput.files && fileInput.files.length > 0) {
                        formData.set('product_image', fileInput.files[0]);
                        console.debug('Attached product_image file:', fileInput.files[0].name);
                    }
                }
            const options = {
                method,
                body: useFormData ? formData : JSON.stringify(Object.fromEntries(formData.entries()))
            };
            if (!useFormData) {
                options.headers = { "Content-Type": "application/json" };
            }

            console.log("Admin submitting to", url, "options:", options);
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                console.error('Save failed:', result.message || 'Unknown error');
                alert(result.message || (isUpdate ? "Could not update record." : "Could not save record."));
                return;
            }
            console.log('Saved successfully to', url);

            editMode = false;
            editRecordId = null;
            toggleFormBtn.textContent = "Add Record";
            form.reset();
            form.classList.add("hidden");
            await loadSection(activeSection);
            // refresh stats after a successful change (small delay to ensure DB commit)
            setTimeout(() => fetchStats(), 450);
        } catch (error) {
            alert("Could not save record. Check that the backend server is running.");
        }
    });

    navItems.forEach((item) => {
        item.addEventListener("click", () => {
            navItems.forEach((nav) => nav.classList.remove("active"));
            item.classList.add("active");
            loadSection(item.dataset.section);
        });
    });

    // Fetch live stats and animate them on page load
    fetchStats().then(() => animateStats());

    // Poll stats periodically
    setInterval(fetchStats, 15000);

    loadSection(activeSection);
});
