// =============================================
// APP.JS - Core Application Logic
// =============================================

const App = {
    renderSidebar(container, user) {
        const roles = user.roles || ['member'];
        const primaryRole = roles.includes('leader') ? 'leader' : roles.includes('finance') ? 'finance' : 'member';
        const isLeader = roles.includes('leader');

        // Determine path prefix based on current location
        const currentPath = window.location.pathname;
        const isInSubfolder = currentPath.includes('/pages/');
        const isInAdminFolder = currentPath.includes('/admin/');
        const isInLogsFolder = currentPath.includes('/logs/');

        let prefix = '';
        if (isInAdminFolder || isInLogsFolder) {
            prefix = '../../';
        } else if (isInSubfolder) {
            prefix = '../';
        }

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
            navItems.push({
                section: 'Admin', items: [
                    { icon: '👥', label: 'Members', href: `${prefix}pages/admin/members.html`, active: currentPath.includes('/members') },
                    { icon: '💳', label: 'Transactions', href: `${prefix}pages/admin/transactions.html`, active: currentPath.includes('transactions') },
                    { icon: '🏆', label: 'Events', href: `${prefix}pages/admin/events.html`, active: currentPath.includes('/events') },
                ]
            });
        } else if (roles.includes('finance')) {
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
                            <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white;">${user.name || 'User'}</div>
                            <div class="text-xs" style="text-transform: capitalize; color: rgba(255,255,255,0.6);">${primaryRole}</div>
                        </div>
                        <button onclick="Auth.logout()" style="
                            background: rgba(239, 68, 68, 0.15);
                            border: 1px solid rgba(239, 68, 68, 0.3);
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            padding: 0.5rem 0.75rem;
                            color: #fca5a5;
                        " title="Logout">🚪</button>
                    </div>
                </div>
            </aside>
        `;
    },

    renderHeader(container, title) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

        container.innerHTML = `
            <header class="header">
                <h1 class="header-title">${title}</h1>
                <div class="header-actions">
                    <span class="text-muted text-sm">${dateStr} | ${timeStr}</span>
                </div>
            </header>
        `;
    }
};

// Initialize app when user data loads
window.addEventListener('userDataLoaded', (e) => {
    const user = e.detail;

    const sidebarContainer = document.getElementById('sidebar-container');
    const headerContainer = document.getElementById('header-container');

    if (sidebarContainer) {
        App.renderSidebar(sidebarContainer, user);
    }

    if (headerContainer) {
        const pageTitle = document.title.split('|')[0].trim();
        App.renderHeader(headerContainer, pageTitle);
    }
});

window.App = App;
