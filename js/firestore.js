class Database {
    constructor() {
        this.collectionRef = db.collection('moneyCollections');
        this.logsRef = db.collection('logs');
        this.usersRef = db.collection('users');
    }

    // ==========================================
    // FINANCIAL LOGIC (Universal Visibility)
    // ==========================================

    /**
     * Calculates the "Outstanding Amount" for a user.
     * Logic: Sum of unpaid collection requests assigned to user
     */
    async getUserFinancialStatus(userId) {
        try {
            // Get all collections (no composite index needed)
            const collectionsSnap = await this.collectionRef.get();

            let totalDue = 0;
            let pendingRequests = [];

            collectionsSnap.forEach(doc => {
                const data = doc.data();
                // Only count active collections
                if (data.status !== 'active') return;

                // Check if user is in assignedMembers with pending status
                const memberRecord = data.assignedMembers?.find(m => m.userId === userId);

                if (memberRecord && (memberRecord.status === 'pending' || memberRecord.status === 'rejected')) {
                    totalDue += (Number(memberRecord.amount) || 0);
                    pendingRequests.push({
                        id: doc.id,
                        title: data.title,
                        amount: memberRecord.amount,
                        deadline: data.deadline
                    });
                }
            });

            return {
                outstandingAmount: totalDue,
                pendingRequests: pendingRequests,
                isClean: totalDue === 0
            };
        } catch (error) {
            console.error("Financial Sync Error:", error);
            return { outstandingAmount: 0, pendingRequests: [], isClean: true };
        }
    }

    // Finance/Leader Only: Create a Collection Request
    async createCollectionRequest(data) {
        const assignedMembers = [];

        let targetUsers = [];
        if (data.assignedTo === 'all') {
            // Get all users and filter client-side (no composite index needed)
            const snap = await this.usersRef.get();
            targetUsers = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(u => u.isActive !== false);
        }

        targetUsers.forEach(u => {
            assignedMembers.push({
                userId: u.id,
                userName: u.name,
                amount: Number(data.amount),
                status: 'pending',
                paidAt: null
            });
        });

        await this.collectionRef.add({
            title: data.title,
            description: data.description || '',
            amount: Number(data.amount),
            assignedMembers: assignedMembers,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: window.Auth.currentUser?.uid || 'unknown'
        });

        return { success: true, count: assignedMembers.length };
    }

    // ==========================================
    // TASK LOGIC (Enhanced with Event Support)
    // ==========================================

    async assignTask(taskData) {
        const batch = db.batch();
        const baseData = {
            type: 'task',
            data: {
                title: taskData.title,
                description: taskData.description || '',
                priority: taskData.priority || 'medium',
                status: 'pending',
                progress: 0,
                dueDate: taskData.dueDate || null,
                eventId: taskData.eventId || null
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: window.Auth.currentUser?.uid || 'unknown'
        };

        if (taskData.assignee === 'all') {
            // Get all users and filter client-side
            const snap = await this.usersRef.get();
            const activeUsers = snap.docs.filter(doc => doc.data().isActive !== false);
            activeUsers.forEach(doc => {
                const ref = this.logsRef.doc();
                batch.set(ref, {
                    ...baseData,
                    data: {
                        ...baseData.data,
                        assignee: doc.id,
                        assigneeName: doc.data().name || doc.data().email?.split('@')[0] || 'Unknown'
                    }
                });
            });
        } else {
            // Single assignment
            const userDoc = await this.usersRef.doc(taskData.assignee).get();
            const userData = userDoc.exists ? userDoc.data() : {};

            const ref = this.logsRef.doc();
            batch.set(ref, {
                ...baseData,
                data: {
                    ...baseData.data,
                    assignee: taskData.assignee,
                    assigneeName: userData.name || userData.email?.split('@')[0] || 'Unknown'
                }
            });
        }

        await batch.commit();
        return { success: true };
    }

    // Get tasks with advanced filtering
    async getTasks(filters = {}) {
        try {
            const snap = await this.logsRef.get();
            let tasks = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(log => log.type === 'task');

            // Apply filters client-side
            if (filters.status) {
                tasks = tasks.filter(t => t.data?.status === filters.status);
            }
            if (filters.priority) {
                tasks = tasks.filter(t => t.data?.priority === filters.priority);
            }
            if (filters.assignee) {
                tasks = tasks.filter(t => t.data?.assignee === filters.assignee);
            }
            if (filters.eventId) {
                tasks = tasks.filter(t => t.data?.eventId === filters.eventId);
            }
            if (filters.overdue) {
                const now = new Date();
                tasks = tasks.filter(t => {
                    const dueDate = t.data?.dueDate?.toDate?.();
                    return dueDate && dueDate < now && t.data?.status !== 'completed';
                });
            }

            // Sort by creation date (newest first)
            tasks.sort((a, b) => {
                const aDate = a.createdAt?.toDate?.() || new Date(0);
                const bDate = b.createdAt?.toDate?.() || new Date(0);
                return bDate - aDate;
            });

            return tasks;
        } catch (error) {
            console.error('Get tasks error:', error);
            return [];
        }
    }

    // Update task with progress tracking
    async updateTask(taskId, updates) {
        try {
            const updateData = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Handle nested data updates
            Object.keys(updates).forEach(key => {
                if (key.startsWith('data.')) {
                    updateData[key] = updates[key];
                } else {
                    updateData[`data.${key}`] = updates[key];
                }
            });

            // Auto-complete when progress reaches 100%
            if (updates.progress === 100 || updates['data.progress'] === 100) {
                updateData['data.status'] = 'completed';
                updateData['data.completedAt'] = firebase.firestore.FieldValue.serverTimestamp();
            }

            await this.logsRef.doc(taskId).update(updateData);
            return { success: true };
        } catch (error) {
            console.error('Update task error:', error);
            return { success: false, error: error.message };
        }
    }

    // Bulk update tasks
    async bulkUpdateTasks(taskIds, updates) {
        try {
            const batch = db.batch();

            taskIds.forEach(taskId => {
                const taskRef = this.logsRef.doc(taskId);
                const updateData = {
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                Object.keys(updates).forEach(key => {
                    if (key.startsWith('data.')) {
                        updateData[key] = updates[key];
                    } else {
                        updateData[`data.${key}`] = updates[key];
                    }
                });

                batch.update(taskRef, updateData);
            });

            await batch.commit();
            return { success: true, updated: taskIds.length };
        } catch (error) {
            console.error('Bulk update error:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete task
    async deleteTask(taskId) {
        try {
            await this.logsRef.doc(taskId).delete();
            return { success: true };
        } catch (error) {
            console.error('Delete task error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get task analytics
    async getTaskAnalytics(filters = {}) {
        try {
            const tasks = await this.getTasks(filters);

            const analytics = {
                total: tasks.length,
                completed: tasks.filter(t => t.data?.status === 'completed').length,
                inProgress: tasks.filter(t => t.data?.status === 'in-progress').length,
                pending: tasks.filter(t => t.data?.status === 'pending').length,
                overdue: 0,
                avgCompletionTime: 0,
                priorityDistribution: { high: 0, medium: 0, low: 0 },
                assigneeStats: {}
            };

            // Calculate overdue tasks
            const now = new Date();
            analytics.overdue = tasks.filter(t => {
                const dueDate = t.data?.dueDate?.toDate?.();
                return dueDate && dueDate < now && t.data?.status !== 'completed';
            }).length;

            // Calculate average completion time
            const completedTasks = tasks.filter(t =>
                t.data?.status === 'completed' &&
                t.data?.completedAt &&
                t.createdAt
            );

            if (completedTasks.length > 0) {
                const totalDays = completedTasks.reduce((sum, task) => {
                    const created = task.createdAt.toDate();
                    const completed = task.data.completedAt.toDate();
                    return sum + Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
                }, 0);
                analytics.avgCompletionTime = Math.round(totalDays / completedTasks.length);
            }

            // Priority distribution
            tasks.forEach(task => {
                const priority = task.data?.priority || 'medium';
                analytics.priorityDistribution[priority]++;
            });

            // Assignee statistics
            tasks.forEach(task => {
                const assignee = task.data?.assigneeName || 'Unassigned';
                if (!analytics.assigneeStats[assignee]) {
                    analytics.assigneeStats[assignee] = { total: 0, completed: 0 };
                }
                analytics.assigneeStats[assignee].total++;
                if (task.data?.status === 'completed') {
                    analytics.assigneeStats[assignee].completed++;
                }
            });

            return analytics;
        } catch (error) {
            console.error('Analytics error:', error);
            return null;
        }
    }

    // ==========================================
    // DASHBOARD STATS
    // ==========================================

    async getDashboardStats() {
        try {
            // 1. Members count
            const userSnap = await this.usersRef.get();
            const activeMembers = userSnap.docs.filter(d => d.data().isActive !== false).length;

            // 2. Events count (filter client-side)
            const eventSnap = await db.collection('events').get();
            const activeEvents = eventSnap.docs.filter(d => d.data().status === 'active' || d.data().status === 'upcoming').length;

            // 3. Task Stats (filter client-side)
            const tasksSnap = await this.logsRef.get();
            let completed = 0, total = 0;
            tasksSnap.forEach(d => {
                if (d.data().type === 'task') {
                    total++;
                    if (d.data().data?.status === 'completed') completed++;
                }
            });

            // 4. Financial Balance
            const balance = 0;

            return { activeMembers, activeEvents, completed, total, balance };
        } catch (error) {
            console.error('Dashboard stats error:', error);
            return { activeMembers: 0, activeEvents: 0, completed: 0, total: 0, balance: 0 };
        }
    }

    // ==========================================
    // EVENT-WISE LOGGING SYSTEM
    // ==========================================

    // Create event with logging capability
    async createEvent(eventData) {
        try {
            const eventRef = await db.collection('events').add({
                name: eventData.name,
                description: eventData.description || '',
                type: eventData.type || 'general',
                status: 'upcoming',
                startDate: eventData.startDate || null,
                endDate: eventData.endDate || null,
                venue: eventData.venue || '',
                budget: eventData.budget || 0,
                participants: eventData.participants || [],
                logs: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.Auth.currentUser?.uid || 'unknown'
            });

            // Create initial log entry
            await this.addEventLog(eventRef.id, {
                type: 'created',
                title: 'Event Created',
                description: `Event "${eventData.name}" was created`,
                createdBy: window.Auth.currentUser?.uid || 'unknown',
                createdByName: window.Auth.userData?.name || 'Unknown'
            });

            return { success: true, eventId: eventRef.id };
        } catch (error) {
            console.error('Create event error:', error);
            return { success: false, error: error.message };
        }
    }

    // Add log entry to event
    async addEventLog(eventId, logData) {
        try {
            const logEntry = {
                id: Date.now().toString(),
                type: logData.type || 'update',
                title: logData.title,
                description: logData.description || '',
                createdAt: new Date(),
                createdBy: logData.createdBy || window.Auth.currentUser?.uid || 'unknown',
                createdByName: logData.createdByName || window.Auth.userData?.name || 'Unknown',
                metadata: logData.metadata || {}
            };

            await db.collection('events').doc(eventId).update({
                logs: firebase.firestore.FieldValue.arrayUnion(logEntry),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            console.error('Add event log error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get event logs with filtering
    async getEventLogs(eventId, filters = {}) {
        try {
            const eventDoc = await db.collection('events').doc(eventId).get();
            if (!eventDoc.exists) return [];

            let logs = eventDoc.data().logs || [];

            // Apply filters
            if (filters.type) {
                logs = logs.filter(log => log.type === filters.type);
            }
            if (filters.dateFrom) {
                logs = logs.filter(log => new Date(log.createdAt) >= new Date(filters.dateFrom));
            }
            if (filters.dateTo) {
                logs = logs.filter(log => new Date(log.createdAt) <= new Date(filters.dateTo));
            }

            // Sort by date (newest first)
            logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return logs;
        } catch (error) {
            console.error('Get event logs error:', error);
            return [];
        }
    }

    // Update event status with logging
    async updateEventStatus(eventId, newStatus, reason = '') {
        try {
            await db.collection('events').doc(eventId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add log entry
            await this.addEventLog(eventId, {
                type: 'status_change',
                title: `Status Changed to ${newStatus}`,
                description: reason || `Event status updated to ${newStatus}`,
                metadata: { previousStatus: 'unknown', newStatus }
            });

            return { success: true };
        } catch (error) {
            console.error('Update event status error:', error);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // NOTIFICATION SYSTEM
    // ==========================================

    // Create notification
    async createNotification(notificationData) {
        try {
            await db.collection('notifications').add({
                title: notificationData.title,
                message: notificationData.message,
                type: notificationData.type || 'info', // info, success, warning, error
                recipients: notificationData.recipients || [], // array of user IDs
                isGlobal: notificationData.isGlobal || false,
                read: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.Auth.currentUser?.uid || 'unknown'
            });

            return { success: true };
        } catch (error) {
            console.error('Create notification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user notifications
    async getUserNotifications(userId, limit = 20) {
        try {
            const snap = await db.collection('notifications').get();
            let notifications = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(notif =>
                    notif.isGlobal ||
                    notif.recipients?.includes(userId)
                )
                .sort((a, b) => {
                    const aDate = a.createdAt?.toDate?.() || new Date(0);
                    const bDate = b.createdAt?.toDate?.() || new Date(0);
                    return bDate - aDate;
                })
                .slice(0, limit);

            return notifications;
        } catch (error) {
            console.error('Get notifications error:', error);
            return [];
        }
    }

    // Mark notification as read
    async markNotificationRead(notificationId, userId) {
        try {
            await db.collection('notifications').doc(notificationId).update({
                read: firebase.firestore.FieldValue.arrayUnion(userId)
            });
            return { success: true };
        } catch (error) {
            console.error('Mark notification read error:', error);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // ADVANCED ANALYTICS
    // ==========================================

    // Get comprehensive dashboard analytics
    async getAdvancedAnalytics(timeframe = 'month') {
        try {
            const now = new Date();
            const startDate = new Date();

            switch (timeframe) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'quarter':
                    startDate.setMonth(now.getMonth() - 3);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
            }

            // Fetch all data
            const [tasksSnap, eventsSnap, transactionsSnap, usersSnap] = await Promise.all([
                this.logsRef.get(),
                db.collection('events').get(),
                db.collection('transactions').get(),
                this.usersRef.get()
            ]);

            // Process tasks
            const tasks = tasksSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(log => log.type === 'task');

            const recentTasks = tasks.filter(task => {
                const taskDate = task.createdAt?.toDate?.() || new Date(0);
                return taskDate >= startDate;
            });

            // Process events
            const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const recentEvents = events.filter(event => {
                const eventDate = event.createdAt?.toDate?.() || new Date(0);
                return eventDate >= startDate;
            });

            // Process transactions
            const transactions = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const recentTransactions = transactions.filter(trans => {
                const transDate = trans.date?.toDate?.() || new Date(0);
                return transDate >= startDate;
            });

            // Calculate analytics
            const analytics = {
                timeframe,
                period: {
                    start: startDate,
                    end: now
                },
                tasks: {
                    total: recentTasks.length,
                    completed: recentTasks.filter(t => t.data?.status === 'completed').length,
                    inProgress: recentTasks.filter(t => t.data?.status === 'in-progress').length,
                    overdue: recentTasks.filter(t => {
                        const dueDate = t.data?.dueDate?.toDate?.();
                        return dueDate && dueDate < now && t.data?.status !== 'completed';
                    }).length
                },
                events: {
                    total: recentEvents.length,
                    upcoming: events.filter(e => e.status === 'upcoming').length,
                    active: events.filter(e => e.status === 'active').length,
                    completed: events.filter(e => e.status === 'completed').length
                },
                financial: {
                    totalIncome: recentTransactions
                        .filter(t => t.type === 'credit')
                        .reduce((sum, t) => sum + (t.amount || 0), 0),
                    totalExpenses: recentTransactions
                        .filter(t => t.type === 'debit')
                        .reduce((sum, t) => sum + (t.amount || 0), 0),
                    transactionCount: recentTransactions.length
                },
                team: {
                    totalMembers: usersSnap.docs.length,
                    activeMembers: usersSnap.docs.filter(doc => doc.data().isActive !== false).length,
                    newMembers: usersSnap.docs.filter(doc => {
                        const joinDate = doc.data().createdAt?.toDate?.() || new Date(0);
                        return joinDate >= startDate;
                    }).length
                },
                productivity: {
                    tasksPerMember: recentTasks.length / Math.max(usersSnap.docs.length, 1),
                    completionRate: recentTasks.length > 0 ?
                        (recentTasks.filter(t => t.data?.status === 'completed').length / recentTasks.length) * 100 : 0,
                    avgTasksPerDay: recentTasks.length / Math.max(Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)), 1)
                }
            };

            return analytics;
        } catch (error) {
            console.error('Advanced analytics error:', error);
            return null;
        }
    }

    async getLogs(type, limit = 20) {
        try {
            // Get all logs and filter client-side to avoid composite index
            const snap = await this.logsRef.get();
            let logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter by type if specified
            if (type) {
                logs = logs.filter(log => log.type === type);
            }

            // Sort by createdAt descending
            logs.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime - aTime;
            });

            return logs.slice(0, limit);
        } catch (error) {
            console.error('Get logs error:', error);
            return [];
        }
    }
}

const FirestoreInstance = new Database();
window.Firestore = FirestoreInstance;

