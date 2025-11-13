/* Transporter Web App – Firebase Edition (FINAL) */
document.addEventListener('DOMContentLoaded', () => {
let CURRENT_CLIENT_ID = null; // लॉग इन क्लाइंट का ID स्टोर करता है
let localConsignors = []; // Consignors को यहाँ कैश करें
let localConsignees = []; // Consignees को यहाँ कैश करें
let localLrs = []; // LRs को यहाँ कैश करें
let localInvoices = []; // Invoices को यहाँ कैश करें
let localExpenses = []; // Stores fetched expenses
let localVehicles = []; // <-- MOVED FROM LINE 1354
let currentlyEditingCgorId = null;
let currentlyEditingCgeeId = null;

/* ---------- Utils ---------- */
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];
const fmt = n => (isNaN(+n) ? 0 : +n).toFixed(2);
const today = () => new Date().toISOString().slice(0, 10);
const uid = (p = 'ID') => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// ===== NEW =====
// Indian Date Formatter (yyyy-MM-dd to dd-MM-yyyy)
const fmtDate = (isoDate) => {
  if (!isoDate || isoDate.length < 10) return '';
  // isoDate is yyyy-MM-dd
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`; // dd-MM-yyyy
};
// ===== END NEW =====

/* ---------- NEW Toast Notification Function ---------- */
function toast(msg, type = 'success') {
  const container = qs('#toast-container');
  if (!container) return;
  
  const toastEl = document.createElement('div');
  toastEl.className = `toast ${type}`;
  toastEl.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${msg}</span>
  `;
  container.appendChild(toastEl);
  
  setTimeout(() => {
    toastEl.style.animation = 'toast-out 0.5s forwards';
    toastEl.addEventListener('animationend', () => toastEl.remove());
  }, 3000);
}

/* ---------- Login (Firebase) ---------- */
const loginScreen = qs('#login-screen');
const appShell = qs('#app-shell');
const currentUser = qs('#current-user');

qs('#year').textContent = new Date().getFullYear();

qs('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = qs('#login-username').value.trim();
  const password = qs('#login-password').value.trim();
  
  const loginButton = qs('#login-form button');
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged बाकी को संभाल लेगा
  } catch (error) {
    console.error("Login Error:", error.message);
    toast("Login failed: " + error.message, "error");
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
});

qs('#btn-logout').addEventListener('click', () => {
  auth.signOut().then(() => {
    location.reload();
  });
});

/* ---------- Navigation & Drawer ---------- */
const contentPages = {
  dashboard: qs('#page-dashboard'),
  lr: qs('#page-lr'),
  invoice: qs('#page-invoice'),
  masters: qs('#page-masters'),
  reports: qs('#page-reports'),
  settings: qs('#page-settings'),
  expenses: qs('#page-expenses'), // If you added expenses previously
  fleet: qs('#page-fleet'),       // <--- ADD THIS
  drivers: qs('#page-drivers')    // <--- ADD THIS
};

function setNav(name) {
  Object.entries(contentPages).forEach(([k, sec]) => {
    sec.classList.toggle('hidden', k !== name);
  });
  qsa('.nav-btn').forEach(b => b.classList.remove('active'));
  qsa(`[data-nav="${name}"]`).forEach(b => b.classList.add('active'));
}

qsa('.nav-btn').forEach(btn => btn.addEventListener('click', e => {
  setNav(btn.getAttribute('data-nav'));
  qs('#mobile-drawer')?.classList.add('hidden'); 
}));

qs('#btn-open-drawer').addEventListener('click', () => {
  qs('#mobile-drawer')?.classList.remove('hidden');
});

qsa('#mobile-drawer [data-close]').forEach(el => el.addEventListener('click', () => {
  qs('#mobile-drawer')?.classList.add('hidden');
}));

function enterApp(user) {
  qs('#splash-screen').classList.add('hidden'); // <-- सही जगह
  if (!user) return;
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  currentUser.textContent = `User: ${user.email}`; 
  setNav('dashboard');

  fillCompanySettings(); 
}

auth.onAuthStateChanged(user => {
  if (user) {
    // उपयोगकर्ता लॉग इन है
    console.log("User is logged in:", user.email);

    // 1. URL से clientId प्राप्त करें (जो index.html में सेट किया गया था)
    const urlClientId = window.APP_CLIENT_ID;
    if (!urlClientId) {
       toast("Login failed: No client specified in URL.", "error");
       auth.signOut();
       return;
    }

    // 2. Firestore से उपयोगकर्ता की असली clientId प्राप्त करें
    db.collection('users').doc(user.uid).get().then(doc => {
      if (!doc.exists) {
        console.error("User entry not found in 'users' collection!");
        toast("Error: User profile not configured.", "error");
        auth.signOut();
        return;
      }

     const userClientId = doc.data().clientId ? doc.data().clientId.trim() : null;

      console.log("CHECKING URL CLIENT ID:", "'" + urlClientId + "'");
      console.log("CHECKING USER CLIENT ID:", "'" + userClientId + "'");
      console.log("ARE THEY EQUAL?:", userClientId === urlClientId);
      if (userClientId === urlClientId) {
        // हाँ! यह सही उपयोगकर्ता है।
        CURRENT_CLIENT_ID = userClientId;
        console.log("Client ID Verified:", CURRENT_CLIENT_ID);

        // ऐप में एंटर करें
        enterApp(user);
        loadAllClientData();

      } else {
        // नहीं! यह गलत उपयोगकर्ता है।
        console.error("Security mismatch:", user.email, "does not belong to client", urlClientId);
        toast("Error: This user does not belong to this company.", "error");
        auth.signOut();
      }

    }).catch(error => {
      console.error("Error fetching user data:", error);
      toast("Error: " + error.message, "error");
      auth.signOut();
    });

  } else {
    
      qs('#splash-screen').classList.add('hidden'); 
      console.log("User is logged out.");
      loginScreen.classList.remove('hidden');
      appShell.classList.add('hidden');
      CURRENT_CLIENT_ID = null;

    const loginButton = qs('#login-form button');
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = 'Login';
    }
  }
});

async function loadAllClientData() {
  if (!CURRENT_CLIENT_ID) return;
  console.log("Loading all client data...");
  
  await Promise.all([
    loadAllMasters(),
    loadAllTransactions(),
    loadAllExpenses(),
    loadAllVehicles()
  ]);
  
  console.log("All data loaded. Refreshing UI.");
  renderLRReport();
  renderInvoiceReport();
  buildInvoiceLRList();
  refreshKPIs();
}

async function loadAllMasters() {
  try {
    // Consignors
    const cgorQuery = db.collection("consignors").where("clientId", "==", CURRENT_CLIENT_ID);
    const cgorSnapshot = await cgorQuery.get();
    localConsignors = cgorSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    console.log("Loaded consignors:", localConsignors.length);
    renderMasterTable('cgor');

    // Consignees
    const cgeeQuery = db.collection("consignees").where("clientId", "==", CURRENT_CLIENT_ID);
    const cgeeSnapshot = await cgeeQuery.get();
    localConsignees = cgeeSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    console.log("Loaded consignees:", localConsignees.length);
    renderMasterTable('cgee');
  } catch (error) {
    console.error("Error loading masters:", error);
    toast("Error loading masters: " + error.message, "error");
  }
}

async function loadAllTransactions() {
  try {
    // LRs
    const lrQuery = db.collection("lrs").where("clientId", "==", CURRENT_CLIENT_ID);
    const lrSnapshot = await lrQuery.get();
    localLrs = lrSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    console.log("Loaded LRs:", localLrs.length);

    // Invoices
    const invQuery = db.collection("invoices").where("clientId", "==", CURRENT_CLIENT_ID);
    const invSnapshot = await invQuery.get();
    localInvoices = invSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    console.log("Loaded Invoices:", localInvoices.length);
    
  } catch (error) {
    console.error("Error loading transactions:", error);
    toast("Error loading transactions: " + error.message, "error");
  }
}


