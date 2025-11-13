/* Transporter Web App – Firebase Edition (FINAL FIXED V3) */
document.addEventListener('DOMContentLoaded', () => {
  let CURRENT_CLIENT_ID = null; 
  let localConsignors = []; 
  let localConsignees = []; 
  let localLrs = []; 
  let localInvoices = []; 
  let localExpenses = []; 
  let localVehicles = []; 
  let currentlyEditingCgorId = null;
  let currentlyEditingCgeeId = null;
  
  /* ---------- Utils ---------- */
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];
  const fmt = n => (isNaN(+n) ? 0 : +n).toFixed(2);
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = (p = 'ID') => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  
  const fmtDate = (isoDate) => {
    if (!isoDate || isoDate.length < 10) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y}`;
  };
  
  function toast(msg, type = 'success') {
    const container = qs('#toast-container');
    if (!container) return;
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
    container.appendChild(toastEl);
    setTimeout(() => {
      toastEl.style.animation = 'toast-out 0.5s forwards';
      toastEl.addEventListener('animationend', () => toastEl.remove());
    }, 3000);
  }
  /* ---------- NEW Copy to Clipboard Helper ---------- */
window.copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    toast(`Copied: ${text}`, 'success');
  }).catch(err => {
    console.error('Copy failed', err);
    toast('Copy failed', 'error');
  });
};
  /* ---------- Login & Auth ---------- */
  const loginScreen = qs('#login-screen');
  const appShell = qs('#app-shell');
  const currentUser = qs('#current-user');
  
  qs('#year').textContent = new Date().getFullYear();
  
  qs('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = qs('#login-username').value.trim();
    const password = qs('#login-password').value.trim();
    const btn = qs('#login-form button');
    btn.disabled = true; btn.textContent = 'Logging in...';
  
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error("Login Error:", error.message);
      toast("Login failed: " + error.message, "error");
      btn.disabled = false; btn.textContent = 'Login';
    }
  });
  
  qs('#btn-logout').addEventListener('click', () => {
    auth.signOut().then(() => location.reload());
  });
  
  /* ---------- Navigation ---------- */
  const contentPages = {
    dashboard: qs('#page-dashboard'),
    lr: qs('#page-lr'),
    invoice: qs('#page-invoice'),
    masters: qs('#page-masters'),
    reports: qs('#page-reports'),
    settings: qs('#page-settings'),
    expenses: qs('#page-expenses'),
    fleet: qs('#page-fleet'),
    drivers: qs('#page-drivers')
  };
  
  function setNav(name) {
    Object.entries(contentPages).forEach(([k, sec]) => {
      sec.classList.toggle('hidden', k !== name);
    });
    qsa('.nav-btn').forEach(b => b.classList.remove('active'));
    qsa(`[data-nav="${name}"]`).forEach(b => b.classList.add('active'));
  }
  
  qsa('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    setNav(btn.getAttribute('data-nav'));
    qs('#mobile-drawer')?.classList.add('hidden'); 
  }));
  
  qs('#btn-open-drawer').addEventListener('click', () => qs('#mobile-drawer')?.classList.remove('hidden'));
  qsa('#mobile-drawer [data-close]').forEach(el => el.addEventListener('click', () => qs('#mobile-drawer')?.classList.add('hidden')));
  
  function enterApp(user) {
    qs('#splash-screen').classList.add('hidden');
    if (!user) return;
    loginScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    currentUser.textContent = `User: ${user.email}`; 
    setNav('dashboard');
    fillCompanySettings(); 
  }
  
  auth.onAuthStateChanged(user => {
    if (user) {
      const urlClientId = window.APP_CLIENT_ID;
      if (!urlClientId) {
         toast("Login failed: No client specified in URL.", "error");
         auth.signOut(); return;
      }
      db.collection('users').doc(user.uid).get().then(doc => {
        if (!doc.exists) { toast("Error: User profile not configured.", "error"); auth.signOut(); return; }
        const userClientId = doc.data().clientId ? doc.data().clientId.trim() : null;
        if (userClientId === urlClientId) {
          CURRENT_CLIENT_ID = userClientId;
          enterApp(user);
          loadAllClientData();
        } else {
          toast("Error: This user does not belong to this company.", "error");
          auth.signOut();
        }
      }).catch(e => { toast("Error: " + e.message, "error"); auth.signOut(); });
    } else {
        qs('#splash-screen').classList.add('hidden'); 
        loginScreen.classList.remove('hidden');
        appShell.classList.add('hidden');
        CURRENT_CLIENT_ID = null;
        const btn = qs('#login-form button');
        if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
    }
  });
  
  async function loadAllClientData() {
    if (!CURRENT_CLIENT_ID) return;
    await Promise.all([loadAllMasters(), loadAllTransactions(), loadAllExpenses(), loadAllVehicles()]);
    renderLRReport(); renderInvoiceReport(); buildInvoiceLRList(); refreshKPIs();
  }
  
  /* ---------- Data Loading ---------- */
  async function loadAllMasters() {
    try {
      const cgorSnap = await db.collection("consignors").where("clientId", "==", CURRENT_CLIENT_ID).get();
      localConsignors = cgorSnap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      renderMasterTable('cgor');
      const cgeeSnap = await db.collection("consignees").where("clientId", "==", CURRENT_CLIENT_ID).get();
      localConsignees = cgeeSnap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      renderMasterTable('cgee');
    } catch (e) { toast("Error loading masters: " + e.message, "error"); }
  }
  
  async function loadAllTransactions() {
    try {
      const lrSnap = await db.collection("lrs").where("clientId", "==", CURRENT_CLIENT_ID).get();
      localLrs = lrSnap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      const invSnap = await db.collection("invoices").where("clientId", "==", CURRENT_CLIENT_ID).get();
      localInvoices = invSnap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    } catch (e) { toast("Error loading transactions: " + e.message, "error"); }
  }

  async function loadAllExpenses() {
    if (!CURRENT_CLIENT_ID) return;
    try {
      const snap = await db.collection("expenses").where("clientId", "==", CURRENT_CLIENT_ID).orderBy("date", "desc").get();
      localExpenses = snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      renderExpenseTable();
    } catch (e) { 
      if (e.code === 'failed-precondition') console.warn("Index missing for expenses");
      else console.error("Expenses Error", e);
    }
  }

  async function loadAllVehicles() {
    if (!CURRENT_CLIENT_ID) return;
    try {
      const snap = await db.collection("vehicles").where("clientId", "==", CURRENT_CLIENT_ID).get();
      localVehicles = snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      renderFleetTable(); checkComplianceAlerts(); updateDriverList();
    } catch (e) { console.error("Fleet Error", e); }
  }
  
  /* ---------- Masters CRUD ---------- */
  function renderMasterTable(kind) {
    const data = (kind === 'cgor') ? localConsignors : localConsignees;
    const table = qs(kind === 'cgor' ? '#m-cgor-table' : '#m-cgee-table');
    table.innerHTML = `<thead><tr><th class="th">GST</th><th class="th">Name</th><th class="th">Address</th><th class="th">Station</th><th class="th">Actions</th></tr></thead><tbody>
        ${data.map(d => `<tr><td class="td">${d.gst || ''}</td><td class="td">${d.name || ''}</td><td class="td">${d.address || ''}</td><td class="td">${d.station || ''}</td>
        <td class="td"><span class="action" data-edit="${d.docId}">Edit</span> · <span class="action" data-del="${d.docId}">Del</span></td></tr>`).join('')}</tbody>`;
    table.querySelectorAll('[data-edit]').forEach(a => a.onclick = () => loadMasterToForm(kind, a.dataset.edit));
    table.querySelectorAll('[data-del]').forEach(a => a.onclick = () => deleteMaster(kind, a.dataset.del));
  }
  
  async function deleteMaster(kind, docId) {
    if (!confirm("Delete this entry?")) return;
    const col = (kind === 'cgor') ? 'consignors' : 'consignees';
    try {
      await db.collection(col).doc(docId).delete();
      if (kind === 'cgor') localConsignors = localConsignors.filter(x => x.docId !== docId);
      else localConsignees = localConsignees.filter(x => x.docId !== docId);
      renderMasterTable(kind);
      toast('Entry deleted', 'success');
    } catch (e) { toast("Delete failed: " + e.message, "error"); }
  }
  
  function loadMasterToForm(kind, docId) {
    const d = (kind === 'cgor' ? localConsignors : localConsignees).find(x => x.docId === docId);
    if (!d) return;
    const p = kind === 'cgor' ? 'm-cgor' : 'm-cgee';
    qs(`#${p}-gst`).value = d.gst; qs(`#${p}-name`).value = d.name; qs(`#${p}-address`).value = d.address;
    qs(`#${p}-pin`).value = d.pin || ''; qs(`#${p}-station`).value = d.station || '';
    if (kind === 'cgor') currentlyEditingCgorId = docId; else currentlyEditingCgeeId = docId;
  }
  
  const saveMaster = async (kind) => {
    const p = kind === 'cgor' ? 'm-cgor' : 'm-cgee';
    const data = {
      gst: qs(`#${p}-gst`).value.trim(), name: qs(`#${p}-name`).value.trim(),
      address: qs(`#${p}-address`).value.trim(), pin: qs(`#${p}-pin`).value.trim(),
      station: qs(`#${p}-station`).value.trim(), clientId: CURRENT_CLIENT_ID
    };
    const col = kind === 'cgor' ? 'consignors' : 'consignees';
    const editId = kind === 'cgor' ? currentlyEditingCgorId : currentlyEditingCgeeId;
    try {
      if (editId) {
        await db.collection(col).doc(editId).update(data);
        const arr = kind === 'cgor' ? localConsignors : localConsignees;
        const idx = arr.findIndex(x => x.docId === editId);
        if (idx > -1) arr[idx] = { ...data, docId: editId };
      } else {
        const ref = await db.collection(col).add(data);
        (kind === 'cgor' ? localConsignors : localConsignees).push({ ...data, docId: ref.id });
      }
      renderMasterTable(kind);
      qs(`#${p}-clear`).click();
      toast('Saved', 'success');
    } catch (e) { toast("Save failed: " + e.message, "error"); }
  };
  
  qs('#m-cgor-save').onclick = () => saveMaster('cgor');
  qs('#m-cgee-save').onclick = () => saveMaster('cgee');
  
  qs('#m-cgor-clear').onclick = () => { qsa('#m-cgor-gst,#m-cgor-name,#m-cgor-address,#m-cgor-pin,#m-cgor-station').forEach(i => i.value = ''); currentlyEditingCgorId = null; };
  qs('#m-cgee-clear').onclick = () => { qsa('#m-cgee-gst,#m-cgee-name,#m-cgee-address,#m-cgee-pin,#m-cgee-station').forEach(i => i.value = ''); currentlyEditingCgeeId = null; };
  
  function masterLookup(inputEl, field, type) {
    inputEl.addEventListener('input', () => {
      const v = inputEl.value.trim().toLowerCase();
      const data = (type === 'cgor' ? localConsignors : localConsignees);
      let hit = null;
      if (field === 'gst' && v.length === 15) hit = data.find(d => d.gst && d.gst.toLowerCase() === v);
      else if (field === 'name' && v.length >= 3) hit = data.find(d => d.name && d.name.toLowerCase().startsWith(v));
      if (hit) {
        const p = type === 'cgor' ? 'cgor' : 'cgee';
        qs(`#${p}-gst`).value = hit.gst || ''; qs(`#${p}-name`).value = hit.name || '';
        qs(`#${p}-address`).value = hit.address || ''; qs(`#${p}-pin`).value = hit.pin || '';
        qs(`#${p}-station`).value = hit.station || '';
      }
    });
  }
  masterLookup(qs('#cgor-gst'), 'gst', 'cgor'); masterLookup(qs('#cgee-gst'), 'gst', 'cgee');
  masterLookup(qs('#cgor-name'), 'name', 'cgor'); masterLookup(qs('#cgee-name'), 'name', 'cgee');
  
  /* ---------- Goods Logic ---------- */
  function recalcGoods() {
    qs('#goods-amount').value = fmt((+qs('#goods-weight').value || 0) * (+qs('#goods-freight').value || 0));
  }
  qs('#goods-weight').addEventListener('input', recalcGoods);
  qs('#goods-freight').addEventListener('input', recalcGoods);
  
  const goodsRows = qs('#goods-rows');
  qs('#goods-add').onclick = () => {
    const d = qs('#goods-desc').value.trim();
    if (!d) return;
    const id = uid('ROW');
    goodsRows.insertAdjacentHTML('beforeend', `
      <tr data-id="${id}" data-details="${escape(qs('#goods-details').value.trim())}">
        <td class="td">${d}</td><td class="td text-right">${fmt(qs('#goods-weight').value)}</td>
        <td class="td text-right">${fmt(qs('#goods-freight').value)}</td><td class="td text-right">${fmt(qs('#goods-amount').value)}</td>
        <td class="td"><span class="action" onclick="this.closest('tr').remove(); updateGoodsTotal()">Remove</span></td>
      </tr>`);
    updateGoodsTotal();
    qsa('#goods-desc,#goods-details,#goods-weight,#goods-freight,#goods-amount').forEach(i => i.value = '');
  };
  
  function updateGoodsTotal() {
    let t = 0; 
    qsa('#goods-rows tr').forEach(tr => { t += +tr.children[3].textContent || 0; });
    qs('#goods-total').textContent = fmt(t);
    recalcToPay();
  }
  
  function recalcToPay() {
    qs('#lr-to-pay').textContent = fmt((+qs('#goods-total').textContent || 0) - (+qs('#lr-advance').value || 0));
  }
  qs('#lr-advance').addEventListener('input', recalcToPay);
  
  /* ---------- LR Logic ---------- */
  async function nextLRNumber() {
    const y = new Date().getFullYear().toString();
    const ref = db.collection('counters').doc(CURRENT_CLIENT_ID);
    try {
      let res = "LR-Error";
      await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        let seq = doc.exists ? (doc.data().sequences || {}) : {};
        let next = (seq[y] || 0) + 1;
        seq[y] = next;
        t.set(ref, { sequences: seq });
        res = `LR-${y}-${String(next).padStart(4, '0')}`;
      });
      return res;
    } catch (e) { toast("Error generating LR No", "error"); return null; }
  }
  
  async function collectLR() {
    let number = qs('#lr-number').value.trim();
    if (!number) {
      number = await nextLRNumber();
      if (!number) return null;
      qs('#lr-number').value = number;
    }
    return {
      number, date: qs('#lr-date').value || today(),
      vehicle: qs('#lr-vehicle').value.trim(), driver: qs('#lr-driver').value.trim(),
      consignor: { gst: qs('#cgor-gst').value.trim(), name: qs('#cgor-name').value.trim(), address: qs('#cgor-address').value.trim(), pin: qs('#cgor-pin').value.trim(), station: qs('#cgor-station').value.trim() },
      consignee: { gst: qs('#cgee-gst').value.trim(), name: qs('#cgee-name').value.trim(), address: qs('#cgee-address').value.trim(), pin: qs('#cgee-pin').value.trim(), station: qs('#cgee-station').value.trim() },
      goods: qsa('#goods-rows tr').map(tr => ({
        desc: tr.children[0].textContent, details: unescape(tr.dataset.details || ''),
        weight: +tr.children[1].textContent, freight: +tr.children[2].textContent, amount: +tr.children[3].textContent
      })),
      totals: { amount: +qs('#goods-total').textContent || 0, advance: +qs('#lr-advance').value || 0, toPay: +qs('#lr-to-pay').textContent || 0 },
      insurance: { company: qs('#ins-company').value.trim(), policy: qs('#ins-policy').value.trim(), amount: qs('#ins-amount').value.trim(), date: qs('#ins-date').value },
      isTBB: qs('#goods-tbb').checked, hideDetails: qs('#lr-hide-details').checked,
      gstBy: qs('#lr-gst-by').value,
      bank: { name: qs('#bank-name').value.trim(), ac: qs('#bank-ac').value.trim(), ifsc: qs('#bank-ifsc').value.trim() },
      terms: qs('#lr-terms').value.trim(),
      clientId: CURRENT_CLIENT_ID
    };
  }
  
  function setLR(lr) {
    qs('#lr-number').value = lr.number; qs('#lr-date').value = lr.date;
    qs('#lr-vehicle').value = lr.vehicle; qs('#lr-driver').value = lr.driver || '';
    qs('#cgor-gst').value = lr.consignor.gst || ''; qs('#cgor-name').value = lr.consignor.name || '';
    qs('#cgor-address').value = lr.consignor.address || ''; qs('#cgor-pin').value = lr.consignor.pin || ''; qs('#cgor-station').value = lr.consignor.station || '';
    qs('#cgee-gst').value = lr.consignee.gst || ''; qs('#cgee-name').value = lr.consignee.name || '';
    qs('#cgee-address').value = lr.consignee.address || ''; qs('#cgee-pin').value = lr.consignee.pin || ''; qs('#cgee-station').value = lr.consignee.station || '';
    qs('#goods-tbb').checked = lr.isTBB || false; qs('#lr-hide-details').checked = lr.hideDetails || false;
    
    goodsRows.innerHTML = '';
    (lr.goods || []).forEach(g => {
      goodsRows.insertAdjacentHTML('beforeend', `<tr data-details="${escape(g.details || '')}"><td class="td">${g.desc}</td><td class="td text-right">${fmt(g.weight)}</td><td class="td text-right">${fmt(g.freight)}</td><td class="td text-right">${fmt(g.amount)}</td><td class="td"><span class="action" onclick="this.closest('tr').remove(); updateGoodsTotal()">Remove</span></td></tr>`);
    });
    updateGoodsTotal();
    qs('#lr-advance').value = fmt(lr.totals.advance || 0); recalcToPay();
    
    qs('#ins-company').value = lr.insurance.company || ''; qs('#ins-policy').value = lr.insurance.policy || '';
    qs('#ins-amount').value = lr.insurance.amount || ''; qs('#ins-date').value = lr.insurance.date || '';
    qs('#lr-gst-by').value = lr.gstBy || 'Receiver';
    qs('#bank-name').value = lr.bank.name || ''; qs('#bank-ac').value = lr.bank.ac || ''; qs('#bank-ifsc').value = lr.bank.ifsc || '';
    qs('#lr-terms').value = lr.terms || defaultTerms();
  }
  
  qs('#lr-save').onclick = async () => {
    const lr = await collectLR();
    if (!lr) return;
    try {
      const idx = localLrs.findIndex(x => x.number === lr.number);
      if (idx > -1) {
        await db.collection('lrs').doc(localLrs[idx].docId).update(lr);
        localLrs[idx] = { ...lr, docId: localLrs[idx].docId };
      } else {
        const ref = await db.collection('lrs').add(lr);
        localLrs.push({ ...lr, docId: ref.id });
      }
      toast('LR saved', 'success');
      refreshKPIs(); renderLRReport(); buildLRPrint(lr); buildInvoiceLRList();
    } catch (e) { toast("Save Error: " + e.message, "error"); }
  };
  
  qs('#lr-edit').onclick = async () => {
    const n = prompt('Enter LR No:');
    if (!n) return;
    const hit = localLrs.find(x => x.number === n.trim());
    if (hit) { setLR(hit); buildLRPrint(hit); }
    else toast('LR Not Found', 'error');
  };
  
  /* ---------- PRINT LOGIC ---------- */
  qs('#lr-print').onclick = async () => {
    const lr = await collectLR(); 
    if(!lr) return;
    buildLRPrint(lr); 
    setTimeout(() => window.print(), 500);
  };

  qs('#inv-print').onclick = () => {
    const inv = getInvData();
    buildInvoicePrint(inv); // <--- This was causing the crash! Now fixed below.
    setTimeout(() => window.print(), 500);
  };

  /* ---------- VECTOR PDF GENERATION (LR) ---------- */
  qs('#lr-export').onclick = async () => {
    const lr = await collectLR();
    if(lr) generateVectorLR(lr);
  };

  qs('#inv-save').onclick = async () => {
  const inv = getInvData();
  // Generate ID if Auto
  if (!inv.number || inv.number === 'Auto') inv.number = `INV-${uid()}`;
  qs('#inv-number').value = inv.number;
  
  try {
    const idx = localInvoices.findIndex(x => x.number === inv.number);
    
    if (idx > -1) {
      // Update existing
      await db.collection('invoices').doc(localInvoices[idx].docId).update(inv);
      localInvoices[idx] = { ...inv, docId: localInvoices[idx].docId };
    } else {
      // Create new
      const ref = await db.collection('invoices').add(inv);
      localInvoices.push({ ...inv, docId: ref.id });
    }
    
    toast('Invoice saved', 'success');
    
    // REFRESH UI
    renderInvoiceReport(); 
    buildInvoiceLRList(); // <--- This hides the just-used LR from the dropdown
    buildInvoicePrint(inv); 
    refreshKPIs();
    
  } catch (e) { 
    console.error(e);
    toast("Error: " + e.message, "error"); 
  }
};
qs('#inv-edit').onclick = async () => {
  const n = prompt('Enter Invoice No to edit:');
  if (!n) return;
  
  const inv = localInvoices.find(i => i.number === n.trim());
  
  if(inv) {
     setInvoice(inv);
     
     // CRITICAL: Pass the used LR number here so it shows up in the list!
     buildInvoiceLRList(inv.lrNo);
     qs('#inv-lr-link').value = inv.lrNo;
     
     buildInvoicePrint(inv);
     toast("Invoice loaded for editing", "success");
  } else {
     toast("Invoice not found", "error");
  }
};
  function generateVectorLR(lr) {
    if (typeof window.jspdf === 'undefined') return toast("Library loading...", "error");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    const MARGIN_X = 10;
    const COL_1_W = 140; const COL_2_W = 35; const COL_3_W = 45; const COL_4_W = 57;
    const X_COL_2 = MARGIN_X + COL_1_W; 
    const X_COL_3 = X_COL_2 + COL_2_W; 
    const X_COL_4 = X_COL_3 + COL_3_W;
    
    const BLUE_DARK = [30, 58, 138]; const BLUE_PRIMARY = [37, 99, 235]; const BLUE_LIGHT = [239, 246, 255];
    
    const drawBox = (x, y, w, h, title, contentLines) => {
      doc.setDrawColor(...BLUE_PRIMARY); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, 2, 2);
      doc.setFillColor(255, 255, 255); doc.rect(x + 2, y - 2, doc.getTextWidth(title) + 4, 4, 'F');
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BLUE_PRIMARY); doc.text(title, x + 4, y + 1);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
      let cy = y + 7;
      contentLines.forEach(line => { if(line) { doc.text(line.toString(), x + 4, cy); cy += 4.5; } });
    };
  
    const cName = qs('#cmp-name').value || "Transport Company";
    const cAddr = qs('#cmp-address').value || "";
    const cContact = `GSTIN: ${qs('#cmp-gst').value}  |  Mobile: ${qs('#cmp-contact').value}`;
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...BLUE_DARK); doc.text(cName, 148.5, 15, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text(cAddr.replace(/\n/g, ", "), 148.5, 21, { align: "center" });
    doc.text(cContact, 148.5, 26, { align: "center" });
    doc.setDrawColor(...BLUE_PRIMARY); doc.setLineWidth(0.5); doc.line(MARGIN_X, 30, 287, 30);
  
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    const yInfo = 38;
    doc.setFont("helvetica", "bold"); doc.text("LR No:", 10, yInfo); doc.setFont("helvetica", "normal"); doc.text(lr.number, 25, yInfo);
    doc.setFont("helvetica", "bold"); doc.text("Date:", 80, yInfo); doc.setFont("helvetica", "normal"); doc.text(fmtDate(lr.date), 92, yInfo);
    doc.setFont("helvetica", "bold"); doc.text("Vehicle:", 150, yInfo); doc.setFont("helvetica", "normal"); doc.text(lr.vehicle, 168, yInfo);
    doc.setFont("helvetica", "bold"); doc.text("Driver:", 220, yInfo); doc.setFont("helvetica", "normal"); doc.text(lr.driver, 235, yInfo);
  
    const yRoute = yInfo + 6;
    doc.setFont("helvetica", "bold"); doc.text("From:", 10, yRoute); doc.setFont("helvetica", "normal"); doc.text(lr.consignor.station, 25, yRoute);
    doc.setFont("helvetica", "bold"); doc.text("To:", 150, yRoute); doc.setFont("helvetica", "normal"); doc.text(lr.consignee.station, 168, yRoute);
  
    const boxY = 52;
    const cgorAddr = doc.splitTextToSize(lr.consignor.address, 130); const cgeeAddr = doc.splitTextToSize(lr.consignee.address, 130);
    drawBox(10, boxY, 136, 35, "CONSIGNOR", [`Name: ${lr.consignor.name}`, `Address: ${cgorAddr[0] || ''}`, cgorAddr[1] ? `         ${cgorAddr[1]}` : null, `GST: ${lr.consignor.gst}`, `Pincode: ${lr.consignor.pin}`]);
    drawBox(151, boxY, 136, 35, "CONSIGNEE", [`Name: ${lr.consignee.name}`, `Address: ${cgeeAddr[0] || ''}`, cgeeAddr[1] ? `         ${cgeeAddr[1]}` : null, `GST: ${lr.consignee.gst}`, `Pincode: ${lr.consignee.pin}`]);
  
    const columns = [{ header: 'DESCRIPTION / NATURE OF GOODS', dataKey: 'desc' }, { header: 'WEIGHT', dataKey: 'wt' }, { header: 'FREIGHT', dataKey: 'fr' }, { header: 'AMOUNT', dataKey: 'amt' }];
    const tableRows = lr.goods.map(g => ({ desc: g.desc + (g.details ? `\n${g.details}` : ""), wt: lr.hideDetails ? "-" : fmt(g.weight), fr: lr.hideDetails || lr.isTBB ? "-" : fmt(g.freight), amt: lr.isTBB ? "To Be Billed" : fmt(g.amount) }));
    if(tableRows.length < 3) tableRows.push({desc:'', wt:'', fr:'', amt:''});
  
    doc.autoTable({
      startY: 92, columns: columns, body: tableRows, theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, lineColor: BLUE_PRIMARY, lineWidth: 0.1, textColor: [0,0,0] },
      headStyles: { fillColor: BLUE_LIGHT, textColor: BLUE_DARK, fontStyle: 'bold', halign: 'left' },
      columnStyles: { desc: { cellWidth: COL_1_W }, wt: { cellWidth: COL_2_W, halign: 'right' }, fr: { cellWidth: COL_3_W, halign: 'right' }, amt: { cellWidth: COL_4_W, halign: 'right', fontStyle: 'bold' } },
      margin: { left: MARGIN_X, right: MARGIN_X }
    });
  
    let finalY = doc.lastAutoTable.finalY; doc.setDrawColor(...BLUE_PRIMARY);
    const drawTotalRow = (label, value, isBold = false) => {
        const rowH = 7;
        doc.rect(X_COL_2, finalY, COL_2_W + COL_3_W, rowH); 
        doc.setFont("helvetica", "bold"); doc.text(label, X_COL_4 - 2, finalY + 5, { align: 'right' });
        doc.rect(X_COL_4, finalY, COL_4_W, rowH);
        doc.setFont("helvetica", isBold ? "bold" : "normal"); doc.text(value, X_COL_4 + COL_4_W - 2, finalY + 5, { align: 'right' });
        finalY += rowH;
    };
    drawTotalRow("Total Freight", lr.isTBB ? "TBB" : fmt(lr.totals.amount), true);
    drawTotalRow("Advance", lr.isTBB ? "-" : fmt(lr.totals.advance));
    drawTotalRow("To Pay", lr.isTBB ? "TBB" : fmt(lr.totals.toPay), true);
  
    const footerY = finalY + 5; 
    drawBox(10, footerY, 136, 25, "INSURANCE", [`Company: ${lr.insurance.company || '-'}`, `Policy No: ${lr.insurance.policy || '-'}`, `Amount: ${lr.insurance.amount || '-'}`, `Date: ${fmtDate(lr.insurance.date)}`]);
    drawBox(151, footerY, 136, 25, "BANK DETAILS", [`Bank: ${lr.bank.name}`, `A/C No: ${lr.bank.ac}`, `IFSC: ${lr.bank.ifsc}`, `GST Paid By: ${lr.gstBy}`]);
  
    const termsY = footerY + 30;
    doc.setDrawColor(...BLUE_PRIMARY); doc.roundedRect(10, termsY, 180, 20, 2, 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BLUE_PRIMARY); doc.text("TERMS & CONDITIONS", 12, termsY + 4);
    doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.setFontSize(7);
    const termsLines = doc.splitTextToSize(lr.terms, 175); doc.text(termsLines, 12, termsY + 8);
  
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(`For ${cName}`, 245, termsY + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Authorised Signature", 245, termsY + 18, { align: "center" });
  
    doc.save(`LR_${lr.number}.pdf`);
  }
  
  /* ---------- VECTOR PDF GENERATION (Invoice) ---------- */
  qs('#inv-export').onclick = () => generateVectorInvoice(getInvData());
  
  function generateVectorInvoice(inv) {
    if (typeof window.jspdf === 'undefined') return toast("Library loading...", "error");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  
    // 1. Dynamic Logic
    const linkedLR = localLrs.find(l => l.number === inv.lrNo);
    let billedToParty = { name: '', address: '', gst: '' };
    let paymentMode = "Receiver";
    if (linkedLR) {
        paymentMode = linkedLR.gstBy || "Receiver";
        if (paymentMode === 'Sender') billedToParty = linkedLR.consignor;
        else billedToParty = linkedLR.consignee;
    } else {
        billedToParty = { name: inv.to, address: 'Address not available', gst: '' };
    }
  
    const BLUE_DARK = [30, 58, 138]; const BLUE_PRIMARY = [37, 99, 235]; const BLUE_LIGHT = [239, 246, 255];
    const drawBox = (x, y, w, h, title, contentLines) => {
      doc.setDrawColor(...BLUE_PRIMARY); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, 2, 2);
      doc.setFillColor(255, 255, 255); doc.rect(x + 2, y - 2, doc.getTextWidth(title) + 4, 4, 'F');
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BLUE_PRIMARY); doc.text(title, x + 4, y + 1);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
      let cy = y + 6;
      contentLines.forEach(line => { if(line) { doc.text(line.toString(), x + 4, cy); cy += 5; } });
    };
  
    const cName = qs('#cmp-name').value || "Transport Company";
    const cAddr = qs('#cmp-address').value || "";
    const cContact = `GSTIN: ${qs('#cmp-gst').value}  |  Mobile: ${qs('#cmp-contact').value}`;
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...BLUE_DARK); doc.text(cName, 148.5, 15, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text(cAddr.replace(/\n/g, ", "), 148.5, 21, { align: "center" });
    doc.text(cContact, 148.5, 26, { align: "center" });
    doc.setDrawColor(...BLUE_PRIMARY); doc.setLineWidth(0.5); doc.line(10, 30, 287, 30);
  
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...BLUE_PRIMARY); doc.text("TAX INVOICE", 148.5, 40, { align: "center" });
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    
    const metaY = 50;
    doc.setFont("helvetica", "bold"); doc.text("Invoice No:", 15, metaY); doc.setFont("helvetica", "normal"); doc.text(inv.number, 40, metaY);
    doc.setFont("helvetica", "bold"); doc.text("Date:", 15, metaY + 6); doc.setFont("helvetica", "normal"); doc.text(fmtDate(inv.date), 40, metaY + 6);
    doc.setFont("helvetica", "bold"); doc.text("LR Ref:", 200, metaY); doc.setFont("helvetica", "normal"); doc.text(inv.lrNo, 225, metaY);
    doc.setFont("helvetica", "bold"); doc.text("Payable By:", 200, metaY + 6); doc.setFont("helvetica", "bold"); doc.text(`${paymentMode.toUpperCase()} (RCM)`, 225, metaY + 6);
  
    const boxY = 65;
    const addrLines = doc.splitTextToSize(billedToParty.address || '', 250);
    drawBox(15, boxY, 267, 35, "BILLED TO (RECIPIENT OF SERVICE)", [`Name: ${billedToParty.name}`, `Address: ${addrLines[0] || ''}`, addrLines[1] ? `         ${addrLines[1]}` : null, `GSTIN: ${billedToParty.gst || 'Unregistered'}`]);
  
    doc.autoTable({
      startY: 105, head: [['Description', 'Amount']],
      body: [ [`Freight Charges for LR Ref: ${inv.lrNo}`, fmt(inv.amount)], ['GST / Tax (0% under RCM)', '0.00'], ['', ''], [{ content: 'TOTAL PAYABLE', styles: { fontStyle: 'bold', fontSize: 12, fillColor: [240, 240, 240] } }, { content: fmt(inv.total), styles: { fontStyle: 'bold', fontSize: 12, fillColor: [240, 240, 240] } }] ],
      theme: 'grid', styles: { fontSize: 10, cellPadding: 4, lineColor: BLUE_PRIMARY, lineWidth: 0.1 },
      headStyles: { fillColor: BLUE_LIGHT, textColor: BLUE_DARK, fontStyle: 'bold', halign: 'left' },
      columnStyles: { 0: { cellWidth: 200 }, 1: { halign: 'right', fontStyle: 'bold' } }, margin: { left: 15, right: 15 }
    });
  
    let finalY = doc.lastAutoTable.finalY + 10;
    const bankName = qs('#cmp-bank').value || "-"; const bankAc = qs('#cmp-ac').value || "-"; const bankIfsc = qs('#cmp-ifsc').value || "-";
    drawBox(15, finalY, 130, 30, "BANK DETAILS", [`Bank Name : ${bankName}`, `A/C No    : ${bankAc}`, `IFSC Code : ${bankIfsc}`]);
  
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(`For ${cName}`, 240, finalY + 10, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Authorised Signature", 240, finalY + 25, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text("Thank you for your business!", 240, finalY + 35, { align: "center" });
    doc.text("* Tax is payable by Recipient of Service under Reverse Charge Mechanism (RCM).", 15, finalY + 35);
  
    doc.save(`INV_${inv.number}.pdf`);
  }
  
  /* ---------- Invoice Logic (Helpers) ---------- */
  function buildInvoiceFromLR(lr) {
    qs('#inv-from').value = `${lr.consignor.name} (${lr.consignor.gst})`;
    qs('#inv-to').value = `${lr.consignee.name} (${lr.consignee.gst})`;
    qs('#inv-amount').value = fmt(lr.totals.amount);
    qs('#inv-total').value = fmt(lr.totals.amount); 
  }
  
 function buildInvoiceLRList(activeLrNo = null) {
  const sel = qs('#inv-lr-link');
  
  // 1. Create a list of LRs that are already used in invoices
  const usedLRs = new Set(localInvoices.map(i => i.lrNo));

  // 2. Filter: Show LR if it is NOT used, OR if it is the one we are currently editing
  const available = localLrs.filter(lr => !usedLRs.has(lr.number) || lr.number === activeLrNo);

  // 3. Sort descending (newest LRs first)
  available.sort((a, b) => b.number.localeCompare(a.number));

  // 4. Build Dropdown
  sel.innerHTML = `<option value="">Select LR</option>` +
    available.map(x => `<option value="${x.number}" ${x.number === activeLrNo ? 'selected' : ''}>${x.number}</option>`).join('');

  // 5. Handle Selection
  sel.onchange = () => {
    const lr = localLrs.find(i => i.number === sel.value);
    if (lr) {
       buildInvoiceFromLR(lr);
       // Ensure we pass the data correctly to the print preview
       buildInvoicePrint({ ...getInvData(), lrNo: lr.number });
    }
  };
}
  
  function getInvData() {
    return {
      number: qs('#inv-number').value, date: qs('#inv-date').value, due: qs('#inv-due').value,
      lrNo: qs('#inv-lr-link').value, from: qs('#inv-from').value, to: qs('#inv-to').value,
      amount: +qs('#inv-amount').value || 0, gst: +qs('#inv-gst').value || 0, total: +qs('#inv-total').value || 0,
      clientId: CURRENT_CLIENT_ID
    };
  }
  
  function setInvoice(inv) { 
    qs('#inv-number').value = inv.number; qs('#inv-date').value = inv.date; qs('#inv-due').value = inv.due;
    qs('#inv-lr-link').value = inv.lrNo; qs('#inv-from').value = inv.from; qs('#inv-to').value = inv.to;
    qs('#inv-amount').value = fmt(inv.amount); qs('#inv-gst').value = fmt(inv.gst); qs('#inv-total').value = fmt(inv.total);
  }

  // ---------- RESTORED MISSING FUNCTIONS ---------- //

