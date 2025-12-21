// =============================================
// NOTIFICATIONS.JS - Real-time Notification System
// =============================================

const Notifications = {
    notifications: [],
    unreadCount: 0,
    isInitialized: false,

    // Initialize notification system
    async init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        await this.loadNotifications();
        this.createNotificationUI();
        this.startPolling();
        
        console.log('✅ Notifications system initialized');
    },

    // Load user notifications
    async loadNotifications() {
        try {
            if (!Auth.currentUser) return;
            
            this.notifications = await Firestore.getUserNotifications(Auth.currentUser.uid, 50);
            this.updateUnreadCount();
            this.updateUI();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    },

    // Create notification UI elements
    createNotificationUI() {
        // Add notification bell to header if not exists
        const header = document.querySelector('.header-actions');
        if (header && !document.getElementById('notificationBell')) {
            const bellHTML = `
                <div class="notification-container" style="position: relative;">
                    <button id="notificationBell" class="btn btn-ghost" style="position: relative; padding: 0.5rem;" onclick="Notifications.togglePanel()">
                        🔔
                        <span id="notificationBadge" class="notification-badge" style="display: none;">0</span>
                    </button>
                    <div id="notificationPanel" class="notification-panel" style="display: none;">
                        <div class="notification-header">
                            <h4>Notifications</h4>
                            <button onclick="Notifications.markAllRead()" class="btn btn-ghost btn-sm">Mark all read</button>
                        </div>
                        <div id="notificationList" class="notification-list">
                            <p class="text-muted text-center py-4">No notifications</p>
                        </div>
                        <div class="notification-footer">
                            <button onclick="Notifications.clearAll()" class="btn btn-ghost btn-sm">Clear all</button>
                        </div>
                    </div>
                </div>
            `;
            header.insertAdjacentHTML('afterbegin', bellHTML);
            this.addNotificationStyles();
        }
    },

    // Add notification styles
    addNotificationStyles() {
        if (document.getElementById('notificationStyles')) return;

        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            .notification-badge {
                position: absolute;
                top: -2px;
                right: -2px;
                background: var(--danger-500);
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                animation: pulse 2s infinite;
            }
            
            .notification-panel {
                position: absolute;
                top: 100%;
                right: 0;
                width: 350px;
                max-height: 400px;
                background: rgba(30, 41, 59, 0.98);
                border: 1px solid var(--bg-glass-border);
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                backdrop-filter: blur(12px);
                animation: slideInUp 0.3s ease;
            }
            
            .notification-header {
                padding: 1rem;
                border-bottom: 1px solid var(--bg-glass-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .notification-header h4 {
                margin: 0;
                font-size: 1rem;
                font-weight: 600;
            }
            
            .notification-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .notification-item {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                cursor: pointer;
                transition: background 0.2s ease;
            }
            
            .notification-item:hover {
                background: rgba(99, 102, 241, 0.1);
            }
            
            .notification-item.unread {
                background: rgba(99, 102, 241, 0.05);
                border-left: 3px solid var(--primary-500);
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 0.25rem;
                font-size: 0.9rem;
            }
            
            .notification-message {
                color: var(--text-muted);
                font-size: 0.8rem;
                margin-bottom: 0.25rem;
                line-height: 1.4;
            }
            
            .notification-time {
                color: var(--text-muted);
                font-size: 0.7rem;
            }
            
            .notification-footer {
                padding: 0.75rem 1rem;
                border-top: 1px solid var(--bg-glass-border);
                text-align: center;
            }
            
            .notification-type-icon {
                display: inline-block;
                margin-right: 0.5rem;
                font-size: 1rem;
            }
            
            @media (max-width: 768px) {
                .notification-panel {
                    width: 300px;
                    right: -50px;
                }
            }
        `;
        document.head.appendChild(style);
    },

    // Update unread count
    updateUnreadCount() {
        if (!Auth.currentUser) return;
        
        this.unreadCount = this.notifications.filter(n => 
            !n.read?.includes(Auth.currentUser.uid)
        ).length;
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // Update notification UI
    updateUI() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = '<p class="text-muted text-center py-4">No notifications</p>';
            return;
        }

        list.innerHTML = this.notifications.map(notification => {
            const isUnread = !notification.read?.includes(Auth.currentUser?.uid);
            const icon = this.getNotificationIcon(notification.type);
            const time = notification.createdAt ? Utils.timeAgo(notification.createdAt) : '';

            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="Notifications.handleNotificationClick('${notification.id}')">
                    <div class="notification-title">
                        <span class="notification-type-icon">${icon}</span>
                        ${notification.title}
                    </div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${time}</div>
                </div>
            `;
        }).join('');
    },

    // Get notification icon based on type
    getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            task: '✅',
            payment: '💰',
            event: '🏆',
            system: '⚙️',
            reminder: '⏰'
        };
        return icons[type] || 'ℹ️';
    },

    // Toggle notification panel
    togglePanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        const isVisible = panel.style.display !== 'none';
        
        if (isVisible) {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'block';
            this.loadNotifications(); // Refresh when opening
        }

        // Close panel when clicking outside
        if (!isVisible) {
            setTimeout(() => {
                document.addEventListener('click', this.handleOutsideClick, { once: true });
            }, 100);
        }
    },

    // Handle outside click to close panel
    handleOutsideClick(event) {
        const panel = document.getElementById('notificationPanel');
        const bell = document.getElementById('notificationBell');
        
        if (panel && bell && !panel.contains(event.target) && !bell.contains(event.target)) {
            panel.style.display = 'none';
        }
    },

    // Handle notification click
    async handleNotificationClick(notificationId) {
        try {
            // Mark as read
            await this.markAsRead(notificationId);
            
            // Handle notification action based on type
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification?.metadata?.url) {
                window.location.href = notification.metadata.url;
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    },

    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            if (!Auth.currentUser) return;
            
            await Firestore.markNotificationRead(notificationId, Auth.currentUser.uid);
            
            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                if (!notification.read) notification.read = [];
                if (!notification.read.includes(Auth.currentUser.uid)) {
                    notification.read.push(Auth.currentUser.uid);
                }
            }
            
            this.updateUnreadCount();
            this.updateUI();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    // Mark all notifications as read
    async markAllRead() {
        try {
            if (!Auth.currentUser) return;
            
            const unreadNotifications = this.notifications.filter(n => 
                !n.read?.includes(Auth.currentUser.uid)
            );
            
            for (const notification of unreadNotifications) {
                await this.markAsRead(notification.id);
            }
            
            Utils.showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Error marking all as read:', error);
            Utils.showToast('Error marking notifications as read', 'error');
        }
    },

    // Clear all notifications
    async clearAll() {
        Modal.confirm('Clear all notifications? This action cannot be undone.', async () => {
            try {
                // In a real implementation, you'd call an API to delete notifications
                this.notifications = [];
                this.updateUnreadCount();
                this.updateUI();
                Utils.showToast('All notifications cleared', 'success');
            } catch (error) {
                console.error('Error clearing notifications:', error);
                Utils.showToast('Error clearing notifications', 'error');
            }
        });
    },

    // Create new notification
    async create(notificationData) {
        try {
            const result = await Firestore.createNotification({
                title: notificationData.title,
                message: notificationData.message,
                type: notificationData.type || 'info',
                recipients: notificationData.recipients || [],
                isGlobal: notificationData.isGlobal || false,
                metadata: notificationData.metadata || {}
            });
            
            if (result.success) {
                // Refresh notifications if current user is a recipient
                if (notificationData.isGlobal || 
                    notificationData.recipients?.includes(Auth.currentUser?.uid)) {
                    await this.loadNotifications();
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error creating notification:', error);
            return { success: false, error: error.message };
        }
    },

    // Show in-app notification toast
    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        
        const icon = this.getNotificationIcon(type);
        
        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <span style="font-size: 1.25rem;">${icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${title}</div>
                    <div style="font-size: 0.9rem; color: var(--text-muted);">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;">×</button>
            </div>
        `;
        
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(12px)',
            color: 'white',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: '10001',
            maxWidth: '400px',
            border: `1px solid ${this.getTypeColor(type)}`,
            animation: 'slideInRight 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    },

    // Get color for notification type
    getTypeColor(type) {
        const colors = {
            info: 'var(--primary-500)',
            success: 'var(--success-500)',
            warning: 'var(--warning-500)',
            error: 'var(--danger-500)',
            task: 'var(--success-500)',
            payment: 'var(--warning-500)',
            event: 'var(--info-500)'
        };
        return colors[type] || colors.info;
    },

    // Start polling for new notifications
    startPolling() {
        // Poll every 30 seconds for new notifications
        setInterval(async () => {
            if (Auth.currentUser) {
                await this.loadNotifications();
            }
        }, 30000);
    },

    // Send notification to specific users
    async sendToUsers(userIds, title, message, type = 'info', metadata = {}) {
        return await this.create({
            title,
            message,
            type,
            recipients: userIds,
            isGlobal: false,
            metadata
        });
    },

    // Send global notification to all users
    async sendGlobal(title, message, type = 'info', metadata = {}) {
        return await this.create({
            title,
            message,
            type,
            recipients: [],
            isGlobal: true,
            metadata
        });
    },

    // Quick notification helpers
    async notifyTaskAssigned(taskTitle, assigneeId) {
        return await this.sendToUsers(
            [assigneeId],
            'New Task Assigned',
            `You have been assigned a new task: "${taskTitle}"`,
            'task',
            { url: 'pages/logs/task-logs.html' }
        );
    },

    async notifyPaymentRequest(amount, memberIds) {
        return await this.sendToUsers(
            memberIds,
            'Payment Request',
            `New payment request for ${Utils.formatCurrency(amount)}`,
            'payment',
            { url: 'pages/logs/payment-logs.html' }
        );
    },

    async notifyEventUpdate(eventName, participantIds) {
        return await this.sendToUsers(
            participantIds,
            'Event Update',
            `"${eventName}" has been updated`,
            'event',
            { url: 'pages/logs/event-logs.html' }
        );
    }
};

// Auto-initialize when user data is loaded
window.addEventListener('userDataLoaded', () => {
    Notifications.init();
});

window.Notifications = Notifications;