/* ---------- Masters CRUD (Firestore) ---------- */
function renderMasterTable(kind) {
  const data = (kind === 'cgor') ? localConsignors : localConsignees;
  const table = qs(kind === 'cgor' ? '#m-cgor-table' : '#m-cgee-table');
  table.innerHTML = `
    <thead><tr>
      <th class="th">GST</th><th class="th">Name</th><th class="th">Address</th>
      <th class="th">Pin</th><th class="th">Station</th><th class="th">Actions</th>
    </tr></thead>
    <tbody>
      ${data.map(d => `
        <tr>
          <td class="td">${d.gst || ''}</td>
          <td class="td">${d.name || ''}</td>
          <td class="td">${d.address || ''}</td>
          <td class="td">${d.pin || ''}</td>
          <td class="td">${d.station || ''}</td>
          <td class="td">
            <span class="action" data-edit="${d.docId}">Edit</span> ·
            <span class="action" data-del="${d.docId}">Delete</span>
          </td>
        </tr>`).join('')}
    </tbody>`;
  table.querySelectorAll('[data-edit]').forEach(a => a.onclick = () => loadMasterToForm(kind, a.dataset.edit));
  table.querySelectorAll('[data-del]').forEach(a => a.onclick = () => deleteMaster(kind, a.dataset.del));
}

async function deleteMaster(kind, docId) {
  if (!confirm("Are you sure you want to delete this entry?")) return;
  const collectionName = (kind === 'cgor') ? 'consignors' : 'consignees';
  try {
    await db.collection(collectionName).doc(docId).delete();
    if (kind === 'cgor') {
      localConsignors = localConsignors.filter(x => x.docId !== docId);
    } else {
      localConsignees = localConsignees.filter(x => x.docId !== docId);
    }
    renderMasterTable(kind);
    toast('Entry deleted', 'success');
  } catch (error) {
    console.error("Error deleting document:", error);
    toast("Delete failed: " + error.message, "error");
  }
}

function loadMasterToForm(kind, docId) {
  const d = (kind === 'cgor' ? localConsignors : localConsignees).find(x => x.docId === docId);
  if (!d) return;
  if (kind === 'cgor') {
    qs('#m-cgor-gst').value = d.gst;
    qs('#m-cgor-name').value = d.name;
    qs('#m-cgor-address').value = d.address;
    qs('#m-cgor-pin').value = d.pin || '';
    qs('#m-cgor-station').value = d.station || '';
    currentlyEditingCgorId = docId;
  } else {
    qs('#m-cgee-gst').value = d.gst;
    qs('#m-cgee-name').value = d.name;
    qs('#m-cgee-address').value = d.address;
    qs('#m-cgee-pin').value = d.pin || '';
    qs('#m-cgee-station').value = d.station || '';
    currentlyEditingCgeeId = docId;
  }
}

qs('#m-cgor-save').onclick = async () => {
  const data = {
    gst: qs('#m-cgor-gst').value.trim(),
    name: qs('#m-cgor-name').value.trim(),
    address: qs('#m-cgor-address').value.trim(),
    pin: qs('#m-cgor-pin').value.trim(),
    station: qs('#m-cgor-station').value.trim(),
    clientId: CURRENT_CLIENT_ID
  };
  try {
    if (currentlyEditingCgorId) {
      const docRef = db.collection('consignors').doc(currentlyEditingCgorId);
      await docRef.update(data);
      const index = localConsignors.findIndex(x => x.docId === currentlyEditingCgorId);
      if (index > -1) localConsignors[index] = { ...data, docId: currentlyEditingCgorId };
    } else {
      const docRef = await db.collection('consignors').add(data);
      localConsignors.push({ ...data, docId: docRef.id });
    }
    renderMasterTable('cgor');
    qs('#m-cgor-clear').onclick();
    toast('Consignor saved', 'success');
  } catch (error) {
    console.error("Error saving consignor:", error);
    toast("Save failed: " + error.message, "error");
  }
};

qs('#m-cgee-save').onclick = async () => {
  const data = {
    gst: qs('#m-cgee-gst').value.trim(),
    name: qs('#m-cgee-name').value.trim(),
    address: qs('#m-cgee-address').value.trim(),
    pin: qs('#m-cgee-pin').value.trim(),
    station: qs('#m-cgee-station').value.trim(),
    clientId: CURRENT_CLIENT_ID
  };
  try {
    if (currentlyEditingCgeeId) {
      const docRef = db.collection('consignees').doc(currentlyEditingCGEEId);
      await docRef.update(data);
      const index = localConsignees.findIndex(x => x.docId === currentlyEditingCgeeId);
      if (index > -1) localConsignees[index] = { ...data, docId: currentlyEditingCgeeId };
    } else {
      const docRef = await db.collection('consignees').add(data);
      localConsignees.push({ ...data, docId: docRef.id });
    }
    renderMasterTable('cgee');
    qs('#m-cgee-clear').onclick();
    toast('Consignee saved', 'success');
  } catch (error) {
    console.error("Error saving consignee:", error);
    toast("Save failed: " + error.message, "error");
  }
};

qs('#m-cgor-clear').onclick = () => {
  qsa('#m-cgor-gst,#m-cgor-name,#m-cgor-address,#m-cgor-pin,#m-cgor-station').forEach(i => i.value = '');
  currentlyEditingCgorId = null;
};
qs('#m-cgee-clear').onclick = () => {
  qsa('#m-cgee-gst,#m-cgee-name,#m-cgee-address,#m-cgee-pin,#m-cgee-station').forEach(i => i.value = '');
  currentlyEditingCgeeId = null;
};

qs('#m-cgor-search').addEventListener('input', e => filterMaster('cgor', e.target.value));
qs('#m-cgee-search').addEventListener('input', e => filterMaster('cgee', e.target.value));

function filterMaster(kind, q) {
  const all = (kind === 'cgor') ? localConsignors : localConsignees;
  const terms = (q || '').toLowerCase();
  const filtered = all.filter(x => (x.gst + x.name + x.address + x.station).toLowerCase().includes(terms));
  const t = qs(kind === 'cgor' ? '#m-cgor-table' : '#m-cgee-table');
  t.querySelector('tbody').innerHTML = filtered.map(d => `
    <tr>
      <td class="td">${d.gst}</td><td class="td">${d.name}</td>
      <td class="td">${d.address}</td><td class="td">${d.pin || ''}</td>
      <td class="td">${d.station || ''}</td>
      <td class="td"><span class="action" data-edit="${d.docId}">Edit</span> · <span class="action" data-del="${d.docId}">Delete</span></td>
    </tr>`).join('');
  t.querySelectorAll('[data-edit]').forEach(a => a.onclick = () => loadMasterToForm(kind, a.dataset.edit));
  t.querySelectorAll('[data-del]').forEach(a => a.onclick = () => deleteMaster(kind, a.dataset.del));
}

/* ---------- LR: Auto populate from Masters ---------- */
function masterLookup(inputEl, searchField, type) {
  inputEl.addEventListener('input', () => {
    const v = inputEl.value.trim().toLowerCase();
    const data = (type === 'cgor' ? localConsignors : localConsignees);
    let hit = null;
    if (searchField === 'gst') {
      if (v.length === 15) {
        hit = data.find(d => d.gst.toLowerCase() === v);
      }
    } else if (searchField === 'name') {
      if (v.length >= 3) {
        hit = data.find(d => d.name.toLowerCase().startsWith(v));
      }
    }
    if (hit) {
      const prefix = type === 'cgor' ? 'cgor' : 'cgee';
      qs(`#${prefix}-gst`).value = hit.gst || '';
      qs(`#${prefix}-name`).value = hit.name || '';
      qs(`#${prefix}-address`).value = hit.address || '';
      qs(`#${prefix}-pin`).value = hit.pin || '';
      qs(`#${prefix}-station`).value = hit.station || '';
    }
  });
}
masterLookup(qs('#cgor-gst'), 'gst', 'cgor');
masterLookup(qs('#cgee-gst'), 'gst', 'cgee');
masterLookup(qs('#cgor-name'), 'name', 'cgor');
masterLookup(qs('#cgee-name'), 'name', 'cgee');

