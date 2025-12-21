// =============================================
// APP.JS - Application Controller
// =============================================

const App = {
    initialized: false,

    // Initialize the application
    async init() {
        if (this.initialized) return;
        this.initialized = true;

        // Render layout components
        const sidebar = document.getElementById('sidebar-container');
        const header = document.getElementById('header-container');

        if (sidebar) this.renderSidebar(sidebar);
        if (header) this.renderHeader(header);

        console.log('✅ App initialized');
    },

    // Render Sidebar
    renderSidebar(container) {
        const prefix = Router.getPathPrefix();
        const user = Auth.userData || {};
        const roles = user.roles || ['member'];
        const isLeader = roles.includes('leader');
        const primaryRole = Auth.getPrimaryRole(roles);
        const currentPath = window.location.pathname;

        const navItems = [
            {
                section: 'Main', items: [
                    { icon: '🏠', label: 'Dashboard', href: `${prefix}pages/dashboard-${primaryRole}.html`, active: currentPath.includes('dashboard') },
                    { icon: '👤', label: 'My Profile', href: `${prefix}pages/profile.html`, active: currentPath.includes('profile') },
                ]
            },
            {
                section: 'Logs', items: [
                    { icon: '✅', label: 'Tasks', href: `${prefix}pages/logs/task-logs.html`, active: currentPath.includes('task-logs') },
                    { icon: '💰', label: 'Payments', href: `${prefix}pages/logs/payment-logs.html`, active: currentPath.includes('payment-logs') },
                    { icon: '🏆', label: 'Events', href: `${prefix}pages/logs/event-logs.html`, active: currentPath.includes('event-logs') },
                ]
            },
        ];

        if (isLeader) {
            // Leader gets full admin access
            navItems.push({
                section: 'Admin', items: [
                    { icon: '👥', label: 'Members', href: `${prefix}pages/admin/members.html`, active: currentPath.includes('/members') },
                    { icon: '💳', label: 'Transactions', href: `${prefix}pages/admin/transactions.html`, active: currentPath.includes('transactions') },
                    { icon: '🏆', label: 'Events', href: `${prefix}pages/admin/events.html`, active: currentPath.includes('/events') || currentPath.includes('event-details') },
                ]
            });
        } else if (roles.includes('finance')) {
            // Finance only gets transaction access
            navItems.push({
                section: 'Admin', items: [
                    { icon: '💳', label: 'Transactions', href: `${prefix}pages/admin/transactions.html`, active: currentPath.includes('transactions') },
                ]
            });
        }

        container.innerHTML = `
            <aside class="sidebar">
                <div class="sidebar-header">
                    <span style="font-size: 1.5rem;">🌌</span>
                    <span class="sidebar-brand">Log Portal</span>
                </div>

                <nav class="sidebar-nav">
                    ${navItems.map(section => `
                        <div class="nav-section">
                            <div class="nav-section-title">${section.section}</div>
                            ${section.items.map(item => `
                                <a href="${item.href}" class="nav-item ${item.active ? 'active' : ''}">
                                    <span class="nav-icon">${item.icon}</span>
                                    <span>${item.label}</span>
                                </a>
                            `).join('')}
                        </div>
                    `).join('')}
                </nav>

                <div class="sidebar-footer">
                    <div class="user-card">
                        <div class="user-avatar">${(user.name || 'U').charAt(0).toUpperCase()}</div>
                        <div style="flex: 1; overflow: hidden;">
                            <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.name || 'User'}</div>
                            <div class="text-xs text-muted" style="text-transform: capitalize;">${primaryRole}</div>
                        </div>
                        <button onclick="Auth.logout()" style="background: none; border: none; cursor: pointer; opacity: 0.7; font-size: 1.2rem;" title="Logout">🚪</button>
                    </div>
                </div>
            </aside>
        `;
    },

    // Render Header
    renderHeader(container) {
        const title = document.title.split('|')[0].trim();

        container.innerHTML = `
            <header class="header">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button class="mobile-menu-btn" style="display: none;" onclick="App.toggleMobileMenu()" aria-label="Toggle menu">☰</button>
                    <h2 class="header-title">${title}</h2>
                </div>
                <div class="header-actions">
                    <span class="text-muted text-sm" id="currentTime"></span>
                </div>
            </header>
            <div class="sidebar-backdrop" onclick="App.toggleMobileMenu()"></div>
        `;

        // Update time
        const updateTime = () => {
            const now = new Date();
            const timeEl = document.getElementById('currentTime');
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
        };
        updateTime();
        setInterval(updateTime, 60000);

        // Initialize notifications after header is rendered
        setTimeout(() => {
            if (window.Notifications && Auth.currentUser) {
                Notifications.init();
            }
        }, 100);
    },

    // Toggle mobile sidebar menu
    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');

        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
        if (backdrop) {
            backdrop.classList.toggle('active');
        }
    },

    // Show loading overlay
    showLoading(message = 'Loading...') {
        let loader = document.getElementById('appLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'appLoader';
            loader.innerHTML = `
                <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.95); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;">
                    <div style="width: 40px; height: 40px; border: 3px solid var(--primary-500); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="color: white;">${message}</div>
                </div>
                <style>@keyframes spin { to { transform: rotate(360deg); }}</style>
            `;
            document.body.appendChild(loader);
        }
    },

    hideLoading() {
        const loader = document.getElementById('appLoader');
        if (loader) loader.remove();
    }
};

// Auto-initialize when user data is loaded
window.addEventListener('userDataLoaded', () => {
    App.init();
});

window.App = App;
