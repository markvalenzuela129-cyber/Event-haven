/* =========================================================
   EVENT HAVEN — shared front-end logic
   Front-end only: all "persistence" below is localStorage,
   standing in for the MySQL database described in the proposal.
   Swap EH.store's methods for real fetch() calls to your PHP
   endpoints when the back end is ready.
   ========================================================= */

const EH = (() => {

  const KEYS = {
    session: 'eh_session',
    equipment: 'eh_equipment',
    reservations: 'eh_reservations',
    staff: 'eh_staff',
    payments: 'eh_payments',
  };

  const SEED = {
    equipment: [
      { id:'EQ-1042', name:'Round Table (10-seat)', category:'Tables & Chairs', total:40, available:26, status:'good', condition:'Good' },
      { id:'EQ-1043', name:'Chiavari Chair — Gold', category:'Tables & Chairs', total:220, available:58, status:'warn', condition:'Good' },
      { id:'EQ-2011', name:'Truss Stage Lighting Kit', category:'Lighting', total:8, available:1, status:'bad', condition:'Fair' },
      { id:'EQ-2014', name:'LED Par Can (RGBW)', category:'Lighting', total:60, available:44, status:'good', condition:'Good' },
      { id:'EQ-3005', name:'Line Array Speaker', category:'Sound', total:12, available:3, status:'warn', condition:'Good' },
      { id:'EQ-3009', name:'Wireless Mic Handset', category:'Sound', total:24, available:20, status:'good', condition:'Good' },
      { id:'EQ-4002', name:'40x60 Frame Tent', category:'Tents & Structures', total:6, available:0, status:'bad', condition:'Under repair' },
      { id:'EQ-4006', name:'Dance Floor Panel (3x3)', category:'Tents & Structures', total:150, available:112, status:'good', condition:'Good' },
    ],
    reservations: [
      { id:'RES-3301', client:'Dela Cruz Wedding', event:'Wedding Reception', date:'2026-10-03', items:'Chiavari Chairs, Round Tables, Dance Floor', status:'warn', label:'Pending approval' },
      { id:'RES-3298', client:'Ayala Corp. Townhall', event:'Corporate Event', date:'2026-10-05', items:'Line Array, LED Par Cans, Stage Truss', status:'good', label:'Confirmed' },
      { id:'RES-3290', client:'Santos Debut', event:'18th Birthday', date:'2026-10-06', items:'Frame Tent, Round Tables, Wireless Mics', status:'bad', label:'Conflict — tent booked' },
      { id:'RES-3286', client:'Barangay San Jose Fiesta', event:'Community Event', date:'2026-10-09', items:'Sound System, Chairs', status:'good', label:'Confirmed' },
      { id:'RES-3281', client:'Reyes Anniversary', event:'Private Party', date:'2026-09-30', items:'Tables, Lighting Kit', status:'neutral', label:'Completed' },
    ],
    staff: [
      { id:'STF-021', name:'Angeles, John Mark', role:'Administrator', email:'jm.angeles@eventhaven.ph', status:'good' },
      { id:'STF-022', name:'Bayan, Janelle', role:'Staff', email:'j.bayan@eventhaven.ph', status:'good' },
      { id:'STF-023', name:'Dela Cruz, Raphael', role:'Staff', email:'r.delacruz@eventhaven.ph', status:'good' },
      { id:'STF-024', name:'De Lara, Josfher Clark', role:'Staff', email:'jc.delara@eventhaven.ph', status:'neutral' },
      { id:'STF-025', name:'Espina, Ivan Jake', role:'Staff', email:'ij.espina@eventhaven.ph', status:'good' },
    ],
    payments: [
      { id:'PAY-5512', client:'Ayala Corp. Townhall', amount:48500, method:'Bank Transfer', date:'2026-09-24', status:'good', label:'Paid' },
      { id:'PAY-5509', client:'Dela Cruz Wedding', amount:32000, method:'GCash', date:'2026-09-22', status:'warn', label:'Partial — ₱18,000 due' },
      { id:'PAY-5503', client:'Santos Debut', amount:21500, method:'Cash', date:'2026-09-20', status:'bad', label:'Overdue' },
      { id:'PAY-5498', client:'Barangay San Jose Fiesta', amount:9800, method:'Cash', date:'2026-09-18', status:'good', label:'Paid' },
      { id:'PAY-5490', client:'Reyes Anniversary', amount:14200, method:'GCash', date:'2026-09-12', status:'good', label:'Paid' },
    ],
  };

  function load(key, seed) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    } catch (e) { return seed; }
  }

  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  const store = {
    getEquipment: () => load(KEYS.equipment, SEED.equipment),
    setEquipment: (d) => save(KEYS.equipment, d),
    getReservations: () => load(KEYS.reservations, SEED.reservations),
    setReservations: (d) => save(KEYS.reservations, d),
    getStaff: () => load(KEYS.staff, SEED.staff),
    setStaff: (d) => save(KEYS.staff, d),
    getPayments: () => load(KEYS.payments, SEED.payments),
    setPayments: (d) => save(KEYS.payments, d),
    getSession: () => {
      try { return JSON.parse(localStorage.getItem(KEYS.session)); } catch (e) { return null; }
    },
    setSession: (d) => save(KEYS.session, d),
    clearSession: () => localStorage.removeItem(KEYS.session),
  };

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function toast(message) {
    let node = document.querySelector('.toast');
    if (!node) {
      node = el(<div class="toast"><span class="dot"></span><span class="msg"></span></div>);
      document.body.appendChild(node);
    }
    node.querySelector('.msg').textContent = message;
    node.classList.add('show');
    clearTimeout(node._t);
    node._t = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function peso(n) {
    return '₱' + Number(n).toLocaleString('en-PH');
  }

  // Paints the logged-in user into the sidebar + wires the logout modal.
  // Call once on every app-shell page, after DOMContentLoaded.
  function mountShell() {
    const session = store.getSession() || { name: 'Guest User', role: 'Staff' };
    const who = document.querySelector('[data-user-name]');
    const roleEl = document.querySelector('[data-user-role]');
    const avatar = document.querySelector('[data-user-avatar]');
    if (who) who.textContent = session.name;
    if (roleEl) roleEl.textContent = session.role;
    if (avatar) avatar.textContent = session.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

    // hide admin-only nav items for staff
    if (session.role === 'Staff') {
      document.querySelectorAll('[data-admin-only]').forEach(node => node.style.display = 'none');
    }

    const backdrop = document.getElementById('logoutModal');
    document.querySelectorAll('[data-logout]').forEach(btn => {
      btn.addEventListener('click', () => backdrop && backdrop.classList.add('open'));
    });
    const cancel = document.getElementById('logoutCancel');
    if (cancel) cancel.addEventListener('click', () => backdrop.classList.remove('open'));
    const confirmBtn = document.getElementById('logoutConfirm');
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
      store.clearSession();
      window.location.href = 'index.html';
    });
    if (backdrop) backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('open');
    });
  }

  return { store, el, toast, peso, mountShell };
})();