/* ---------- Auto-calculate Goods Amount ---------- */
function recalcGoodsAmount() {
  const w = +qs('#goods-weight').value || 0;
  const f = +qs('#goods-freight').value || 0;
  qs('#goods-amount').value = fmt(w * f);
}
qs('#goods-weight').addEventListener('input', recalcGoodsAmount);
qs('#goods-freight').addEventListener('input', recalcGoodsAmount);

/* ---------- Goods rows ---------- */
const goodsRows = qs('#goods-rows');
qs('#goods-add').onclick = () => {
  const d = qs('#goods-desc').value.trim();
  const details = qs('#goods-details').value.trim();
  const w = +qs('#goods-weight').value || 0;
  const f = +qs('#goods-freight').value || 0;
  const amt = +qs('#goods-amount').value || 0;
  if (!d) return;
  const id = uid('ROW');
  goodsRows.insertAdjacentHTML('beforeend', `
    <tr data-id="${id}" data-details="${escape(details)}">
      <td class="td">${d}</td>
      <td class="td text-right">${fmt(w)}</td>
      <td class="td text-right">${fmt(f)}</td>
      <td class="td text-right">${fmt(amt)}</td>
      <td class="td"><span class="action" data-rm="${id}">Remove</span></td>
    </tr>`);
  goodsRows.querySelector(`[data-rm="${id}"]`).onclick = () => { goodsRows.querySelector(`[data-id="${id}"]`).remove(); updateGoodsTotal(); };
  updateGoodsTotal();
  qsa('#goods-desc,#goods-details,#goods-weight,#goods-freight,#goods-amount').forEach(i => i.value = '');
};

// ===== NEW =====
// Recalculate "To Pay" from "Total" and "Advance"
function recalcToPay() {
  const total = +qs('#goods-total').textContent || 0;
  const advance = +qs('#lr-advance').value || 0;
  const toPay = total - advance;
  qs('#lr-to-pay').textContent = fmt(toPay);
}
// Add event listener for the new Advance input
qs('#lr-advance').addEventListener('input', recalcToPay);
// ===== END NEW =====

// ===== CHANGED =====
function updateGoodsTotal() {
  let t = 0; 
  qsa('#goods-rows tr').forEach(tr => { t += +tr.children[3].textContent || 0; });
  qs('#goods-total').textContent = fmt(t);
  recalcToPay(); // Call the new function
}
// ===== END CHANGE =====


/* ---------- Lorry Receipt (LR) Section (Firestore) ---------- */

async function nextLRNumber() {
  const y = new Date().getFullYear().toString();
  const counterRef = db.collection('counters').doc(CURRENT_CLIENT_ID);

  try {
    let nextStr = "LR-Error";
    
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      let seqMap = {};
      let next = 1;

      if (!doc.exists) {
        seqMap = { [y]: 1 };
        next = 1;
      } else {
        seqMap = doc.data().sequences || {};
        next = (seqMap[y] || 0) + 1;
        seqMap[y] = next;
      }
      
      transaction.set(counterRef, { sequences: seqMap });
      
      const nextNum = String(next).padStart(4, '0');
      nextStr = `LR-${y}-${nextNum}`;
    });
    
    return nextStr;

  } catch (e) {
    console.error("LR Counter Transaction failed: ", e);
    toast("Error generating LR number. Please try again.", "error");
    return null;
  }
}

// ===== CHANGED =====
async function collectLR() {
  let number = qs('#lr-number').value.trim();
  if (!number) {
    number = await nextLRNumber(); 
    if (!number) return null;
    qs('#lr-number').value = number;
  }

  return {
    number,
    date: qs('#lr-date').value || today(),
    vehicle: qs('#lr-vehicle').value.trim(),
    driver: qs('#lr-driver').value.trim(),
    consignor: {
      gst: qs('#cgor-gst').value.trim(), name: qs('#cgor-name').value.trim(),
      address: qs('#cgor-address').value.trim(), pin: qs('#cgor-pin').value.trim(),
      station: qs('#cgor-station').value.trim()
    },
    consignee: {
      gst: qs('#cgee-gst').value.trim(), name: qs('#cgee-name').value.trim(),
      address: qs('#cgee-address').value.trim(), pin: qs('#cgee-pin').value.trim(),
      station: qs('#cgee-station').value.trim()
    },
    goods: qsa('#goods-rows tr').map(tr => ({
      desc: tr.children[0].textContent,
      details: unescape(tr.dataset.details || ''),
      weight: +tr.children[1].textContent,
      freight: +tr.children[2].textContent,
      amount: +tr.children[3].textContent
    })),
    totals: { 
      amount: +qs('#goods-total').textContent || 0,
      advance: +qs('#lr-advance').value || 0,
      toPay: +qs('#lr-to-pay').textContent || 0
    },
    insurance: {
      company: qs('#ins-company').value.trim(), policy: qs('#ins-policy').value.trim(),
      amount: qs('#ins-amount').value.trim(), date: qs('#ins-date').value
    },
    isTBB: qs('#goods-tbb').checked,
    hideDetails: qs('#lr-hide-details').checked, // Added this
    gstBy: qs('#lr-gst-by').value,
    bank: { name: qs('#bank-name').value.trim(), ac: qs('#bank-ac').value.trim(), ifsc: qs('#bank-ifsc').value.trim() },
    terms: qs('#lr-terms').value.trim(),
    clientId: CURRENT_CLIENT_ID
  };
}
// ===== END CHANGE =====

// ===== CHANGED =====
function setLR(lr) {
  qs('#lr-number').value = lr.number;
  qs('#lr-date').value = lr.date;
  qs('#lr-vehicle').value = lr.vehicle;
  qs('#lr-driver').value = lr.driver || '';
  qs('#cgor-gst').value = lr.consignor.gst || '';
  qs('#cgor-name').value = lr.consignor.name || '';
  qs('#cgor-address').value = lr.consignor.address || '';
  qs('#cgor-pin').value = lr.consignor.pin || '';
  qs('#cgor-station').value = lr.consignor.station || '';
  qs('#cgee-gst').value = lr.consignee.gst || '';
  qs('#cgee-name').value = lr.consignee.name || '';
  qs('#cgee-address').value = lr.consignee.address || '';
  qs('#cgee-pin').value = lr.consignee.pin || '';
  qs('#cgee-station').value = lr.consignee.station || '';
  qs('#goods-tbb').checked = lr.isTBB || false;
  qs('#lr-hide-details').checked = lr.hideDetails || false; // Added this
  
  goodsRows.innerHTML = '';
  (lr.goods || []).forEach(g => {
    const id = uid('ROW');
    goodsRows.insertAdjacentHTML('beforeend', `
      <tr data-id="${id}" data-details="${escape(g.details || '')}">
        <td class="td">${g.desc}</td>
        <td class="td text-right">${fmt(g.weight)}</td>
        <td class="td text-right">${fmt(g.freight)}</td>
        <td class="td text-right">${fmt(g.amount)}</td>
        <td class="td"><span class="action" data-rm="${id}">Remove</span></td>
      </tr>`);
    goodsRows.querySelector(`[data-rm="${id}"]`).onclick = () => { goodsRows.querySelector(`[data-id="${id}"]`).remove(); updateGoodsTotal(); };
  });
  
  updateGoodsTotal(); // Updates total
  qs('#lr-advance').value = fmt(lr.totals.advance || 0); // Set advance
  recalcToPay(); // Recalculate and set To Pay
  
  qs('#ins-company').value = lr.insurance.company || '';
  qs('#ins-policy').value = lr.insurance.policy || '';
  qs('#ins-amount').value = lr.insurance.amount || '';
  qs('#ins-date').value = lr.insurance.date || '';
  qs('#lr-gst-by').value = lr.gstBy || 'Receiver';
  qs('#bank-name').value = lr.bank.name || '';
  qs('#bank-ac').value = lr.bank.ac || '';
  qs('#bank-ifsc').value = lr.bank.ifsc || '';
  qs('#lr-terms').value = lr.terms || defaultTerms();
}
// ===== END CHANGE =====

