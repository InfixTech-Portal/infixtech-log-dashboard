// =============================================
// REPORTS.JS - PDF Report Generator
// Requires jsPDF and jsPDF-AutoTable libraries
// =============================================

const Reports = {

    // Generate Activity Log Report
    async generateActivityReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = this.formatDate(date);

        Utils.showToast('Generating activity report...', 'info');

        // Header
        this.addHeader(doc, 'Activity Log Report', reportDate);
        let yPos = 50;

        // Fetch all logs
        const logsSnap = await db.collection('logs').get();
        const logs = logsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const aDate = a.createdAt?.toDate?.() || new Date(0);
                const bDate = b.createdAt?.toDate?.() || new Date(0);
                return bDate - aDate;
            });

        // Calculate stats
        const taskCount = logs.filter(l => l.type === 'task').length;
        const paymentCount = logs.filter(l => l.type === 'payment').length;
        const eventCount = logs.filter(l => l.type === 'event').length;

        // Summary Section
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Summary', 14, yPos);
        yPos += 8;

        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Count', 'Percentage']],
            body: [
                ['Total Logs', logs.length.toString(), '100%'],
                ['Tasks', taskCount.toString(), logs.length > 0 ? Math.round(taskCount / logs.length * 100) + '%' : '0%'],
                ['Payments', paymentCount.toString(), logs.length > 0 ? Math.round(paymentCount / logs.length * 100) + '%' : '0%'],
                ['Events', eventCount.toString(), logs.length > 0 ? Math.round(eventCount / logs.length * 100) + '%' : '0%']
            ],
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 40, halign: 'center' },
                2: { cellWidth: 40, halign: 'center' }
            },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 20;

        // Detailed Logs Section
        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Recent Activity Logs', 14, yPos);
        yPos += 8;

        const logRows = logs.slice(0, 50).map(log => {
            const dateStr = log.createdAt ? this.formatDate(log.createdAt) : '-';
            const type = (log.type || 'log').charAt(0).toUpperCase() + (log.type || 'log').slice(1);
            const title = log.data?.title || log.description || 'Activity Entry';
            const status = log.data?.status || 'recorded';
            return [dateStr, type, title.substring(0, 45), status];
        });

        if (logRows.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Date', 'Type', 'Description', 'Status']],
                body: logRows,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 28 }
                },
                margin: { left: 14, right: 14 },
                didDrawPage: () => this.addFooter(doc)
            });
        } else {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No activity logs found.', 14, yPos + 10);
        }

        this.addFooter(doc);
        doc.save('Activity_Report_' + date.toISOString().split('T')[0] + '.pdf');
        Utils.showToast('Activity report downloaded!', 'success');
    },

    // Generate Financial Report
    async generateFinancialReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = this.formatDate(date);

        Utils.showToast('Generating financial report...', 'info');

        // Header
        this.addHeader(doc, 'Financial Report', reportDate);
        let yPos = 50;

        // Fetch data
        const [transSnap, collectionsSnap] = await Promise.all([
            db.collection('transactions').get(),
            db.collection('moneyCollections').get()
        ]);

        const transactions = transSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const aDate = a.date?.toDate?.() || new Date(0);
                const bDate = b.date?.toDate?.() || new Date(0);
                return bDate - aDate;
            });

        const collections = collectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Calculate totals
        let totalCredits = 0, totalDebits = 0;
        transactions.forEach(t => {
            if (t.type === 'credit') totalCredits += (t.amount || 0);
            else totalDebits += (t.amount || 0);
        });

        let pendingCollections = 0, completedCollections = 0;
        collections.forEach(c => {
            (c.assignedMembers || []).forEach(m => {
                if (m.status === 'paid') completedCollections += (m.amount || 0);
                else pendingCollections += (m.amount || 0);
            });
        });

        const netBalance = totalCredits - totalDebits;

        // Financial Summary
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text('Financial Summary', 14, yPos);
        yPos += 8;

        doc.autoTable({
            startY: yPos,
            head: [['Description', 'Amount (Rs.)']],
            body: [
                ['Total Credits (Income)', totalCredits.toLocaleString('en-IN')],
                ['Total Debits (Expenses)', totalDebits.toLocaleString('en-IN')],
                ['Net Balance', netBalance.toLocaleString('en-IN')],
                ['Collected from Members', completedCollections.toLocaleString('en-IN')],
                ['Pending from Members', pendingCollections.toLocaleString('en-IN')]
            ],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 20;

        // Transaction History
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text('Transaction History', 14, yPos);
        yPos += 8;

        const transRows = transactions.slice(0, 50).map(t => {
            const dateStr = t.date ? this.formatDate(t.date) : '-';
            const type = t.type === 'credit' ? 'CREDIT' : 'DEBIT';
            const amount = 'Rs. ' + (t.amount || 0).toLocaleString('en-IN');
            return [dateStr, type, t.description || '-', t.category || '-', amount];
        });

        if (transRows.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
                body: transRows,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 28 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 28 },
                    4: { cellWidth: 32, halign: 'right' }
                },
                margin: { left: 14, right: 14 },
                didDrawPage: () => this.addFooter(doc)
            });
        } else {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No transactions found.', 14, yPos + 10);
        }

        this.addFooter(doc);
        doc.save('Financial_Report_' + date.toISOString().split('T')[0] + '.pdf');
        Utils.showToast('Financial report downloaded!', 'success');
    },

    // Generate Task Report
    async generateTaskReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = this.formatDate(date);

        Utils.showToast('Generating task report...', 'info');

        // Header
        this.addHeader(doc, 'Task Management Report', reportDate);
        let yPos = 50;

        // Fetch tasks
        const logsSnap = await db.collection('logs').get();
        const tasks = logsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(log => log.type === 'task')
            .sort((a, b) => {
                const aDate = a.createdAt?.toDate?.() || new Date(0);
                const bDate = b.createdAt?.toDate?.() || new Date(0);
                return bDate - aDate;
            });

        // Stats
        const completed = tasks.filter(t => t.data?.status === 'completed').length;
        const inProgress = tasks.filter(t => t.data?.status === 'in-progress').length;
        const pending = tasks.length - completed - inProgress;
        const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

        // Task Statistics
        doc.setFontSize(14);
        doc.setTextColor(245, 158, 11);
        doc.text('Task Statistics', 14, yPos);
        yPos += 8;

        doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
                ['Total Tasks', tasks.length.toString()],
                ['Completed', completed.toString()],
                ['In Progress', inProgress.toString()],
                ['Pending', pending.toString()],
                ['Completion Rate', completionRate + '%']
            ],
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 20;

        // Task List
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(245, 158, 11);
        doc.text('Task Details', 14, yPos);
        yPos += 8;

        const taskRows = tasks.slice(0, 50).map(t => {
            const dateStr = t.createdAt ? this.formatDate(t.createdAt) : '-';
            const title = (t.data?.title || 'Untitled').substring(0, 35);
            const assignee = t.data?.assigneeName || '-';
            const priority = (t.data?.priority || 'medium').toUpperCase();
            const status = (t.data?.status || 'pending').toUpperCase();
            return [dateStr, title, assignee, priority, status];
        });

        if (taskRows.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Date', 'Task Title', 'Assigned To', 'Priority', 'Status']],
                body: taskRows,
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 26 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 24 },
                    4: { cellWidth: 26 }
                },
                margin: { left: 14, right: 14 },
                didDrawPage: () => this.addFooter(doc)
            });
        } else {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No tasks found.', 14, yPos + 10);
        }

        this.addFooter(doc);
        doc.save('Task_Report_' + date.toISOString().split('T')[0] + '.pdf');
        Utils.showToast('Task report downloaded!', 'success');
    },

    // Generate Member Report
    async generateMemberReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = this.formatDate(date);

        Utils.showToast('Generating member report...', 'info');

        // Header
        this.addHeader(doc, 'Team Members Report', reportDate);
        let yPos = 50;

        // Fetch members
        const usersSnap = await db.collection('users').get();
        const members = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Stats
        const activeMembers = members.filter(m => m.isActive !== false).length;
        const leaders = members.filter(m => m.roles?.includes('leader')).length;
        const finance = members.filter(m => m.roles?.includes('finance')).length;

        // Member Statistics
        doc.setFontSize(14);
        doc.setTextColor(139, 92, 246);
        doc.text('Team Statistics', 14, yPos);
        yPos += 8;

        doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
                ['Total Members', members.length.toString()],
                ['Active Members', activeMembers.toString()],
                ['Inactive Members', (members.length - activeMembers).toString()],
                ['Leaders', leaders.toString()],
                ['Finance Team', finance.toString()]
            ],
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 20;

        // Member Directory
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(139, 92, 246);
        doc.text('Member Directory', 14, yPos);
        yPos += 8;

        const memberRows = members.map((m, i) => {
            const name = m.name || 'N/A';
            const email = m.email || '-';
            const phone = m.phone || '-';
            const roles = (m.roles || ['member']).join(', ');
            const status = m.isActive !== false ? 'Active' : 'Inactive';
            return [(i + 1).toString(), name, email, roles, status];
        });

        if (memberRows.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['#', 'Name', 'Email', 'Roles', 'Status']],
                body: memberRows,
                theme: 'striped',
                headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'center' },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 22 }
                },
                margin: { left: 14, right: 14 },
                didDrawPage: () => this.addFooter(doc)
            });
        } else {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No members found.', 14, yPos + 10);
        }

        this.addFooter(doc);
        doc.save('Team_Members_Report_' + date.toISOString().split('T')[0] + '.pdf');
        Utils.showToast('Member report downloaded!', 'success');
    },

    // =============================================
    // HELPER FUNCTIONS
    // =============================================

    // Add header to PDF
    addHeader(doc, title, dateStr) {
        // Brand bar at top
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 220, 8, 'F');

        // Brand name
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text('INFI X TECH', 14, 22);

        // Report title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title, 14, 32);

        // Date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Generated: ' + dateStr, 14, 40);

        // Divider line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 44, 196, 44);
    },

    // Add footer to PDF
    addFooter(doc) {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

        // Footer line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        // Footer text
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);

        doc.text('Generated by INFI X TECH Log Portal', 14, pageHeight - 8);
        doc.text('Page ' + currentPage + ' of ' + pageCount, pageWidth - 30, pageHeight - 8);
    },

    // Format date
    formatDate(date) {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // Legacy method
    async generateMonthlyReport() {
        await this.generateActivityReport();
    }
};

window.Reports = Reports;