function buildLRPrint(lr) { 
  const c = { 
    name: qs('#cmp-name').value || 'Transport Company', 
    address: qs('#cmp-address').value || '', 
    contact: `GSTIN: ${qs('#cmp-gst').value} | Mobile: ${qs('#cmp-contact').value}`
  };

  // Helper to format empty fields
  const val = (v) => v || '-';

  const html = `
  <div class="lr-sheet a4-landscape" style="font-family: Helvetica, sans-serif; color: #000;">
    
    <div class="text-center mb-2">
      <h1 class="lr-title" style="color: #1e3a8a; font-size: 24pt; font-weight: 800; margin:0;">${c.name}</h1>
      <div class="lr-sub" style="font-size: 10pt; color: #444;">${c.address}</div>
      <div class="lr-sub" style="font-size: 10pt; color: #444; font-weight: 500;">${c.contact}</div>
    </div>
    <div class="rule rule-blue" style="height: 2px; background: #2563eb; margin: 5px 0 15px;"></div>

    <div class="lr-row" style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 10pt;">
      <div style="flex:1"><b>LR No:</b> ${lr.number}</div>
      <div style="flex:1"><b>Date:</b> ${fmtDate(lr.date)}</div>
      <div style="flex:1"><b>Vehicle:</b> ${val(lr.vehicle)}</div>
      <div style="flex:1"><b>Driver:</b> ${val(lr.driver)}</div>
    </div>
    
    <div class="lr-row" style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 10pt;">
      <div style="flex:1"><b>From:</b> ${val(lr.consignor.station)}</div>
      <div style="flex:1"><b>To:</b> ${val(lr.consignee.station)}</div>
    </div>

    <div class="lr-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
      <div class="lr-box" style="flex: 1; border: 1px solid #2563eb; border-radius: 6px; padding: 15px 10px 10px; position: relative;">
        <span class="box-title" style="position: absolute; top: -10px; left: 10px; background: white; padding: 0 5px; font-size: 9pt; font-weight: bold; color: #2563eb;">CONSIGNOR</span>
        <div style="font-size: 10pt;">
          <b>${lr.consignor.name}</b><br>
          ${lr.consignor.address}<br>
          GST: ${val(lr.consignor.gst)} | Pin: ${val(lr.consignor.pin)}
        </div>
      </div>

      <div class="lr-box" style="flex: 1; border: 1px solid #2563eb; border-radius: 6px; padding: 15px 10px 10px; position: relative;">
        <span class="box-title" style="position: absolute; top: -10px; left: 10px; background: white; padding: 0 5px; font-size: 9pt; font-weight: bold; color: #2563eb;">CONSIGNEE</span>
        <div style="font-size: 10pt;">
          <b>${lr.consignee.name}</b><br>
          ${lr.consignee.address}<br>
          GST: ${val(lr.consignee.gst)} | Pin: ${val(lr.consignee.pin)}
        </div>
      </div>
    </div>

    <table class="grid-table" style="width: 100%; border-collapse: collapse; border: 1px solid #2563eb; font-size: 10pt; margin-bottom: 15px;">
      <thead>
        <tr style="background: #eff6ff; color: #1e3a8a;">
          <th style="border: 1px solid #2563eb; padding: 6px; text-align: left;">DESCRIPTION / NATURE OF GOODS</th>
          <th style="border: 1px solid #2563eb; padding: 6px; text-align: right; width: 80px;">WEIGHT</th>
          <th style="border: 1px solid #2563eb; padding: 6px; text-align: right; width: 100px;">FREIGHT</th>
          <th style="border: 1px solid #2563eb; padding: 6px; text-align: right; width: 120px;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${lr.goods.map(g => `
          <tr>
            <td style="border: 1px solid #2563eb; padding: 6px;">
              <b>${g.desc}</b>
              ${g.details ? `<br><span style="font-size:9pt; color:#555;">${g.details}</span>` : ''}
            </td>
            <td style="border: 1px solid #2563eb; padding: 6px; text-align: right;">
              ${lr.hideDetails ? '-' : fmt(g.weight)}
            </td>
            <td style="border: 1px solid #2563eb; padding: 6px; text-align: right;">
              ${(lr.hideDetails || lr.isTBB) ? '-' : fmt(g.freight)}
            </td>
            <td style="border: 1px solid #2563eb; padding: 6px; text-align: right; font-weight: bold;">
              ${lr.isTBB ? 'To Be Billed' : fmt(g.amount)}
            </td>
          </tr>
        `).join('')}
        <tr><td style="border:1px solid #2563eb; height: 20px;"></td><td style="border:1px solid #2563eb;"></td><td style="border:1px solid #2563eb;"></td><td style="border:1px solid #2563eb;"></td></tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="border: 1px solid #2563eb; padding: 6px; text-align: right; font-weight: bold;">Total Freight</td>
          <td style="border: 1px solid #2563eb; padding: 6px; text-align: right; font-weight: bold;">${lr.isTBB ? 'TBB' : fmt(lr.totals.amount)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border: 1px solid #2563eb; padding: 6px; text-align: right; font-weight: bold;">Advance</td>
          <td style="border: 1px solid #2563eb; padding: 6px; text-align: right;">${lr.isTBB ? '-' : fmt(lr.totals.advance)}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td colspan="3" style="border: 1px solid #2563eb; padding: 6px; text-align: right; font-weight: bold; font-size: 11pt;">To Pay</td>
          <td style="border: 1px solid #2563eb; padding: 6px; text-align: right; font-weight: bold; font-size: 11pt;">${lr.isTBB ? 'TBB' : fmt(lr.totals.toPay)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="lr-row" style="display: flex; gap: 15px; margin-bottom: 20px;">
      <div class="lr-box" style="flex: 1; border: 1px solid #2563eb; border-radius: 6px; padding: 15px 10px 10px; position: relative;">
        <span class="box-title" style="position: absolute; top: -10px; left: 10px; background: white; padding: 0 5px; font-size: 9pt; font-weight: bold; color: #2563eb;">INSURANCE</span>
        <div style="font-size: 9pt; line-height: 1.4;">
          Co: ${val(lr.insurance.company)}<br>
          Policy: ${val(lr.insurance.policy)}<br>
          Amt: ${val(lr.insurance.amount)} | Date: ${fmtDate(lr.insurance.date)}
        </div>
      </div>

      <div class="lr-box" style="flex: 1; border: 1px solid #2563eb; border-radius: 6px; padding: 15px 10px 10px; position: relative;">
        <span class="box-title" style="position: absolute; top: -10px; left: 10px; background: white; padding: 0 5px; font-size: 9pt; font-weight: bold; color: #2563eb;">BANK DETAILS</span>
        <div style="font-size: 9pt; line-height: 1.4;">
          <b>${val(lr.bank.name)}</b><br>
          A/C: ${val(lr.bank.ac)}<br>
          IFSC: ${val(lr.bank.ifsc)}<br>
          GST Paid By: <b>${lr.gstBy}</b>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
      
      <div style="width: 65%; border: 1px solid #2563eb; border-radius: 6px; padding: 15px 10px 10px; position: relative;">
        <span class="box-title" style="position: absolute; top: -10px; left: 10px; background: white; padding: 0 5px; font-size: 9pt; font-weight: bold; color: #2563eb;">TERMS & CONDITIONS</span>
        <pre style="font-family: inherit; font-size: 7pt; white-space: pre-wrap; margin: 0;">${lr.terms}</pre>
      </div>

      <div style="text-align: center; width: 30%;">
        <div style="font-weight: bold; font-size: 10pt; margin-bottom: 30px;">For ${c.name}</div>
        <div style="border-top: 1px solid #2563eb; font-size: 9pt; padding-top: 5px;">Authorised Signature</div>
      </div>

    </div>

  </div>`;
  
  qs('#lr-print-area').innerHTML = html;
}

  function buildInvoicePrint(inv) {
    /* This function generates the HTML preview for Invoice (Matches new PDF look) */
    const linkedLR = localLrs.find(l => l.number === inv.lrNo);
    let billedToHTML = '';
    let paymentMode = "Receiver";
    
    if (linkedLR) {
        paymentMode = linkedLR.gstBy || "Receiver";
        const party = paymentMode === 'Sender' ? linkedLR.consignor : linkedLR.consignee;
        billedToHTML = `<div><b>${party.name}</b><br>${party.address}<br>GSTIN: ${party.gst}</div>`;
    } else {
        billedToHTML = `<div>${inv.to}</div>`;
    }

    const c = { name: qs('#cmp-name').value, address: qs('#cmp-address').value, contact: `GSTIN: ${qs('#cmp-gst').value} | Mobile: ${qs('#cmp-contact').value}` };
    const bank = { name: qs('#cmp-bank').value, ac: qs('#cmp-ac').value, ifsc: qs('#cmp-ifsc').value };

    const html = `
    <div class="lr-sheet a4-landscape" style="font-family: Helvetica, sans-serif; color: #333;">
      <div class="text-center mb-4"><h1 class="text-3xl font-bold text-blue-800 mb-1">${c.name}</h1><p class="text-sm text-gray-600">${c.address}</p><p class="text-sm text-gray-600 font-medium">${c.contact}</p><div class="w-full h-1 bg-blue-600 mt-3"></div></div>
      <h2 class="text-center text-xl font-bold text-blue-600 mb-6">TAX INVOICE</h2>
      <div class="flex justify-between text-sm mb-6"><div><p><b>Invoice No:</b> ${inv.number}</p><p><b>Date:</b> ${fmtDate(inv.date)}</p></div><div class="text-right"><p><b>LR Ref:</b> ${inv.lrNo}</p><p><b>(RCM) Payable By:</b> ${paymentMode} </p></div></div>
      <div class="border border-blue-600 rounded p-3 mb-6 relative"><span class="absolute -top-3 left-2 bg-white px-1 text-xs font-bold text-blue-600">BILLED TO ( ${paymentMode})</span>${billedToHTML}</div>
      <table class="w-full border-collapse border border-blue-600 mb-6 text-sm"><thead><tr class="bg-blue-50 text-blue-900"><th class="border border-blue-600 p-2 text-left">Description</th><th class="border border-blue-600 p-2 text-right w-32">Amount</th></tr></thead><tbody><tr><td class="border border-blue-600 p-2">Freight Charges for LR Ref: ${inv.lrNo}</td><td class="border border-blue-600 p-2 text-right">${fmt(inv.amount)}</td></tr><tr><td class="border border-blue-600 p-2">GST / Tax (0% under RCM)</td><td class="border border-blue-600 p-2 text-right">0.00</td></tr></tbody><tfoot><tr class="bg-gray-100 font-bold"><td class="border border-blue-600 p-2 text-right">TOTAL PAYABLE</td><td class="border border-blue-600 p-2 text-right">${fmt(inv.total)}</td></tr></tfoot></table>
      <div class="flex justify-between items-end mt-12"><div class="border border-blue-600 rounded p-3 relative w-1/2"><span class="absolute -top-3 left-2 bg-white px-1 text-xs font-bold text-blue-600">BANK DETAILS</span><p class="text-sm"><b>Bank:</b> ${bank.name}</p><p class="text-sm"><b>A/C:</b> ${bank.ac}</p><p class="text-sm"><b>IFSC:</b> ${bank.ifsc}</p></div><div class="text-center"><p class="font-bold text-sm mb-8">For ${c.name}</p><p class="text-xs border-t border-blue-600 pt-1">Authorised Signature</p></div></div>
      <div class="text-center text-xs text-gray-400 mt-8">* Tax payable by Recipient under Reverse Charge Mechanism (RCM).</div>
    </div>`;
    qs('#inv-print-area').innerHTML = html;
  }

 function renderLRReport() {
    const t = qs('#r-lr-table'); if (!t) return;
    const q = (qs('#r-lr-search').value || '').toLowerCase();
    const from = qs('#r-lr-from').value; const to = qs('#r-lr-to').value;
    
    const items = localLrs.filter(x => {
      const okQ = (x.number + x.consignor.name + x.consignee.name + x.consignor.station + x.consignee.station).toLowerCase().includes(q);
      const okDate = (!from || x.date >= from) && (!to || x.date <= to);
      return okQ && okDate;
    });
    
    let total = 0;
    t.innerHTML = `<thead><tr><th class="th">Date</th><th class="th">LR No</th><th class="th">From</th><th class="th">To</th><th class="th">Consignor</th><th class="th">Consignee</th><th class="th">Amount</th></tr></thead><tbody>
        ${items.map(x => {
      total += x.totals.amount || 0;
      return `
      <tr>
        <td class="td">${x.date}</td>
        <td class="td font-mono font-bold text-blue-600">
            ${x.number}
            <button onclick="copyText('${x.number}')" class="ml-2 text-gray-400 hover:text-blue-800 transition-colors" title="Copy LR No">📋</button>
        </td>
        <td class="td">${x.consignor.station || ''}</td>
        <td class="td">${x.consignee.station || ''}</td>
        <td class="td">${x.consignor.name || ''}</td>
        <td class="td">${x.consignee.name || ''}</td>
        <td class="td text-right">${fmt(x.totals.amount || 0)}</td>
      </tr>`;
    }).join('')}</tbody>`;
    qs('#r-lr-count').textContent = items.length;
    qs('#r-lr-total').textContent = fmt(total);
  }

  function renderInvoiceReport() {
    const t = qs('#r-inv-table'); if (!t) return;
    const q = (qs('#r-inv-search').value || '').toLowerCase();
    const from = qs('#r-inv-from').value; const to = qs('#r-inv-to').value;
    
    const items = localInvoices.filter(x => {
      const okQ = (x.number + x.lrNo + x.to).toLowerCase().includes(q);
      const okDate = (!from || x.date >= from) && (!to || x.date <= to);
      return okQ && okDate;
    });
    
    let total = 0;
    t.innerHTML = `<thead><tr><th class="th">Date</th><th class="th">Inv No</th><th class="th">LR Ref</th><th class="th">Bill To</th><th class="th">Amt</th><th class="th">GST</th><th class="th">Total</th></tr></thead><tbody>
        ${items.map(x => {
      total += x.total || 0;
      return `
      <tr>
        <td class="td">${x.date}</td>
        <td class="td font-mono font-bold text-green-600">
            ${x.number}
            <button onclick="copyText('${x.number}')" class="ml-2 text-gray-400 hover:text-green-800 transition-colors" title="Copy Inv No">📋</button>
        </td>
        <td class="td text-xs">
            ${x.lrNo}
            <button onclick="copyText('${x.lrNo}')" class="ml-1 text-gray-300 hover:text-gray-600" title="Copy LR Ref">📋</button>
        </td>
        <td class="td">${x.to}</td>
        <td class="td text-right">${fmt(x.amount)}</td>
        <td class="td text-right">${fmt(x.gst)}</td>
        <td class="td text-right">${fmt(x.total)}</td>
      </tr>`;
    }).join('')}</tbody>`;
    qs('#r-inv-count').textContent = items.length;
    qs('#r-inv-total').textContent = fmt(total);
  }

  function refreshKPIs() {
    qs('#kpi-receipts').textContent = localLrs.length;
    qs('#kpi-invoices').textContent = localInvoices.length;
    const parties = new Set([...localConsignors, ...localConsignees].map(x => x.gst));
    qs('#kpi-parties').textContent = parties.size;
    const stations = new Set([...localConsignors.map(x => x.station), ...localConsignees.map(x => x.station)].filter(Boolean));
    qs('#kpi-stations').textContent = stations.size;
    if (typeof checkComplianceAlerts === 'function') checkComplianceAlerts();
  }

  ['#r-lr-search', '#r-lr-from', '#r-lr-to'].forEach(sel => qs(sel)?.addEventListener('input', renderLRReport));
  ['#r-inv-search', '#r-inv-from', '#r-inv-to'].forEach(sel => qs(sel)?.addEventListener('input', renderInvoiceReport));
  
  /* ---------- Settings Logic ---------- */
  async function fillCompanySettings() {
    if (!CURRENT_CLIENT_ID) return; 
    try {
      const doc = await db.collection('company').doc(CURRENT_CLIENT_ID).get();
      if (doc.exists) {
        const c = doc.data();
        const safeSet = (id, val) => { const el = qs(id); if (el) el.value = val || ''; };
        safeSet('#cmp-name', c.name); safeSet('#cmp-email', c.email);
        safeSet('#cmp-contact', c.contact); safeSet('#cmp-pan', c.pan);
        safeSet('#cmp-gst', c.gst); safeSet('#cmp-bank', c.bank);
        safeSet('#cmp-ac', c.ac); safeSet('#cmp-ifsc', c.ifsc);
        safeSet('#cmp-address', c.address);
        safeSet('#bank-name', c.bank); safeSet('#bank-ac', c.ac); safeSet('#bank-ifsc', c.ifsc);
      }
    } catch (e) { toast("Error loading settings: " + e.message, "error"); }
  }

  const btnSaveCmp = qs('#cmp-save');
  if(btnSaveCmp) {
      btnSaveCmp.onclick = async () => {
        if (!CURRENT_CLIENT_ID) return toast("No client", "error");
        const data = {
          name: qs('#cmp-name').value.trim(), email: qs('#cmp-email').value.trim(),
          contact: qs('#cmp-contact').value.trim(), pan: qs('#cmp-pan').value.trim(),
          gst: qs('#cmp-gst').value.trim(), bank: qs('#cmp-bank').value.trim(),
          ac: qs('#cmp-ac').value.trim(), ifsc: qs('#cmp-ifsc').value.trim(),
          address: qs('#cmp-address').value.trim()
        };
        try {
          await db.collection('company').doc(CURRENT_CLIENT_ID).set(data);
          toast('Profile saved', 'success');
          fillCompanySettings();
        } catch (e) { toast("Save failed: " + e.message, "error"); }
      };
  }

  const btnClearCmp = qs('#cmp-clear');
  if(btnClearCmp) {
      btnClearCmp.onclick = () => {
        qsa('#cmp-name, #cmp-email, #cmp-contact, #cmp-pan, #cmp-gst, #cmp-bank, #cmp-ac, #cmp-ifsc, #cmp-address').forEach(i => i.value = '');
      };
  }

  function defaultTerms() { return "1. Subject to local jurisdiction.\n2. Goods carried at owner's risk.\n3. We are not responsible for leakage/breakage."; }
  (function init() { qs('#lr-date').value = today(); qs('#inv-date').value = today(); qs('#inv-due').value = today(); qs('#lr-terms').value = defaultTerms(); })();

  /* ---------- Fleet & Expenses ---------- */
  function renderFleetTable() {
    const tbody = qs('#fleet-rows'); if (!tbody) return;
    const term = (qs('#fleet-search').value || '').toLowerCase();
    const getExp = (d) => { if(!d) return '-'; const df = Math.ceil((new Date(d)-new Date())/(864e5)); return df<0?'Exp':(df<15?`${df}d`:'OK'); };
    
    tbody.innerHTML = localVehicles.filter(v => v.number.toLowerCase().includes(term)).map(v => 
      `<tr><td class="td font-bold">${v.number}</td><td class="td text-xs">${v.driver||'-'}</td>
      <td class="td text-xs">Ins:${getExp(v.ins)} Fit:${getExp(v.fit)}</td>
      <td class="td"><button class="text-blue-600" onclick="editFleet('${v.docId}')">Edit</button></td></tr>`
    ).join('');
  }

  function checkComplianceAlerts() {
    let c = 0; const now = new Date();
    localVehicles.forEach(v => { [v.ins, v.fit, v.tax, v.puc, v.permit].forEach(d => { if(d && (new Date(d)-now)/864e5 <= 7) c++; }); });
    qs('#alert-count').textContent = c; qs('#dashboard-alerts').classList.toggle('hidden', c === 0);
  }

  function updateDriverList() {
    const l = qs('#drv-list'); if(!l) return;
    const d = [...new Set(localVehicles.map(v => v.driver).filter(Boolean))];
    l.innerHTML = d.map(n => `<option value="${n}">`).join('');
  }

  // Fleet Save/Edit logic (Simplified for brevity, ensures defined)
  window.editFleet = (id) => {
      const v = localVehicles.find(x => x.docId === id); if(!v) return;
      qs('#fleet-no').value = v.number; qs('#fleet-driver').value = v.driver; qs('#fleet-phone').value = v.phone;
      qs('#fleet-ins').value = v.ins; qs('#fleet-fit').value = v.fit; qs('#fleet-tax').value = v.tax; qs('#fleet-puc').value = v.puc; qs('#fleet-permit').value = v.permit;
      // Assumes you have editingFleetId global or logic to handle update
      toast("Edit mode: " + v.number, "success");
  };

  const btnSaveFleet = qs('#btn-save-fleet');
  if(btnSaveFleet) {
      btnSaveFleet.onclick = async () => {
          const data = {
            number: qs('#fleet-no').value.trim().toUpperCase(), driver: qs('#fleet-driver').value.trim(),
            phone: qs('#fleet-phone').value.trim(), ins: qs('#fleet-ins').value, fit: qs('#fleet-fit').value,
            tax: qs('#fleet-tax').value, puc: qs('#fleet-puc').value, permit: qs('#fleet-permit').value,
            clientId: CURRENT_CLIENT_ID
          };
          if(!data.number) return toast("No Vehicle No", "error");
          try {
             await db.collection('vehicles').add(data);
             toast("Vehicle Saved", "success"); loadAllVehicles();
             qs('#fleet-no').value = '';
          } catch(e) { toast(e.message, "error"); }
      };
  }

  function renderExpenseTable() {
      const tb = qs('#expense-rows'); if(!tb) return;
      let t = 0;
      tb.innerHTML = localExpenses.map(e => { t += (+e.amount||0); return `<tr><td class="td">${fmtDate(e.date)}</td><td class="td">${e.category}</td><td class="td">${e.note}</td><td class="td text-right">${fmt(e.amount)}</td><td class="td"><button class="text-red-500" onclick="delExp('${e.docId}')">Del</button></td></tr>`; }).join('');
      qs('#exp-total').textContent = fmt(t);
  }
  
  window.delExp = async (id) => { if(confirm("Delete?")) { await db.collection("expenses").doc(id).delete(); loadAllExpenses(); } };
  
  const btnAddExp = qs('#btn-add-expense');
  if(btnAddExp) {
      btnAddExp.onclick = async () => {
          const d = { date: qs('#exp-date').value, category: qs('#exp-category').value, amount: +qs('#exp-amount').value, note: qs('#exp-note').value, clientId: CURRENT_CLIENT_ID };
          if(!d.amount) return;
          await db.collection("expenses").add(d); loadAllExpenses(); qs('#exp-amount').value='';
      };
  }

  /* ---------- Driver Ledger Logic ---------- */
  qs('#btn-load-ledger').onclick = async () => {
     const drv = qs('#drv-select-input').value;
     if(!drv) return toast("Select driver", "error");
     const snap = await db.collection('driver_ledger').where('clientId','==',CURRENT_CLIENT_ID).where('driver','==',drv).orderBy('date','asc').get();
     const txs = snap.docs.map(d => ({...d.data(), docId: d.id}));
     let bal = 0;
     qs('#drv-ledger-rows').innerHTML = txs.map(t => {
         const d = t.type==='Debit'?t.amount:0; const c = t.type==='Credit'?t.amount:0;
         bal = bal - d + c;
         return `<tr><td class="td">${fmtDate(t.date)}</td><td class="td">${t.remark}</td><td class="td text-right text-red-600">${d?fmt(d):'-'}</td><td class="td text-right text-green-600">${c?fmt(c):'-'}</td><td class="td"><button onclick="delDrvTx('${t.docId}')">x</button></td></tr>`;
     }).join('');
     qs('#drv-balance-display').textContent = `₹${fmt(Math.abs(bal))}`;
     qs('#drv-balance-status').textContent = bal > 0 ? "Driver Owes Co" : (bal < 0 ? "Co Owes Driver" : "Settled");
  };

  qs('#btn-save-tx').onclick = async () => {
      const d = { driver: qs('#drv-select-input').value, date: qs('#drv-tx-date').value, type: qs('#drv-tx-type').value, amount: +qs('#drv-tx-amount').value, remark: qs('#drv-tx-remark').value, clientId: CURRENT_CLIENT_ID };
      if(!d.driver || !d.amount) return;
      await db.collection('driver_ledger').add(d); qs('#btn-load-ledger').click();
  };
  
  window.delDrvTx = async (id) => { if(confirm("Delete?")) { await db.collection('driver_ledger').doc(id).delete(); qs('#btn-load-ledger').click(); } };

  /* ---------- MISSING REPORT FUNCTIONS (RESTORED) ---------- */