function defaultTerms() {
  return `1. The Consignment Note is subject to conditions printed overleaf.
2. We are not responsible for leakage and breakage.
3. Shortage allowed 1%.`;
}

qs('#lr-save').onclick = async () => {
  const lr = await collectLR();
  if (!lr) return;

  const idx = localLrs.findIndex(x => x.number === lr.number);

  try {
    if (idx > -1) {
      const docId = localLrs[idx].docId;
      await db.collection('lrs').doc(docId).update(lr);
      localLrs[idx] = { ...lr, docId: docId };
      toast('LR updated in cloud', 'success');
    } else {
      const docRef = await db.collection('lrs').add(lr);
      localLrs.push({ ...lr, docId: docRef.id });
      toast('LR saved to cloud', 'success');
    }
    
    qs('#lr-number').value = lr.number;
    
    refreshKPIs();
    buildInvoiceLRList();
    renderLRReport();
    buildLRPrint(lr);
    
  } catch (error) {
    console.error("Error saving LR:", error);
    toast("LR Save Failed: " + error.message, "error");
  }
};

qs('#lr-edit').onclick = async () => {
  const n = prompt('Enter LR No to edit:');
  if (!n) return;
  
  try {
    const q = db.collection('lrs')
      .where("number", "==", n.trim())
      .where("clientId", "==", CURRENT_CLIENT_ID);
      
    const snapshot = await q.get();
    
    if (snapshot.empty) {
      return toast('Not found in cloud', 'error');
    }
    
    const doc = snapshot.docs[0];
    const hit = { ...doc.data(), docId: doc.id };
    
    setLR(hit);
    buildLRPrint(hit);
    
  } catch (error) {
    console.error("Error fetching LR for edit:", error);
    toast("Error: " + error.message, "error");
  }
};

