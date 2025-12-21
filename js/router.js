// =============================================
// ROUTER.JS - Navigation & Page Controller
// =============================================

const Router = {
    // Get correct path prefix based on current location
    getPathPrefix() {
        const path = window.location.pathname;
        if (path.includes('/pages/logs/') || path.includes('/pages/admin/')) {
            return '../../';
        } else if (path.includes('/pages/')) {
            return '../';
        }
        return './';
    },

    // Navigate to a path
    navigate(path) {
        window.location.href = path;
    },

    // Check if user is authenticated, redirect if not
    async requireAuth() {
        const user = await Auth.init();

        // If on login page and already logged in, redirect to dashboard
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
            if (user) {
                const role = Auth.getPrimaryRole(user.roles);
                window.location.href = Auth.getDashboardUrl(role);
                return;
            }
        }

        // If on protected page and not logged in, redirect to login
        if (!user && !window.location.pathname.endsWith('index.html')) {
            const prefix = this.getPathPrefix();
            window.location.href = prefix + 'index.html';
        }
    },

    // Initialize page
    async initPage() {
        // Wait for auth
        const user = await Auth.init();

        if (!user) {
            // Not logged in on protected page
            if (!window.location.pathname.endsWith('index.html')) {
                const prefix = this.getPathPrefix();
                window.location.href = prefix + 'index.html';
            }
            return null;
        }

        return user;
    }
};

window.Router = Router;
