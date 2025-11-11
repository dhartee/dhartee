let CURRENT_CLIENT_ID = null; // लॉग इन क्लाइंट का ID स्टोर करता है
let localConsignors = []; // Consignors को यहाँ कैश करें
let localConsignees = []; // Consignees को यहाँ कैश करें
let localLrs = []; // LRs को यहाँ कैश करें
let localInvoices = []; // Invoices को यहाँ कैश करें

let currentlyEditingCgorId = null;
let currentlyEditingCgeeId = null;

/* ---------- Utils ---------- */
// localStorage utils (load, save, loadObj, saveObj, DB) अब हटा दिए गए हैं
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];
const fmt = n => (isNaN(+n) ? 0 : +n).toFixed(2);
const today = () => new Date().toISOString().slice(0, 10);
const uid = (p = 'ID') => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

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
  settings: qs('#page-settings')
};

function setNav(name) {
  Object.entries(contentPages).forEach(([k, sec]) => {
    sec.classList.toggle('hidden', k !== name);
  });
  qsa('.nav-btn').forEach(b => b.classList.remove('active'));
  qsa(`[data-nav="${name}"]`).forEach(b => b.classList.add('active'));
}
// --- नेविगेशन और मोबाइल ड्रॉवर के लिए इवेंट लिस्नर ---
// (यह कोड ब्लॉक छूट गया था)

qsa('.nav-btn').forEach(btn => btn.addEventListener('click', e => {
  setNav(btn.getAttribute('data-nav'));
  // '?' यह सुनिश्चित करता है कि qs('#mobile-drawer') null होने पर एरर न आए
  qs('#mobile-drawer')?.classList.add('hidden'); 
}));

qs('#btn-open-drawer').addEventListener('click', () => {
  qs('#mobile-drawer')?.classList.remove('hidden');
});

qsa('#mobile-drawer [data-close]').forEach(el => el.addEventListener('click', () => {
  qs('#mobile-drawer')?.classList.add('hidden');
}));

// --- (बाकी का कोड यहाँ से जारी रहेगा) ---
function enterApp(user) {
  if (!user) return;
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  currentUser.textContent = `User: ${user.email}`; 
  setNav('dashboard');
  
  // Firestore फ़ंक्शंस को कॉल करें
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

      // 3. --- सबसे महत्वपूर्ण सुरक्षा जाँच ---
      // क्या उपयोगकर्ता का clientId URL के clientId से मेल खाता है?
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
    // उपयोगकर्ता लॉग आउट है
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

// --- नया: सभी डेटा को एक साथ लोड करता है ---
async function loadAllClientData() {
  if (!CURRENT_CLIENT_ID) return;
  console.log("Loading all client data...");
  
  // मास्टर्स और ट्रांजैक्शन्स को एक साथ ( समानांतर में) लोड करें
  await Promise.all([
    loadAllMasters(),
    loadAllTransactions()
  ]);
  
  // सब कुछ लोड होने के बाद UI को रिफ्रेश करें
  console.log("All data loaded. Refreshing UI.");
  renderLRReport();
  renderInvoiceReport();
  buildInvoiceLRList();
  refreshKPIs();
}

// --- नया: Masters लोड करता है ---
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

// --- नया: LRs और Invoices लोड करता है ---
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
// (यह पिछले चरण से अपरिवर्तित है)
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
      const docRef = db.collection('consignees').doc(currentlyEditingCgeeId);
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
function updateGoodsTotal() {
  let t = 0; 
  qsa('#goods-rows tr').forEach(tr => { t += +tr.children[3].textContent || 0; });
  qs('#goods-total').textContent = fmt(t);
}

/* ---------- Lorry Receipt (LR) Section (Firestore) ---------- */

// --- नया: Firestore LR Counter ---
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
        // यह क्लाइंट का पहला LR है, एक नया काउंटर बनाएँ
        seqMap = { [y]: 1 };
        next = 1;
      } else {
        // मौजूदा काउंटर से बढ़ाएँ
        seqMap = doc.data().sequences || {};
        next = (seqMap[y] || 0) + 1;
        seqMap[y] = next;
      }
      
      // काउंटर दस्तावेज़ को वापस सहेजें
      transaction.set(counterRef, { sequences: seqMap });
      
      // LR नंबर फॉर्मेट करें
      const nextNum = String(next).padStart(4, '0');
      nextStr = `LR-${y}-${nextNum}`;
    });
    
    return nextStr;

  } catch (e) {
    console.error("LR Counter Transaction failed: ", e);
    toast("Error generating LR number. Please try again.", "error");
    return null; // एक त्रुटि का संकेत दें
  }
}