/* ---------- LR Print Area ---------- */
// ===== CHANGED =====
function buildLRPrint(lr) {
  const c = {
      name: qs('#cmp-name').value,
      address: qs('#cmp-address').value,
      gst: qs('#cmp-gst').value,
      pan: qs('#cmp-pan').value,
      contact: qs('#cmp-contact').value,
      email: qs('#cmp-email').value
  };
  
  const el = qs('#lr-print-area');
  el.innerHTML = `
  <div class="lr-sheet a4-landscape">
    <div class="lr-row lr-header">
      <div class="lr-col lr-col-12 text-center">
        <div class="lr-title">${c.name || ''}</div>
        <div class="lr-sub">${(c.address || '').replace(/\n/g, ' ')}</div>
        <div class="lr-sub">GSTIN: ${c.gst || ''} &nbsp;|&nbsp; PAN: ${c.pan || ''} &nbsp;|&nbsp; ${c.contact || ''}</div>
        <div class="lr-sub">${c.email || ''}</div>
      </div>
    </div>
    <div class="rule rule-blue"></div>
    <div class="lr-row">
      <div class="lr-col lr-col-3"><span class="lbl">LR No:</span> <b>${lr.number}</b></div>
      <div class="lr-col lr-col-3"><span class="lbl">Date:</span> ${fmtDate(lr.date)}</div>
      <div class="lr-col lr-col-3"><span class="lbl">Vehicle No:</span> ${lr.vehicle || ''}</div>
      <div class="lr-col lr-col-3"><span class="lbl">Driver:</span> ${lr.driver || ''}</div>
    </div>
    <div class="lr-row">
      <div class="lr-col lr-col-6"><span class="lbl">From:</span> ${lr.consignor.station || ''}</div>
      <div class="lr-col lr-col-6"><span class="lbl">To:</span> ${lr.consignee.station || ''}</div>
    </div>
    <div class="rule"></div>
    <div class="lr-row">
      <div class="lr-col lr-col-6 lr-box">
        <div class="box-title">CONSIGNOR</div>
        <div class="box-line"><span class="lbl">Name:</span> ${lr.consignor.name || ''}</div>
        <div class="box-line"><span class="lbl">Address:</span> ${lr.consignor.address || ''}</div>
        <div class="box-line"><span class="lbl">GST:</span> ${lr.consignor.gst || ''}</div>
        <div class="box-line"><span class="lbl">Pincode:</span> ${lr.consignor.pin || ''}</div>
      </div>
      <div class="lr-col lr-col-6 lr-box">
        <div class="box-title">CONSIGNEE</div>
        <div class="box-line"><span class="lbl">Name:</span> ${lr.consignee.name || ''}</div>
        <div class="box-line"><span class="lbl">Address:</span> ${lr.consignee.address || ''}</div>
        <div class="box-line"><span class="lbl">GST:</span> ${lr.consignee.gst || ''}</div>
        <div class="box-line"><span class="lbl">Pincode:</span> ${lr.consignee.pin || ''}</div>
      </div>
    </div>
    <table class="grid-table mt-8">
      <thead>
        ${lr.hideDetails ? `
          <tr>
            <th class="text-left">DESCRIPTION / NATURE OF GOODS</th>
            <th>AMOUNT</th>
          </tr>
        ` : `
          <tr>
            <th class="text-left">DESCRIPTION / NATURE OF GOODS</th>
            <th>CHARGED WT</th>
            <th>FREIGHT/UNIT</th>
            <th>AMOUNT</th>
          </tr>
        `}
      </thead>
      <tbody>
        ${(lr.goods || []).map(g => lr.hideDetails ? `
          <tr>
            <td class="text-left" style="vertical-align: top;">
              <b>${g.desc}</b>
              ${g.details ? `<br><span style="font-size: 9pt; white-space: pre-wrap; color: #333;">${g.details}</span>` : ''}
            </td>
            <td>${lr.isTBB ? 'To Be Billed' : fmt(g.amount)}</td>
          </tr>
        ` : `
          <tr>
            <td class="text-left" style="vertical-align: top;">
              <b>${g.desc}</b>
              ${g.details ? `<br><span style="font-size: 9pt; white-space: pre-wrap; color: #333;">${g.details}</span>` : ''}
            </td>
            <td>${fmt(g.weight)}</td>
            <td>${lr.isTBB ? 'To Be Billed' : fmt(g.freight)}</td>
            <td>${lr.isTBB ? 'To Be Billed' : fmt(g.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td class="text-right" colspan="${lr.hideDetails ? '1' : '3'}"><b>Total Freight</b></td>
          <td><b>${lr.isTBB ? 'To Be Billed' : fmt(lr.totals.amount)}</b></td>
        </tr>
        <tr>
          <td class="text-right" colspan="${lr.hideDetails ? '1' : '3'}"><b>Advance</b></td>
          <td><b>${lr.isTBB ? 'To Be Billed' : fmt(lr.totals.advance || 0)}</b></td>
        </tr>
        <tr>
          <td class="text-right" colspan="${lr.hideDetails ? '1' : '3'}"><b>To Pay</b></td>
          <td><b>${lr.isTBB ? 'To Be Billed' : fmt(lr.totals.toPay || 0)}</b></td>
        </tr>
      </tfoot>
    </table>
    <div class="lr-row mt-8">
      <div class="lr-col lr-col-6 lr-box">
        <div class="box-title">INSURANCE</div>
        <div class="box-line"><span class="lbl">Company:</span> ${lr.insurance.company || 'N/A'}</div>
        <div class="box-line"><span class="lbl">Policy No:</span> ${lr.insurance.policy || 'N/A'}</div>
        <div class="box-line"><span class="lbl">Amount:</span> ${lr.insurance.amount || 'N/A'}</div>
        <div class="box-line"><span class="lbl">Policy Date:</span> ${fmtDate(lr.insurance.date) || 'N/A'}</div>
      </div>
      <div class="lr-col lr-col-6 lr-box">
        <div class="box-title">BANK DETAILS</div>
        <div class="box-line"><span class="lbl">Bank:</span> ${lr.bank.name || ''}</div>
        <div class="box-line"><span class="lbl">A/C No:</span> ${lr.bank.ac || ''}</div>
        <div class="box-line"><span class="lbl">IFSC:</span> ${lr.bank.ifsc || ''}</div>
        <div class="box-line"><span class="lbl">GST Paid By:</span> ${lr.gstBy || 'Receiver'}</div>
      </div>
    </div>
    <div class="lr-row mt-4">
      <div class="lr-col lr-col-12 lr-box">
        <div class="box-title">TERMS & CONDITIONS</div>
        <pre class="terms" style="font-family: inherit; font-size: 10pt; white-space: pre-wrap;">${lr.terms || defaultTerms()}</pre>
      </div>
    </div>
    <div class="lr-row mt-8">
      <div class="lr-col lr-col-12 text-right">
        <div>For <b>${c.name || ''}</b></div>
        <div class="sign-line">Authorised Signature</div>
      </div>
    </div>
  </div>`;
}
// ===== END CHANGE =====

/* Print & Export & WhatsApp for LR */
qs('#lr-print').onclick = () => window.print();
qs('#lr-export').onclick = () => exportPdf('#lr-print-area', 'LR');
qs('#lr-whatsapp').onclick = async () => {
  const lr = await collectLR();
  if (!lr) return;
  const msg = encodeURIComponent(
    `LR ${lr.number}\n${lr.consignor.name} ➜ ${lr.consignee.name}\nFrom ${lr.consignor.station} to ${lr.consignee.station}\nVehicle ${lr.vehicle}\nAmount ₹${fmt(lr.totals.amount)}`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
};

/* ---------- Invoice (Firestore) ---------- */
function buildInvoiceFromLR(lr) {
  qs('#inv-from').value = `${lr.consignor.name} (${lr.consignor.gst})`;
  qs('#inv-to').value = `${lr.consignee.name} (${lr.consignee.gst})`;
  qs('#inv-amount').value = fmt(lr.totals.amount);
  recalcInvoiceTotal();
}

// ===== CHANGED =====
function buildInvoicePrint(inv) {
  const c = {
      name: qs('#cmp-name').value,
      address: qs('#cmp-address').value,
      gst: qs('#cmp-gst').value,
      pan: qs('#cmp-pan').value,
      contact: qs('#cmp-contact').value,
      email: qs('#cmp-email').value
  };
  const el = qs('#inv-print-area');
  el.innerHTML = `
  <div class="a4-landscape">
    <div class="text-center">
      <div class="text-2xl font-bold">${c.name || ''}</div>
      <div class="text-sm">${(c.address || '').replace(/\n/g, ' ')}</div>
      <div class="text-sm">GSTIN: ${c.gst || ''} | PAN No: ${c.pan || ''}</div>
      <div class="text-sm">Contact: ${c.contact || ''} | Email: ${c.email || ''}</div>
    </div>
    <hr class="my-3">
    <div class="grid sm:grid-cols-3 gap-2 text-sm">
      <div><b>Invoice No:</b> ${inv.number}</div>
      <div><b>Date:</b> ${fmtDate(inv.date)}</div>
      <div><b>Due:</b> ${fmtDate(inv.due)}</div>
      <div class="sm:col-span-3"><b>LR Link:</b> ${inv.lrNo}</div>
    </div>
    <div class="grid sm:grid-cols-2 gap-2 mt-3 text-sm">
      <div class="border rounded p-2"><div class="font-semibold mb-1">Bill From</div>${inv.from}</div>
      <div class="border rounded p-2"><div class="font-semibold mb-1">Bill To</div>${inv.to}</div>
    </div>
    <div class="mt-3 text-sm">
      <table class="w-full text-sm border">
        <thead class="bg-slate-50"><tr>
          <th class="th">Description</th><th class="th">Amount</th><th class="th">GST</th><th class="th">Total</th>
        </tr></thead>
        <tbody>
          <tr><td class="td">Freight as per LR ${inv.lrNo}</td><td class="td text-right">${fmt(inv.amount)}</td><td class="td text-right">${fmt(inv.gst)}</td><td class="td text-right">${fmt(inv.total)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="text-right mt-4 text-lg font-bold">Payable: ₹${fmt(inv.total)}</div>
  </div>`;
}
// ===== END CHANGE =====

qs('#inv-save').onclick = async () => {
  const lrNo = qs('#inv-lr-link').value;
  let number = qs('#inv-number').value.trim();
  if (!number) {
    number = `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    qs('#inv-number').value = number;
  }
  
  const inv = {
    number: number,
    date: qs('#inv-date').value || today(),
    due: qs('#inv-due').value || today(),
    lrNo,
    from: qs('#inv-from').value,
    to: qs('#inv-to').value,
    amount: +qs('#inv-amount').value || 0,
    gst: +qs('#inv-gst').value || 0,
    total: +qs('#inv-total').value || 0,
    clientId: CURRENT_CLIENT_ID
  };

  const idx = localInvoices.findIndex(x => x.number === inv.number);

  try {
    if (idx > -1) {
      const docId = localInvoices[idx].docId;
      await db.collection('invoices').doc(docId).update(inv);
      localInvoices[idx] = { ...inv, docId: docId };
      toast('Invoice updated in cloud', 'success');
    } else {
      const docRef = await db.collection('invoices').add(inv);
      localInvoices.push({ ...inv, docId: docRef.id });
      toast('Invoice saved to cloud', 'success');
    }

    refreshKPIs();
    renderInvoiceReport();
    buildInvoicePrint(inv);
    
  } catch (error) {
    console.error("Error saving Invoice:", error);
    toast("Invoice Save Failed: " + error.message, "error");
  }
};

qs('#inv-edit').onclick = async () => {
  const n = prompt('Enter Invoice No to edit:');
  if (!n) return;
  
  try {
    const q = db.collection('invoices')
      .where("number", "==", n.trim())
      .where("clientId", "==", CURRENT_CLIENT_ID);
      
    const snapshot = await q.get();
    
    if (snapshot.empty) {
      return toast('Not found in cloud', 'error');
    }
    
    const doc = snapshot.docs[0];
    const hit = { ...doc.data(), docId: doc.id };
    
    setInvoice(hit);
    buildInvoicePrint(hit);
    
  } catch (error) {
    console.error("Error fetching Invoice for edit:", error);
    toast("Error: " + error.message, "error");
  }
};

function setInvoice(inv) {
  qs('#inv-number').value = inv.number; qs('#inv-date').value = inv.date; qs('#inv-due').value = inv.due;
  qs('#inv-lr-link').value = inv.lrNo; qs('#inv-from').value = inv.from; qs('#inv-to').value = inv.to;
  qs('#inv-amount').value = fmt(inv.amount); qs('#inv-gst').value = fmt(inv.gst); qs('#inv-total').value = fmt(inv.total);
}

qs('#inv-print').onclick = () => window.print();
qs('#inv-export').onclick = () => exportPdf('#inv-print-area', 'Invoice');
qs('#inv-whatsapp').onclick = () => {
  const inv = {
    number: qs('#inv-number').value, to: qs('#inv-to').value,
    total: qs('#inv-total').value
  };
  const msg = encodeURIComponent(`Invoice ${inv.number}\n${inv.to}\nTotal ₹${inv.total}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
};

function buildInvoiceLRList() {
  const sel = qs('#inv-lr-link');
  const items = localLrs;
  sel.innerHTML = `<option value="">Select LR</option>` + items.map(x => `<option>${x.number}</option>`).join('');
  sel.onchange = () => {
    const lr = items.find(i => i.number === sel.value);
    if (lr) { 
      buildInvoiceFromLR(lr);
      recalcInvoiceTotal();
      const invData = {
          number: qs('#inv-number').value || 'Auto',
          date: qs('#inv-date').value || today(),
          due: qs('#inv-due').value || today(),
          lrNo: lr.number,
          from: qs('#inv-from').value,
          to: qs('#inv-to').value,
          amount: +qs('#inv-amount').value || 0,
          gst: +qs('#inv-gst').value || 0,
          total: +qs('#inv-total').value || 0
      };
      buildInvoicePrint(invData);
    }
  };
}

/* Invoice math */
function recalcInvoiceTotal() {
  const a = +qs('#inv-amount').value || 0;
  const g = +qs('#inv-gst').value || 0;
  qs('#inv-total').value = fmt(a + g);
}
qs('#inv-amount').addEventListener('input', recalcInvoiceTotal);
qs('#inv-gst').addEventListener('input', recalcInvoiceTotal);

/* ---------- Reports (Firestore/Local Cache) ---------- */
function renderLRReport() {
  const t = qs('#r-lr-table');
  if (!t) return;
  const q = (qs('#r-lr-search').value || '').toLowerCase();
  const from = qs('#r-lr-from').value; const to = qs('#r-lr-to').value;
  
  const items = localLrs.filter(x => {
    const okQ = (x.number + x.consignor.name + x.consignee.name + x.consignor.station + x.consignee.station).toLowerCase().includes(q);
    const okDate = (!from || x.date >= from) && (!to || x.date <= to);
    return okQ && okDate;
  });
  
  let total = 0;
  t.innerHTML = `
    <thead><tr>
      <th class="th">Date</th><th class="th">LR No</th><th class="th">Vehicle</th>
      <th class="th">From</th><th class="th">To</th><th class="th">Consignor</th><th class="th">Consignee</th><th class="th">Amount</th>
    </tr></thead>
    <tbody>
      ${items.map(x => {
    total += x.totals.amount || 0;
    return `<tr>
          <td class="td">${x.date}</td><td class="td">${x.number}</td><td class="td">${x.vehicle || ''}</td>
          <td class="td">${x.consignor.station || ''}</td><td class="td">${x.consignee.station || ''}</td>
          <td class="td">${x.consignor.name || ''}</td><td class="td">${x.consignee.name || ''}</td>
          <td class="td text-right">${fmt(x.totals.amount || 0)}</td>
        </tr>`;
  }).join('')}
    </tbody>`;
  qs('#r-lr-count').textContent = items.length;
  qs('#r-lr-total').textContent = fmt(total);
}

function renderInvoiceReport() {
  const t = qs('#r-inv-table');
  if (!t) return;
  const q = (qs('#r-inv-search').value || '').toLowerCase();
  const from = qs('#r-inv-from').value; const to = qs('#r-inv-to').value;
  
  const items = localInvoices.filter(x => {
    const okQ = (x.number + x.lrNo + x.to).toLowerCase().includes(q);
    const okDate = (!from || x.date >= from) && (!to || x.date <= to);
    return okQ && okDate;
  });
  
  let total = 0;
  t.innerHTML = `
    <thead><tr>
      <th class="th">Date</th><th class="th">Invoice No</th><th class="th">LR No</th>
      <th class="th">Bill To</th><th class="th">Amount</th><th class="th">GST</th><th class="th">Total</th>
    </tr></thead>
    <tbody>
      ${items.map(x => {
    total += x.total || 0;
    return `<tr>
          <td class="td">${x.date}</td><td class="td">${x.number}</td><td class="td">${x.lrNo}</td>
          <td class="td">${x.to}</td><td class="td text-right">${fmt(x.amount)}</td>
          <td class="td text-right">${fmt(x.gst)}</td><td class="td text-right">${fmt(x.total)}</td>
        </tr>`;
  }).join('')}
    </tbody>`;
  qs('#r-inv-count').textContent = items.length;
  qs('#r-inv-total').textContent = fmt(total);
}

['#r-lr-search', '#r-lr-from', '#r-lr-to'].forEach(sel => qs(sel)?.addEventListener('input', renderLRReport));
['#r-inv-search', '#r-inv-from', '#r-inv-to'].forEach(sel => qs(sel)?.addEventListener('input', renderInvoiceReport));

/* ---------- Settings / Company (Firestore) ---------- */
async function fillCompanySettings() {
  if (!CURRENT_CLIENT_ID) return; 
  try {
    const docRef = db.collection('company').doc(CURRENT_CLIENT_ID);
    const doc = await docRef.get();
    let c = {}; 
    if (doc.exists) {
      c = doc.data(); 
    } else {
      console.warn("Company profile document does not exist for:", CURRENT_CLIENT_ID);
      toast("No company profile found. Please save one.", "error");
    }
    
    // Safely query elements that might exist
    const safeSet = (id, val) => {
      const el = qs(id);
      if (el) el.value = val || '';
    };

    safeSet('#cmp-name', c.name);
    safeSet('#cmp-email', c.email);
    safeSet('#cmp-contact', c.contact);
    safeSet('#cmp-pan', c.pan);
    safeSet('#cmp-gst', c.gst);
    safeSet('#cmp-bank', c.bank);
    safeSet('#cmp-ac', c.ac);
    safeSet('#cmp-ifsc', c.ifsc);
    safeSet('#cmp-address', c.address);

    // Also update LR bank details
    safeSet('#bank-name', c.bank);
    safeSet('#bank-ac', c.ac);
    safeSet('#bank-ifsc', c.ifsc);
    
  } catch (error) {
    console.error("Error loading company settings:", error);
    toast("Error loading company data: " + error.message, "error");
  }
}

qs('#cmp-save').onclick = async () => {
  if (!CURRENT_CLIENT_ID) {
    toast("Cannot save: No client selected.", "error");
    return;
  }
  const companyData = {
    name: qs('#cmp-name').value.trim(), 
    email: qs('#cmp-email').value.trim(),
    contact: qs('#cmp-contact').value.trim(), 
    pan: qs('#cmp-pan').value.trim(),
    gst: qs('#cmp-gst').value.trim(), 
    bank: qs('#cmp-bank').value.trim(),
    ac: qs('#cmp-ac').value.trim(), 
    ifsc: qs('#cmp-ifsc').value.trim(),
    address: qs('#cmp-address').value.trim()
  };
  try {
    const docRef = db.collection('company').doc(CURRENT_CLIENT_ID);
    await docRef.set(companyData);
    toast('Company profile saved to cloud', 'success');
    fillCompanySettings();
    try {
      const lrNumber = qs('#lr-number').value;
      if (lrNumber) {
         const lrNow = localLrs.find(lr => lr.number === lrNumber);
         if(lrNow) buildLRPrint(lrNow);
      }
    } catch (e) {
      console.warn("Could not refresh LR print preview on company save.", e);
    }
  } catch (error) {
    console.error("Error saving company profile:", error);
    toast("Save failed: " + error.message, "error");
  }
};

qs('#cmp-clear').onclick = () => {
  qsa('#cmp-name, #cmp-email, #cmp-contact, #cmp-pan, #cmp-gst, #cmp-bank, #cmp-ac, #cmp-ifsc, #cmp-address').forEach(i => i.value = '');
};

/* ---------- Export PDF (html2canvas + jsPDF) ---------- */
async function exportPdf(sel, prefix) {
  const node = qs(sel);
  if (!node || !node.firstElementChild) { return toast('Nothing to export', 'error'); }
  if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
    console.error('jsPDF or html2canvas not loaded');
    toast('PDF export library not loaded. Please wait and try again.', 'error');
    return;
  }
  const targetEl = node.firstElementChild;
  const scrollWrapper = node.parentElement; 
  const mainContent = qs('#content');
  const oldWrapperStyle = scrollWrapper.style.cssText;
  const oldContentStyle = mainContent.style.cssText;
  const fullWidth = targetEl.scrollWidth;
  scrollWrapper.style.overflow = 'visible';
  mainContent.style.minWidth = `${fullWidth}px`; 
  const { jsPDF } = window.jspdf;
  await new Promise(resolve => setTimeout(resolve, 100));
  const canvas = await html2canvas(targetEl, { scale: 3, useCORS: true });
  scrollWrapper.style.cssText = oldWrapperStyle;
  mainContent.style.cssText = oldContentStyle;
  const img = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(img, 'PNG', 0, 0, pageW, pageH);
  const file = `${prefix}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
  pdf.save(file);
}

/* ---------- KPIs (Firestore/Local Cache) ---------- */
function refreshKPIs() {
  // 1. Update Receipt Count
  const elReceipts = qs('#kpi-receipts');
  if (elReceipts) elReceipts.textContent = localLrs.length;

  // 2. Update Invoice Count
  const elInvoices = qs('#kpi-invoices');
  if (elInvoices) elInvoices.textContent = localInvoices.length;

  // 3. Update Parties Count
  const elParties = qs('#kpi-parties');
  if (elParties) {
    const parties = new Set([...localConsignors, ...localConsignees].map(x => x.gst));
    elParties.textContent = parties.size;
  }

  // 4. Update Stations Count
  const elStations = qs('#kpi-stations');
  if (elStations) {
    const stations = new Set([...localConsignors.map(x => x.station), ...localConsignees.map(x => x.station)].filter(Boolean));
    elStations.textContent = stations.size;
  }
  
  // 5. Update Compliance Alert (Safety Check)
  if (typeof checkComplianceAlerts === 'function') {
    checkComplianceAlerts();
  }
}

/* ---------- Initialize some defaults ---------- */
(function init() {
  qs('#lr-date').value = today();
  qs('#inv-date').value = today();
  qs('#inv-due').value = today();
  qs('#lr-terms').value = defaultTerms();
})();

/* =========================================
   EXPENSE MANAGER MODULE
   ========================================= */

// 1. Load Expenses from Cloud
async function loadAllExpenses() {
  if (!CURRENT_CLIENT_ID) return;
  try {
    const q = db.collection("expenses")
                .where("clientId", "==", CURRENT_CLIENT_ID)
                .orderBy("date", "desc"); // Show newest first
                
    const snapshot = await q.get();
    
    // Map and cache the data
    localExpenses = snapshot.docs.map(doc => ({ 
      ...doc.data(), 
      docId: doc.id 
    }));
    
    console.log("Loaded Expenses:", localExpenses.length);
    renderExpenseTable();
    
  } catch (error) {
    console.error("Error loading expenses:", error);
    // If indexing error occurs (common in first run with orderBy), fallback to client-side sort
    if (error.code === 'failed-precondition') {
       console.warn("Index missing. Please create an index in Firebase Console for 'expenses' (clientId ASC, date DESC).");
    }
    toast("Error loading expenses: " + error.message, "error");
  }
}

// 2. Render the Table
function renderExpenseTable() {
  const tbody = qs('#expense-rows');
  if (!tbody) return;

  let total = 0;
  
  // Generate HTML
  tbody.innerHTML = localExpenses.map(item => {
    total += (+item.amount || 0);
    return `
      <tr>
        <td class="td">${fmtDate(item.date)}</td>
        <td class="td"><span class="badge bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">${item.category}</span></td>
        <td class="td">${item.note || '-'}</td>
        <td class="td text-right font-medium">₹${fmt(item.amount)}</td>
        <td class="td">
          <button class="text-red-600 hover:text-red-800 text-xs font-semibold" onclick="deleteExpense('${item.docId}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Update Total Footer
  const totalEl = qs('#exp-total');
  if (totalEl) totalEl.textContent = fmt(total);
}

// 3. Add New Expense
const btnAddExpense = qs('#btn-add-expense');
if (btnAddExpense) {
  btnAddExpense.onclick = async () => {
    const date = qs('#exp-date').value;
    const category = qs('#exp-category').value;
    const amount = qs('#exp-amount').value;
    const note = qs('#exp-note').value.trim();

    // Validation
    if (!date || !amount) {
      return toast("Please fill Date and Amount", "error");
    }

    const btn = qs('#btn-add-expense');
    btn.disabled = true;
    btn.textContent = "Saving...";

    const newExpense = {
      date,
      category,
      amount: parseFloat(amount),
      note,
      clientId: CURRENT_CLIENT_ID,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // Save to Firestore
      const docRef = await db.collection('expenses').add(newExpense);
      
      // Update Local Cache immediately (UI feels faster)
      localExpenses.unshift({ ...newExpense, docId: docRef.id });
      
      // Sort again by date (optional, keeps list organized)
      localExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

      renderExpenseTable();
      
      // Clear Inputs
      qs('#exp-amount').value = '';
      qs('#exp-note').value = '';
      qs('#exp-amount').focus(); // Ready for next entry
      
      toast("Expense added successfully", "success");

    } catch (error) {
      console.error("Error saving expense:", error);
      toast("Failed to save: " + error.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Add Entry";
    }
  };
}

// 4. Delete Expense
window.deleteExpense = async (docId) => {
  if (!confirm("Are you sure you want to delete this entry permanently?")) return;

  try {
    await db.collection('expenses').doc(docId).delete();
    
    // Remove from local cache
    localExpenses = localExpenses.filter(x => x.docId !== docId);
    renderExpenseTable();
    
    toast("Entry deleted", "success");
  } catch (error) {
    console.error("Error deleting:", error);
    toast("Delete failed: " + error.message, "error");
  }
};

// 5. Set Default Date on Load
const expDateInput = qs('#exp-date');
if (expDateInput) expDateInput.value = today();
/* =========================================
   MODULE 3: FLEET MANAGEMENT & ALERTS
   ========================================= */
// let localVehicles = []; // <-- MOVED TO TOP OF FILE
let editingFleetId = null;

// 1. Load Vehicles
async function loadAllVehicles() {
  if (!CURRENT_CLIENT_ID) return;
  try {
    const snapshot = await db.collection("vehicles").where("clientId", "==", CURRENT_CLIENT_ID).get();
    localVehicles = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    renderFleetTable();
    checkComplianceAlerts();
    updateDriverList(); // Update driver dropdown for Module 4
  } catch (e) { console.error("Fleet Load Error:", e); }
}

// 2. Helper: Calculate Expiry
function getExpiryStatus(dateStr) {
  if (!dateStr) return { cls: '', txt: '-' };
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { cls: 'bg-red-100 text-red-800 font-bold', txt: `${fmtDate(dateStr)} (Exp)` };
  if (diff <= 15) return { cls: 'bg-orange-100 text-orange-800 font-bold', txt: `${fmtDate(dateStr)} (${diff}d)` };
  return { cls: '', txt: fmtDate(dateStr) };
}

// 3. Render Fleet Table
function renderFleetTable() {
  const tbody = qs('#fleet-rows'); if (!tbody) return;
  const term = (qs('#fleet-search').value || '').toLowerCase();
  
  tbody.innerHTML = localVehicles.filter(v => v.number.toLowerCase().includes(term)).map(v => {
    const ins = getExpiryStatus(v.ins); const fit = getExpiryStatus(v.fit);
    const tax = getExpiryStatus(v.tax); const puc = getExpiryStatus(v.puc);
    const per = getExpiryStatus(v.permit);
    return `<tr>
      <td class="td font-bold">${v.number}</td>
      <td class="td text-xs">${v.driver || '-'}<br>${v.phone || ''}</td>
      <td class="td ${ins.cls}">${ins.txt}</td><td class="td ${fit.cls}">${fit.txt}</td>
      <td class="td ${tax.cls}">${tax.txt}</td><td class="td ${puc.cls}">${puc.txt}</td>
      <td class="td ${per.cls}">${per.txt}</td>
      <td class="td"><button class="text-blue-600" onclick="editFleet('${v.docId}')">Edit</button></td>
    </tr>`;
  }).join('');
}

// 4. Save/Update Vehicle
qs('#btn-save-fleet').onclick = async () => {
  const data = {
    number: qs('#fleet-no').value.trim().toUpperCase(),
    driver: qs('#fleet-driver').value.trim(),
    phone: qs('#fleet-phone').value.trim(),
    ins: qs('#fleet-ins').value, fit: qs('#fleet-fit').value,
    tax: qs('#fleet-tax').value, puc: qs('#fleet-puc').value, permit: qs('#fleet-permit').value,
    clientId: CURRENT_CLIENT_ID
  };
  if (!data.number) return toast("Vehicle No required", "error");

  try {
    if (editingFleetId) {
      await db.collection('vehicles').doc(editingFleetId).update(data);
      const i = localVehicles.findIndex(x => x.docId === editingFleetId);
      if (i > -1) localVehicles[i] = { ...data, docId: editingFleetId };
    } else {
      const ref = await db.collection('vehicles').add(data);
      localVehicles.push({ ...data, docId: ref.id });
    }
    toast("Fleet Saved", "success");
    qs('#btn-clear-fleet').onclick();
    loadAllVehicles(); // Refresh table & alerts
  } catch (e) { toast(e.message, "error"); }
};

window.editFleet = (id) => {
  const v = localVehicles.find(x => x.docId === id);
  if (!v) return;
  editingFleetId = id;
  qs('#fleet-no').value = v.number; qs('#fleet-driver').value = v.driver; qs('#fleet-phone').value = v.phone;
  qs('#fleet-ins').value = v.ins; qs('#fleet-fit').value = v.fit;
  qs('#fleet-tax').value = v.tax; qs('#fleet-puc').value = v.puc; qs('#fleet-permit').value = v.permit;
  qs('#btn-save-fleet').textContent = "Update";
};

qs('#btn-clear-fleet').onclick = () => {
  editingFleetId = null;
  qs('#btn-save-fleet').textContent = "Save Vehicle";
  qsa('#page-fleet input').forEach(i => i.value = '');
};
qs('#fleet-search').addEventListener('input', renderFleetTable);

// 5. Check Alerts
function checkComplianceAlerts() {
  let count = 0;
  const now = new Date();
  localVehicles.forEach(v => {
    [v.ins, v.fit, v.tax, v.puc, v.permit].forEach(d => {
      if (d && (new Date(d) - now) / (1e3*60*60*24) <= 7) count++;
    });
  });
  qs('#alert-count').textContent = count;
  qs('#dashboard-alerts').classList.toggle('hidden', count === 0);
}


/* =========================================
   MODULE 4: DRIVER ACCOUNT (LEDGER)
   ========================================= */
let localDriverTx = [];

// 1. Sync Drivers to Dropdown
function updateDriverList() {
  const list = qs('#drv-list');
  if (!list) return;
  // Extract unique drivers from Vehicles
  const drivers = [...new Set(localVehicles.map(v => v.driver).filter(Boolean))];
  list.innerHTML = drivers.map(d => `<option value="${d}">`).join('');
}

// 2. Load Ledger for Selected Driver
qs('#btn-load-ledger').onclick = async () => {
  const name = qs('#drv-select-input').value.trim();
  if (!name) return toast("Select a driver first", "error");
  
  qs('#btn-load-ledger').textContent = "...";
  try {
    // Fetch transactions for this driver
    const q = db.collection('driver_ledger')
      .where('clientId', '==', CURRENT_CLIENT_ID)
      .where('driver', '==', name)
      .orderBy('date', 'asc'); // Oldest first for ledger
      
    const snap = await q.get();
    localDriverTx = snap.docs.map(d => ({...d.data(), docId: d.id}));
    
    renderDriverLedger(name);
  } catch (e) { 
    console.error(e); 
    // If index error, handle gracefully
    if(e.code === 'failed-precondition') toast("System indexing... Try again in 2 mins", "error");
  } finally {
    qs('#btn-load-ledger').textContent = "GO";
  }
};

function renderDriverLedger(driverName) {
  const tbody = qs('#drv-ledger-rows');
  let bal = 0;
  
  tbody.innerHTML = localDriverTx.map(tx => {
    const debit = tx.type === 'Debit' ? (tx.amount || 0) : 0;
    const credit = tx.type === 'Credit' ? (tx.amount || 0) : 0;
    bal = bal - debit + credit; // Debit reduces balance (company money gone), Credit increases (driver earned)
    
    // Wait... usually:
    // Debit = Driver took money (Advance). Driver Owes Company (+).
    // Credit = Driver did work (Salary). Company Owes Driver (-).
    // Let's standardize: Balance > 0 means Driver Owes Company.
    
    return `<tr>
      <td class="td">${fmtDate(tx.date)}</td>
      <td class="td">${tx.remark || '-'}</td>
      <td class="td text-right text-red-600 font-medium">${debit ? '₹'+fmt(debit) : '-'}</td>
      <td class="td text-right text-green-600 font-medium">${credit ? '₹'+fmt(credit) : '-'}</td>
      <td class="td text-right"><button class="text-red-500 text-xs" onclick="delDrvTx('${tx.docId}')">✖</button></td>
    </tr>`;
  }).join('');

  // Calculate Final Balance Logic
  // Total Debits (Advances) vs Total Credits (Work Done)
  const totalDebit = localDriverTx.filter(t=>t.type==='Debit').reduce((s,t)=>s+(+t.amount||0),0);
  const totalCredit = localDriverTx.filter(t=>t.type==='Credit').reduce((s,t)=>s+(+t.amount||0),0);
  const net = totalDebit - totalCredit;
  
  const disp = qs('#drv-balance-display');
  const status = qs('#drv-balance-status');
  
  if (net > 0) {
    disp.textContent = `₹${fmt(net)}`;
    disp.className = "text-2xl font-bold text-red-600";
    status.textContent = `${driverName} needs to pay Company (Advance Pending)`;
  } else if (net < 0) {
    disp.textContent = `₹${fmt(Math.abs(net))}`;
    disp.className = "text-2xl font-bold text-green-600";
    status.textContent = `Company needs to pay ${driverName} (Salary/Trip Due)`;
  } else {
    disp.textContent = "₹0";
    disp.className = "text-2xl font-bold text-gray-600";
    status.textContent = "Account Settled";
  }
}

// 3. Add Transaction
qs('#btn-save-tx').onclick = async () => {
  const driver = qs('#drv-select-input').value.trim();
  if (!driver) return toast("Select driver first", "error");
  
  const data = {
    driver,
    clientId: CURRENT_CLIENT_ID,
    date: qs('#drv-tx-date').value || today(),
    type: qs('#drv-tx-type').value,
    amount: +qs('#drv-tx-amount').value,
    remark: qs('#drv-tx-remark').value.trim()
  };
  
  if (!data.amount) return toast("Enter Amount", "error");

  try {
    await db.collection('driver_ledger').add(data);
    toast("Entry Added", "success");
    qs('#drv-tx-amount').value = '';
    qs('#drv-tx-remark').value = '';
    qs('#btn-load-ledger').click(); // Reload ledger
  } catch(e) { toast(e.message, "error"); }
};

window.delDrvTx = async (id) => {
  if(!confirm("Delete this entry?")) return;
  await db.collection('driver_ledger').doc(id).delete();
  qs('#btn-load-ledger').click(); // Reload
};
}); // End of DOMContentLoaded
