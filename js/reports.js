// Comprehensive PDF Report Generator
// Requires jsPDF and jsPDF-AutoTable libraries (loaded in HTML)

const Reports = {
    // Generate a complete activity report
    async generateActivityReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = Utils.formatDate(date);

        // Header
        this.addHeader(doc, 'Activity Log Report', reportDate);
        let yPos = 45;

        // Fetch all logs
        Utils.showToast('Generating report...', 'info');
        const logsSnap = await db.collection('logs').get();
        const logs = logsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const aDate = a.createdAt?.toDate?.() || new Date(0);
                const bDate = b.createdAt?.toDate?.() || new Date(0);
                return bDate - aDate;
            });

        // Summary Section
        const taskCount = logs.filter(l => l.type === 'task').length;
        const paymentCount = logs.filter(l => l.type === 'payment').length;
        const eventCount = logs.filter(l => l.type === 'event').length;

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Summary', 14, yPos);
        yPos += 5;

        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Count']],
            body: [
                ['Total Logs', logs.length],
                ['Tasks', taskCount],
                ['Payments', paymentCount],
                ['Events', eventCount]
            ],
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Detailed Logs Section
        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Recent Activity Logs', 14, yPos);
        yPos += 5;

        const logRows = logs.slice(0, 50).map(log => {
            const dateStr = log.createdAt ? Utils.formatDate(log.createdAt) : '-';
            const title = log.data?.title || log.type || 'Log Entry';
            const status = log.data?.status || '-';
            return [dateStr, log.type || '-', title, status];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Date', 'Type', 'Title', 'Status']],
            body: logRows,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 25 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 25 }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                this.addFooter(doc);
            }
        });

        this.addFooter(doc);
        doc.save(`Activity_Report_${date.toISOString().split('T')[0]}.pdf`);
        Utils.showToast('Activity report downloaded!', 'success');
    },

    // Generate financial report
    async generateFinancialReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = Utils.formatDate(date);

        // Header
        this.addHeader(doc, 'Financial Report', reportDate);
        let yPos = 45;

        Utils.showToast('Generating financial report...', 'info');

        // Fetch transactions
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
            c.assignedMembers?.forEach(m => {
                if (m.status === 'paid') completedCollections += (m.amount || 0);
                else pendingCollections += (m.amount || 0);
            });
        });

        // Financial Summary
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Financial Summary', 14, yPos);
        yPos += 5;

        doc.autoTable({
            startY: yPos,
            head: [['Description', 'Amount']],
            body: [
                ['Total Credits (Income)', 'Rs. ' + totalCredits.toLocaleString('en-IN')],
                ['Total Debits (Expenses)', 'Rs. ' + totalDebits.toLocaleString('en-IN')],
                ['Net Balance', 'Rs. ' + (totalCredits - totalDebits).toLocaleString('en-IN')],
                ['Collected from Members', 'Rs. ' + completedCollections.toLocaleString('en-IN')],
                ['Pending from Members', 'Rs. ' + pendingCollections.toLocaleString('en-IN')]
            ],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 10 },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Transactions Table
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Transaction History', 14, yPos);
        yPos += 5;

        const transRows = transactions.slice(0, 50).map(t => {
            const dateStr = t.date ? Utils.formatDate(t.date) : '-';
            const amount = t.type === 'credit'
                ? '+Rs. ' + (t.amount || 0).toLocaleString('en-IN')
                : '-Rs. ' + (t.amount || 0).toLocaleString('en-IN');
            return [dateStr, t.type?.toUpperCase() || '-', t.description || '-', t.category || '-', amount];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
            body: transRows,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 28 },
                1: { cellWidth: 18 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 25 },
                4: { cellWidth: 30, halign: 'right' }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                this.addFooter(doc);
            }
        });

        this.addFooter(doc);
        doc.save(`Financial_Report_${date.toISOString().split('T')[0]}.pdf`);
        Utils.showToast('Financial report downloaded!', 'success');
    },

    // Generate task report
    async generateTaskReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = Utils.formatDate(date);

        // Header
        this.addHeader(doc, 'Task Management Report', reportDate);
        let yPos = 45;

        Utils.showToast('Generating task report...', 'info');

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

        // Task Statistics
        const completed = tasks.filter(t => t.data?.status === 'completed').length;
        const pending = tasks.filter(t => t.data?.status !== 'completed').length;

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Task Statistics', 14, yPos);
        yPos += 5;

        doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
                ['Total Tasks', tasks.length],
                ['Completed', completed],
                ['Pending', pending],
                ['Completion Rate', tasks.length > 0 ? Math.round((completed / tasks.length) * 100) + '%' : 'N/A']
            ],
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 10 },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Task List
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Task Details', 14, yPos);
        yPos += 5;

        const taskRows = tasks.slice(0, 50).map(t => {
            const dateStr = t.createdAt ? Utils.formatDate(t.createdAt) : '-';
            return [
                dateStr,
                t.data?.title || 'Untitled',
                t.data?.assigneeName || '-',
                t.data?.priority || 'medium',
                t.data?.status || 'pending'
            ];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Date', 'Task Title', 'Assigned To', 'Priority', 'Status']],
            body: taskRows,
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 28 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 35 },
                3: { cellWidth: 22 },
                4: { cellWidth: 22 }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                this.addFooter(doc);
            }
        });

        this.addFooter(doc);
        doc.save(`Task_Report_${date.toISOString().split('T')[0]}.pdf`);
        Utils.showToast('Task report downloaded!', 'success');
    },

    // Generate member report
    async generateMemberReport() {
        if (!window.jspdf?.jsPDF) {
            Utils.showToast('PDF library not loaded. Please refresh and try again.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date();
        const reportDate = Utils.formatDate(date);

        // Header
        this.addHeader(doc, 'Team Members Report', reportDate);
        let yPos = 45;

        Utils.showToast('Generating member report...', 'info');

        // Fetch members
        const usersSnap = await db.collection('users').get();
        const members = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Member Statistics
        const activeMembers = members.filter(m => m.isActive !== false).length;
        const leaders = members.filter(m => m.roles?.includes('leader')).length;

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Team Statistics', 14, yPos);
        yPos += 5;

        doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
                ['Total Members', members.length],
                ['Active Members', activeMembers],
                ['Leaders', leaders]
            ],
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] },
            styles: { fontSize: 10 },
            margin: { left: 14, right: 14 }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Member List
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Member Directory', 14, yPos);
        yPos += 5;

        const memberRows = members.map(m => {
            return [
                m.name || 'N/A',
                m.email || '-',
                (m.roles || ['member']).join(', '),
                m.isActive !== false ? 'Active' : 'Inactive'
            ];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Name', 'Email', 'Roles', 'Status']],
            body: memberRows,
            theme: 'striped',
            headStyles: { fillColor: [139, 92, 246] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 45 },
                3: { cellWidth: 22 }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                this.addFooter(doc);
            }
        });

        this.addFooter(doc);
        doc.save(`Team_Members_Report_${date.toISOString().split('T')[0]}.pdf`);
        Utils.showToast('Member report downloaded!', 'success');
    },

    // Helper: Add header to PDF
    addHeader(doc, title, dateStr) {
        // Brand
        doc.setFontSize(22);
        doc.setTextColor(99, 102, 241);
        doc.text('INFI X TECH', 14, 18);

        // Title
        doc.setFontSize(16);
        doc.setTextColor(50, 50, 50);
        doc.text(title, 14, 28);

        // Date
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated: ${dateStr}`, 14, 36);

        // Divider line
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.5);
        doc.line(14, 40, 196, 40);
    },

    // Helper: Add footer to PDF
    addFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
            'Generated by INFI X TECH Log Portal',
            14,
            doc.internal.pageSize.height - 10
        );
        doc.text(
            `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
        );
    },

    // Legacy method for backward compatibility
    async generateMonthlyReport() {
        await this.generateActivityReport();
    }
};

window.Reports = Reports;