// --- संशोधित: 'async' और nextLRNumber() के लिए 'await' का उपयोग करता है ---
async function collectLR() {
  let number = qs('#lr-number').value.trim();
  if (!number) {
    // नया async LR नंबर जनरेटर
    number = await nextLRNumber(); 
    if (!number) return null; // यदि LR नंबर जनरेट करने में त्रुटि हुई
    qs('#lr-number').value = number;
  }

  return {
    // id को अब Firestore द्वारा संभाला जाता है, id: uid('LR') हटा दिया गया है
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
    totals: { amount: +qs('#goods-total').textContent || 0 },
    insurance: {
      company: qs('#ins-company').value.trim(), policy: qs('#ins-policy').value.trim(),
      amount: qs('#ins-amount').value.trim(), date: qs('#ins-date').value
    },
    isTBB: qs('#goods-tbb').checked,
    gstBy: qs('#lr-gst-by').value,
    bank: { name: qs('#bank-name').value.trim(), ac: qs('#bank-ac').value.trim(), ifsc: qs('#bank-ifsc').value.trim() },
    terms: qs('#lr-terms').value.trim(),
    clientId: CURRENT_CLIENT_ID // --- सबसे महत्वपूर्ण: clientId जोड़ें ---
  };
}

// यह फ़ंक्शन अपरिवर्तित है
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
  updateGoodsTotal();
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

function defaultTerms() {
  return `1. The Consignment Note is subject to conditions printed overleaf.
2. We are not responsible for leakage and breakage.
3. Shortage allowed 1%.`;
}

// --- संशोधित: Firestore में LR सहेजता/अपडेट करता है ---
qs('#lr-save').onclick = async () => {
  const lr = await collectLR(); // 'await' क्योंकि collectLR() अब async है
  if (!lr) return; // LR नंबर जनरेशन में त्रुटि

  const idx = localLrs.findIndex(x => x.number === lr.number);

  try {
    if (idx > -1) {
      // --- यह एक अपडेट है ---
      const docId = localLrs[idx].docId;
      await db.collection('lrs').doc(docId).update(lr);
      localLrs[idx] = { ...lr, docId: docId }; // लोकल कैश अपडेट करें
      toast('LR updated in cloud', 'success');
    } else {
      // --- यह एक नया LR है ---
      const docRef = await db.collection('lrs').add(lr);
      localLrs.push({ ...lr, docId: docRef.id }); // लोकल कैश अपडेट करें
      toast('LR saved to cloud', 'success');
    }
    
    qs('#lr-number').value = lr.number;
    
    // UI को रीफ्रेश करें
    refreshKPIs();
    buildInvoiceLRList();
    renderLRReport();
    buildLRPrint(lr);
    
  } catch (error) {
    console.error("Error saving LR:", error);
    toast("LR Save Failed: " + error.message, "error");
  }
};

