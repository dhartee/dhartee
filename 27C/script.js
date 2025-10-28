document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const saveBuyerBtn = document.getElementById('saveBuyerBtn');
    const saveSellerBtn = document.getElementById('saveSellerBtn');
    const invoiceBtn = document.getElementById('invoiceBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const addInvoiceRowBtn = document.getElementById('addInvoiceRowBtn');
    const saveInvoicesBtn = document.getElementById('saveInvoicesBtn');
    const invoiceModal = document.getElementById('invoiceModal');
    const invoiceTableBody = document.getElementById('invoiceTableBody');
    const buyerDropdown = document.getElementById('buyerDropdown');
    const sellerDropdown = document.getElementById('sellerDropdown');
    const annexureDisplay = document.getElementById('annexure-display');
    const mainForm = document.getElementById('mainForm');
    const printBtn = document.getElementById('printBtn'); // Get print button

    // Add print event listener
    printBtn.addEventListener('click', () => {
        window.print();
    });

    // --- Data Storage & Retrieval ---
    const getStoredData = (key) => JSON.parse(localStorage.getItem(key)) || [];
    const setStoredData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    // --- Populate Dropdowns on Load ---
    const populateDropdown = (dropdown, data, keyField) => {
        dropdown.innerHTML = `<option>-- Select ${keyField.charAt(0).toUpperCase() + keyField.slice(1)} --</option>`;
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[keyField];
            option.textContent = item[keyField];
            dropdown.appendChild(option);
        });
    };

    // MODIFIED: Make loadData accessible to import.js
    window.loadData = () => {
        populateDropdown(buyerDropdown, getStoredData('buyers'), 'buyerName');
        populateDropdown(sellerDropdown, getStoredData('sellers'), 'sellerName');
    };

    // --- Form Population ---
    // MODIFIED: Made globally accessible for import.js
    window.populateForm = (data) => {
        for (const key in data) {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = data[key];
                } else {
                    element.value = data[key];
                }
            }
        }
    };
    
    buyerDropdown.addEventListener('change', (e) => {
        const selectedName = e.target.value;
        const buyers = getStoredData('buyers');
        const selectedBuyer = buyers.find(b => b.buyerName === selectedName);
        if (selectedBuyer) {
            populateForm(selectedBuyer);
        }
    });

    sellerDropdown.addEventListener('change', (e) => {
        const selectedName = e.target.value;
        const sellers = getStoredData('sellers');
        const selectedSeller = sellers.find(s => s.sellerName === selectedName);
        if (selectedSeller) {
            populateForm(selectedSeller);
        }
    });


    // --- Save Functionality ---
    // MODIFIED: To accept an optional dataObject for importing
    window.saveEntity = (type, dataObject = null) => {
        let data;

        if (dataObject) {
            // Data is coming from an import
            data = dataObject;
        } else {
            // Data is being entered manually on the form
            data = {};
            const prefix = type === 'buyer' ? 'buyer' : 'seller';
            const formElements = mainForm.elements;
            
            for (let i = 0; i < formElements.length; i++) {
                const element = formElements[i];
                if (element.id && element.id.startsWith(prefix)) {
                     if (element.type === 'checkbox') {
                        data[element.id] = element.checked;
                    } else {
                        data[element.id] = element.value;
                    }
                }
            }

            // Add other relevant fields
            if (type === 'buyer') {
                 const buyerSpecificIds = ['goodsNature', 'purposeManufacturing', 'purposePower', 'declarantName', 'declarationPlace', 'declarationDate'];
                 buyerSpecificIds.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) data[id] = el.type === 'checkbox' ? el.checked : el.value;
                 });
            } else {
                 const sellerSpecificIds = ['furnishDate', 'debitDate', 'forwardPlace', 'forwardDate'];
                 sellerSpecificIds.forEach(id => {
                     const el = document.getElementById(id);
                     if(el) data[id] = el.value;
                 });
            }
        }


        const nameField = `${type}Name`;
        if (!data[nameField]) {
            // Don't alert if importing, just log
            if (!dataObject) {
                 alert(`Please enter a ${type} name.`);
            }
            console.error(`Skipping save: ${type} name is missing.`);
            return;
        }

        const storageKey = `${type}s`;
        const storedData = getStoredData(storageKey);
        const existingIndex = storedData.findIndex(item => item[nameField] === data[nameField]);

        if (existingIndex > -1) {
            storedData[existingIndex] = data; // Update existing
        } else {
            storedData.push(data); // Add new
        }

        setStoredData(storageKey, storedData);
        if (!dataObject) {
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} information saved successfully!`);
            loadData(); // Only call loadData if manual, import.js will call it once.
        }
    };
    
    saveBuyerBtn.addEventListener('click', () => saveEntity('buyer'));
    saveSellerBtn.addEventListener('click', () => saveEntity('seller'));

    // --- Invoice Modal Logic ---
    // MODIFIED: Must use `let` so import.js can overwrite it
    window.invoices = [];

    // MODIFIED: Make renderInvoiceTable accessible to import.js
    window.renderInvoiceTable = () => {
        invoiceTableBody.innerHTML = '';
        invoices.forEach((invoice, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="border p-1"><input type="text" value="${invoice.billNo}" class="w-full bg-gray-50 p-1" data-index="${index}" data-field="billNo"></td>
                <td class="border p-1"><input type="date" value="${invoice.date}" class="w-full bg-gray-50 p-1" data-index="${index}" data-field="date"></td>
                <td class="border p-1"><input type="text" value="${invoice.amount}" class="w-full bg-gray-50 p-1" data-index="${index}" data-field="amount"></td>
                <td class="border p-1 text-center"><button class="text-red-500 font-bold" data-index="${index}">X</button></td>
            `;
            invoiceTableBody.appendChild(row);
        });
    };

    invoiceBtn.addEventListener('click', () => invoiceModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => invoiceModal.classList.add('hidden'));

    addInvoiceRowBtn.addEventListener('click', () => {
        invoices.push({ billNo: '', date: '', amount: '' });
        renderInvoiceTable();
    });

    invoiceTableBody.addEventListener('change', (e) => {
        if (e.target.tagName === 'INPUT') {
            const { index, field } = e.target.dataset;
            invoices[index][field] = e.target.value;
        }
    });

    invoiceTableBody.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const { index } = e.target.dataset;
            invoices.splice(index, 1);
            renderInvoiceTable();
        }
    });

    // MODIFIED: Extracted annexure logic into its own function
    window.renderAnnexure = (invoiceList) => {
        if (!invoiceList || invoiceList.length === 0) {
            annexureDisplay.innerHTML = ''; // Clear it if no invoices
            return;
        }

        let annexureHTML = `
            <h3 class="font-bold text-center text-lg mb-2">ANNEXURE-1</h3>
            <table class="w-full border-collapse border border-black text-sm">
                <thead>
                    <tr class="bg-gray-200">
                        <th class="border border-black p-2">BILL NO</th>
                        <th class="border border-black p-2">DATE</th>
                        <th class="border border-black p-2">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
        `;
        let totalAmount = 0;
        invoiceList.forEach(inv => {
            annexureHTML += `
                <tr>
                    <td class="border border-black p-2">${inv.billNo || ''}</td>
                    <td class="border border-black p-2">${inv.date || ''}</td>
                    <td class="border border-black p-2 text-right">${parseFloat(inv.amount || 0).toFixed(2)}</td>
                </tr>
            `;
            totalAmount += parseFloat(inv.amount || 0);
        });

        annexureHTML += `
                <tr class="font-bold bg-gray-100">
                    <td colspan="2" class="border border-black p-2 text-right">TOTAL</td>
                    <td class="border border-black p-2 text-right">${totalAmount.toFixed(2)}</td>
                </tr>
            </tbody></table>
        `;

        annexureDisplay.innerHTML = annexureHTML;
    }

    saveInvoicesBtn.addEventListener('click', () => {
        // Now just calls the new function
        renderAnnexure(invoices);
        invoiceModal.classList.add('hidden');
    });

    // --- Initial Load ---
    loadData();
});
