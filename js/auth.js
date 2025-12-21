// =============================================
// AUTH.JS - Complete Authentication System
// =============================================

const Auth = {
    currentUser: null,
    userData: null,

    // Initialize auth state listener
    init() {
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    await this.loadUserData(user);
                    resolve(this.userData);
                } else {
                    this.currentUser = null;
                    this.userData = null;
                    resolve(null);
                }
            });
        });
    },

    // Load user data from Firestore
    async loadUserData(user) {
        this.currentUser = user;

        try {
            const doc = await db.collection('users').doc(user.uid).get();

            if (doc.exists) {
                this.userData = { uid: user.uid, email: user.email, ...doc.data() };
            } else {
                // Create basic user record if doesn't exist
                const basicData = {
                    email: user.email,
                    name: user.email.split('@')[0],
                    roles: ['member'],
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                await db.collection('users').doc(user.uid).set(basicData);
                this.userData = { uid: user.uid, ...basicData };
            }

            // Admin Auto-Seeder
            if (user.email.toLowerCase().includes('leader@infixtech')) {
                console.log("👑 Leader detected - enforcing admin privileges");
                await db.collection('users').doc(user.uid).update({
                    roles: ['leader'],
                    name: this.userData.name || 'Team Leader'
                });
                this.userData.roles = ['leader'];
            }

            // Dispatch event for page scripts
            window.dispatchEvent(new CustomEvent('userDataLoaded', { detail: this.userData }));

        } catch (error) {
            console.error("Error loading user data:", error);
            this.userData = { uid: user.uid, email: user.email, roles: ['member'] };
        }
    },

    // Login
    async login(email, password) {
        try {
            const result = await firebase.auth().signInWithEmailAndPassword(email, password);
            await this.loadUserData(result.user);
            return { success: true, user: this.userData };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: error.message };
        }
    },

    // Logout
    async logout() {
        await firebase.auth().signOut();
        const prefix = Router.getPathPrefix();
        window.location.href = prefix + 'index.html';
    },

    // Get primary role
    getPrimaryRole(roles = []) {
        if (!roles || roles.length === 0) return 'member';
        const priority = ['leader', 'finance', 'tech', 'presenter', 'designer', 'member'];
        for (const role of priority) {
            if (roles.includes(role)) return role;
        }
        return roles[0] || 'member';
    },

    // Role checks
    isLeader() { return this.userData?.roles?.includes('leader'); },
    isFinance() { return this.isLeader() || this.userData?.roles?.includes('finance'); },

    // Get dashboard URL for role
    getDashboardUrl(role) {
        const validRoles = ['leader', 'finance', 'tech', 'presenter', 'designer', 'member'];
        const targetRole = validRoles.includes(role) ? role : 'member';
        return `pages/dashboard-${targetRole}.html`;
    }
};

window.Auth = Auth;