// --- संशोधित: Firestore से LR खोजता है ---
qs('#lr-edit').onclick = async () => {
  const n = prompt('Enter LR No to edit:');
  if (!n) return;
  
  // Firestore में खोजें
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
// --- संशोधित: कंपनी डेटा को सेटिंग्स फ़ॉर्म से पढ़ता है ---
function buildLRPrint(lr) {
  // यह सुनिश्चित करता है कि यह हमेशा Firestore से लोड किए गए नवीनतम कंपनी डेटा का उपयोग करता है
  const c = {
      name: qs('#cmp-name').value,
      address: qs('#cmp-address').value,
      gst: qs('#cmp-gst').value,
      pan: qs('#cmp-pan').value,
      contact: qs('#cmp-contact').value,
      email: qs('#cmp-email').value
  };
  
  const el = qs('#lr-print-area');
  // (बाकी का HTML अपरिवर्तित है)
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
      <div class="lr-col lr-col-3"><span class="lbl">Date:</span> ${lr.date}</div>
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
        <tr>
          <th class="text-left">DESCRIPTION / NATURE OF GOODS</th>
          <th>CHARGED WT</th>
          <th>FREIGHT/UNIT</th>
          <th>AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${(lr.goods || []).map(g => `
          <tr>
            <td class="text-left" style="vertical-align: top;">
              <b>${g.desc}</b>
              ${g.details ? `<br><span style="font-size: 9pt; white-space: pre-wrap; color: #333;">${g.details}</span>` : ''}
            </td>
            <td>${fmt(g.weight)}</td>
            <td>${lr.isTBB ? 'To Be Billed' : fmt(g.freight)}</td>
            <td>${lr.isTBB ? 'To Be Billed' : fmt(g.amount)}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td class="text-right" colspan="3"><b>FREIGHT</b></td>
          <td><b>${lr.isTBB ? 'To Be Billed' : fmt(lr.totals.amount)}</b></td>
        </tr>
      </tfoot>
    </table>
    <div class="lr-row mt-8">
      <div class="lr-col lr-col-6 lr-box">
        <div class="box-title">INSURANCE</div>
        <div class="box-line"><span class="lbl">Company:</span> ${lr.insurance.company || 'N/A'}</div>
        <div class="box-line"><span class="lbl">Policy No:</span> ${lr.insurance.policy || 'N/A'}</div>
        <div class="box-line"><span class="lbl">Amount:</span> ${lr.insurance.amount || 'N/A'}</div>
        <div class="box-line"><span class="lbl">Policy Date:</span> ${lr.insurance.date || 'N/A'}</div>
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
  // बाकी का buildInvoicePrint() भी कॉल किया जाएगा, जो ठीक है
}

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
  // (बाकी का HTML अपरिवर्तित है)
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
      <div><b>Date:</b> ${inv.date}</div>
      <div><b>Due:</b> ${inv.due}</div>
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

// --- संशोधित: Firestore में Invoice सहेजता/अपडेट करता है ---
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
    clientId: CURRENT_CLIENT_ID // --- clientId जोड़ें ---
  };

  const idx = localInvoices.findIndex(x => x.number === inv.number);

  try {
    if (idx > -1) {
      // --- यह एक अपडेट है ---
      const docId = localInvoices[idx].docId;
      await db.collection('invoices').doc(docId).update(inv);
      localInvoices[idx] = { ...inv, docId: docId }; // लोकल कैश अपडेट करें
      toast('Invoice updated in cloud', 'success');
    } else {
      // --- यह एक नया Invoice है ---
      const docRef = await db.collection('invoices').add(inv);
      localInvoices.push({ ...inv, docId: docRef.id }); // लोकल कैश अपडेट करें
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

// --- संशोधित: Firestore से Invoice खोजता है ---
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

// यह फ़ंक्शन अपरिवर्तित है
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

// --- संशोधित: लोकल कैश `localLrs` से LR सूची बनाता है ---
function buildInvoiceLRList() {
  const sel = qs('#inv-lr-link');
  const items = localLrs; // localStorage के बजाय लोकल कैश का उपयोग करें
  sel.innerHTML = `<option value="">Select LR</option>` + items.map(x => `<option>${x.number}</option>`).join('');
  sel.onchange = () => {
    const lr = items.find(i => i.number === sel.value);
    if (lr) { 
      buildInvoiceFromLR(lr);
      // LR से डेटा मिलने के बाद इनवॉइस प्रिंट को तुरंत री-बिल्ड करें
      recalcInvoiceTotal(); // सुनिश्चित करें कि टोटल सही है
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

// --- संशोधित: लोकल कैश `localLrs` से रिपोर्ट बनाता है ---
function renderLRReport() {
  const t = qs('#r-lr-table');
  if (!t) return;
  const q = (qs('#r-lr-search').value || '').toLowerCase();
  const from = qs('#r-lr-from').value; const to = qs('#r-lr-to').value;
  
  const items = localLrs.filter(x => { // localStorage के बजाय
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

// --- संशोधित: लोकल कैश `localInvoices` से रिपोर्ट बनाता है ---
function renderInvoiceReport() {
  const t = qs('#r-inv-table');
  if (!t) return;
  const q = (qs('#r-inv-search').value || '').toLowerCase();
  const from = qs('#r-inv-from').value; const to = qs('#r-inv-to').value;
  
  const items = localInvoices.filter(x => { // localStorage के बजाय
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

// यह फ़ंक्शंस अब लोकल कैश पर फ़िल्टर लागू करेंगे
['#r-lr-search', '#r-lr-from', '#r-lr-to'].forEach(sel => qs(sel)?.addEventListener('input', renderLRReport));
['#r-inv-search', '#r-inv-from', '#r-inv-to'].forEach(sel => qs(sel)?.addEventListener('input', renderInvoiceReport));

/* ---------- Settings / Company (Firestore) ---------- */
// (यह पिछले चरण से अपरिवर्तित है)
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
    qs('#cmp-name').value = c.name || ''; qs('#cmp-email').value = c.email || '';
    qs('#cmp-contact').value = c.contact || ''; qs('#cmp-pan').value = c.pan || '';
    qs('#cmp-gst').value = c.gst || ''; qs('#cmp-bank').value = c.bank || '';
    qs('#cmp-ac').value = c.ac || ''; qs('#cmp-ifsc').value = c.ifsc || '';
    qs('#cmp-address').value = c.address || '';
    qs('#bank-name').value = c.bank || ''; qs('#bank-ac').value = c.ac || ''; qs('#bank-ifsc').value = c.ifsc || '';
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
// (यह अपरिवर्तित है)
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
  const canvas = await html2canvas(targetEl, { scale: 2, useCORS: true });
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

// --- संशोधित: लोकल कैश `localLrs` और `localInvoices` से KPI पढ़ता है ---
function refreshKPIs() {
  qs('#kpi-receipts').textContent = localLrs.length;
  qs('#kpi-invoices').textContent = localInvoices.length;
  const parties = new Set([...localConsignors, ...localConsignees].map(x => x.gst));
  qs('#kpi-parties').textContent = parties.size;
  const stations = new Set([...localConsignors.map(x => x.station), ...localConsignees.map(x => x.station)].filter(Boolean));
  qs('#kpi-stations').textContent = stations.size;
}

/* ---------- Initialize some defaults ---------- */
(function init() {
  qs('#lr-date').value = today();
  qs('#inv-date').value = today();
  qs('#inv-due').value = today();
  qs('#lr-terms').value = defaultTerms();

  // ये फ़ंक्शंस अब डेटा लोड होने के बाद `loadAllClientData` द्वारा कॉल किए जाते हैं
  // if (qs('#r-lr-table')) renderLRReport();
  // if (qs('#r-inv-table')) renderInvoiceReport();

})();
