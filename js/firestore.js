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
    // TASK LOGIC (Batch Assignment)
    // ==========================================

    async assignTask(taskData) {
        const batch = db.batch();
        const baseData = {
            type: 'task',
            data: {
                title: taskData.title,
                priority: taskData.priority,
                status: 'pending',
                dueDate: taskData.dueDate,
                description: taskData.description
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
                    data: { ...baseData.data, assignee: doc.id, assigneeName: doc.data().name }
                });
            });
        } else {
            const ref = this.logsRef.doc();
            batch.set(ref, {
                ...baseData,
                data: { ...baseData.data, assignee: taskData.assignee, assigneeName: taskData.assigneeName }
            });
        }

        await batch.commit();
        return { success: true };
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
    // GENERIC LOGS
    // ==========================================

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

