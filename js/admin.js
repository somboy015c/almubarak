(function () {
  if (!Api.isLoggedIn()) {
    location.href = 'login.html';
    return;
  }
  const user = Api.currentUser();
  if (!user?.isAdmin) {
    toast('This page is for admins only.', 'error');
    setTimeout(() => (location.href = 'dashboard.html'), 1200);
    return;
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById(`view-${name}`)?.classList.add('active');
    document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
    closeSidebar();
  }
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });

  // ---- Mobile off-canvas drawer ----
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const sidebarToggle = document.getElementById('sidebar-toggle');

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('open');
  }
  sidebarToggle?.addEventListener('click', openSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);

  document.getElementById('logout-btn').addEventListener('click', () => {
    Api.clearSession();
    location.href = 'login.html';
  });

  async function loadOverview() {
    try {
      const stats = await Api.get('/admin/stats');
      document.getElementById('stat-users').textContent = stats.totalUsers;
      document.getElementById('stat-tx').textContent = stats.totalTransactions;
      document.getElementById('stat-revenue').textContent = formatNaira(stats.totalRevenue);
      document.getElementById('stat-float').textContent = formatNaira(stats.totalWalletFloat);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function loadUsers() {
    try {
      const { users } = await Api.get('/admin/users');
      document.getElementById('users-body').innerHTML = users
        .map(
          (u) => `<tr>
            <td>${u.fullName}${u.isAdmin ? ' <span class="badge badge-neutral">admin</span>' : ''}</td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${formatNaira(u.walletBalance)}</td>
            <td>
              <button class="btn btn-ghost btn-sm adjust-btn" data-id="${u.id}" data-name="${u.fullName}">Adjust</button>
            </td>
          </tr>`
        )
        .join('');

      document.querySelectorAll('.adjust-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const amountStr = prompt(`Adjust wallet for ${btn.dataset.name}.\nEnter an amount (use a negative number to debit):`);
          if (amountStr === null || amountStr.trim() === '') return;
          const amount = Number(amountStr);
          if (!amount) return toast('Enter a valid, non-zero amount.', 'error');
          const reason = prompt('Reason for this adjustment (optional):') || undefined;
          try {
            await Api.post(`/admin/users/${btn.dataset.id}/wallet-adjust`, { amount, reason });
            toast('Wallet updated.');
            loadUsers();
            loadOverview();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function loadTransactions() {
    try {
      const { transactions } = await Api.get('/admin/transactions');
      document.getElementById('admin-tx-body').innerHTML = transactions
        .map((t) => {
          const badgeClass = t.status === 'success' ? 'badge-success' : t.status === 'failed' ? 'badge-danger' : 'badge-neutral';
          return `<tr>
            <td>${t.description}</td>
            <td style="text-transform:capitalize">${t.type}</td>
            <td>${formatNaira(t.amount)}</td>
            <td><span class="badge ${badgeClass}">${t.status}</span></td>
            <td>${new Date(t.createdAt).toLocaleString('en-NG')}</td>
          </tr>`;
        })
        .join('');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function loadPricing() {
    try {
      const { pricing } = await Api.get('/admin/pricing');
      document.getElementById('markup-data').value = pricing.data.markupPercent;
      document.getElementById('markup-electricity').value = pricing.electricity.markupPercent;
      document.getElementById('markup-cable').value = pricing.cable.markupPercent;
      document.getElementById('exam-fee').value = pricing.exam.flatFee;
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  document.getElementById('pricing-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        data: { markupPercent: Number(document.getElementById('markup-data').value) },
        electricity: { markupPercent: Number(document.getElementById('markup-electricity').value) },
        cable: { markupPercent: Number(document.getElementById('markup-cable').value) },
        exam: { flatFee: Number(document.getElementById('exam-fee').value) },
        airtime: { markupPercent: 0 }
      };
      await Api.put('/admin/pricing', payload);
      toast('Pricing updated.');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  loadOverview();
  loadUsers();
  loadTransactions();
  loadPricing();
})();