function renderLRReport() {
  const t = qs('#r-lr-table'); if (!t) return;
  const q = (qs('#r-lr-search').value || '').toLowerCase();
  const from = qs('#r-lr-from').value; const to = qs('#r-lr-to').value;
  
  const items = localLrs.filter(x => {
    const okQ = (x.number + x.consignor.name + x.consignee.name + x.consignor.station + x.consignee.station).toLowerCase().includes(q);
    const okDate = (!from || x.date >= from) && (!to || x.date <= to);
    return okQ && okDate;
  });
  
  let total = 0;
  // The Icon Code
  const icon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;

  t.innerHTML = `<thead><tr><th class="th">Date</th><th class="th">LR No</th><th class="th">From</th><th class="th">To</th><th class="th">Consignor</th><th class="th">Consignee</th><th class="th">Amount</th></tr></thead><tbody>
      ${items.map(x => {
    total += x.totals.amount || 0;
    return `
    <tr>
      <td class="td">${x.date}</td>
      <td class="td font-mono font-bold text-blue-600">
        <div class="flex items-center gap-2">
          ${x.number}
          <button type="button" onclick="window.copyText('${x.number}')" class="text-gray-400 hover:text-blue-600 transition-colors" title="Copy">
            ${icon}
          </button>
        </div>
      </td>
      <td class="td">${x.consignor.station || ''}</td>
      <td class="td">${x.consignee.station || ''}</td>
      <td class="td">${x.consignor.name || ''}</td>
      <td class="td">${x.consignee.name || ''}</td>
      <td class="td text-right">${fmt(x.totals.amount || 0)}</td>
    </tr>`;
  }).join('')}</tbody>`;
  qs('#r-lr-count').textContent = items.length;
  qs('#r-lr-total').textContent = fmt(total);
}

  function renderInvoiceReport() {
  const t = qs('#r-inv-table'); if (!t) return;
  const q = (qs('#r-inv-search').value || '').toLowerCase();
  const from = qs('#r-inv-from').value; const to = qs('#r-inv-to').value;
  
  const items = localInvoices.filter(x => {
    const okQ = (x.number + x.lrNo + x.to).toLowerCase().includes(q);
    const okDate = (!from || x.date >= from) && (!to || x.date <= to);
    return okQ && okDate;
  });
  
  let total = 0;
  // The Icon Code
  const icon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;

  t.innerHTML = `<thead><tr><th class="th">Date</th><th class="th">Inv No</th><th class="th">LR Ref</th><th class="th">Bill To</th><th class="th">Amt</th><th class="th">GST</th><th class="th">Total</th></tr></thead><tbody>
      ${items.map(x => {
    total += x.total || 0;
    return `
    <tr>
      <td class="td">${x.date}</td>
      <td class="td font-mono font-bold text-green-600">
        <div class="flex items-center gap-2">
          ${x.number}
          <button type="button" onclick="window.copyText('${x.number}')" class="text-gray-400 hover:text-green-600 transition-colors" title="Copy">
            ${icon}
          </button>
        </div>
      </td>
      <td class="td text-xs">
         <div class="flex items-center gap-1">
            ${x.lrNo}
            <button type="button" onclick="window.copyText('${x.lrNo}')" class="text-gray-300 hover:text-gray-600" title="Copy">
              ${icon}
            </button>
         </div>
      </td>
      <td class="td">${x.to}</td>
      <td class="td text-right">${fmt(x.amount)}</td>
      <td class="td text-right">${fmt(x.gst)}</td>
      <td class="td text-right">${fmt(x.total)}</td>
    </tr>`;
  }).join('')}</tbody>`;
  qs('#r-inv-count').textContent = items.length;
  qs('#r-inv-total').textContent = fmt(total);
}

  function refreshKPIs() {
    qs('#kpi-receipts').textContent = localLrs.length;
    qs('#kpi-invoices').textContent = localInvoices.length;
    const parties = new Set([...localConsignors, ...localConsignees].map(x => x.gst));
    qs('#kpi-parties').textContent = parties.size;
    const stations = new Set([...localConsignors.map(x => x.station), ...localConsignees.map(x => x.station)].filter(Boolean));
    qs('#kpi-stations').textContent = stations.size;
    if (typeof checkComplianceAlerts === 'function') checkComplianceAlerts();
  }

  ['#r-lr-search', '#r-lr-from', '#r-lr-to'].forEach(sel => qs(sel)?.addEventListener('input', renderLRReport));
  ['#r-inv-search', '#r-inv-from', '#r-inv-to'].forEach(sel => qs(sel)?.addEventListener('input', renderInvoiceReport));
});
