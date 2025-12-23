const Utils = {
    // === DATE/TIME ===
    formatDate(date) {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    formatDateTime(date) {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    },

    timeAgo(date) {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);

        const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
        for (const [unit, value] of Object.entries(intervals)) {
            const count = Math.floor(seconds / value);
            if (count >= 1) return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
        }
        return 'Just now';
    },

    // === CURRENCY ===
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    },

    // === STRING ===
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    },

    truncate(str, len = 50) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    },

    // === VALIDATION ===
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // === TOAST NOTIFICATIONS ===
    showToast(message, type = 'info') {
        // Remove existing toast
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';

        const colorConfigs = {
            info: { bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(30, 41, 59, 0.95))', border: 'var(--primary-500)', icon: 'ℹ️' },
            success: { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(30, 41, 59, 0.95))', border: 'var(--success-500)', icon: '✅' },
            error: { bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(30, 41, 59, 0.95))', border: 'var(--danger-500)', icon: '❌' },
            warning: { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(30, 41, 59, 0.95))', border: 'var(--warning-500)', icon: '⚠️' }
        };

        const config = colorConfigs[type] || colorConfigs.info;

        toast.innerHTML = `
            <span style="font-size: 1.35rem;">${config.icon}</span>
            <span style="flex: 1; font-weight: 500;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 1.25rem; padding: 4px;">×</button>
        `;

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: config.bg,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: 'white',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            boxShadow: '0 15px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: '10000',
            borderLeft: `4px solid ${config.border}`,
            animation: 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '420px',
            minWidth: '280px'
        });

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes toastSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes toastSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }
            @media (max-width: 768px) {
                .toast-notification {
                    left: 1rem !important;
                    right: 1rem !important;
                    bottom: 1rem !important;
                    max-width: none !important;
                    min-width: 0 !important;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.35s ease forwards';
            setTimeout(() => toast.remove(), 350);
        }, 4500);
    },

    // === LOCAL STORAGE ===
    setLocal(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    getLocal(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },

    // === DEBOUNCE ===
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

window.Utils = Utils;
