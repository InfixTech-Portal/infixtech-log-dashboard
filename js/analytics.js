// =============================================
// ANALYTICS.JS - Advanced Analytics & Insights
// =============================================

const Analytics = {
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 minutes

    // Get cached data or fetch new
    async getCachedData(key, fetchFunction) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const data = await fetchFunction();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    },

    // Get comprehensive team analytics
    async getTeamAnalytics(timeframe = 'month') {
        return await this.getCachedData(`team-analytics-${timeframe}`, async () => {
            try {
                const analytics = await Firestore.getAdvancedAnalytics(timeframe);
                return this.processTeamAnalytics(analytics);
            } catch (error) {
                console.error('Error fetching team analytics:', error);
                return null;
            }
        });
    },

    // Process and enhance analytics data
    processTeamAnalytics(rawAnalytics) {
        if (!rawAnalytics) return null;

        const processed = {
            ...rawAnalytics,
            insights: this.generateInsights(rawAnalytics),
            trends: this.calculateTrends(rawAnalytics),
            recommendations: this.generateRecommendations(rawAnalytics)
        };

        return processed;
    },

    // Generate insights from analytics data
    generateInsights(analytics) {
        const insights = [];

        // Task completion insights
        if (analytics.tasks.total > 0) {
            const completionRate = (analytics.tasks.completed / analytics.tasks.total) * 100;
            if (completionRate > 80) {
                insights.push({
                    type: 'success',
                    icon: '🎉',
                    title: 'Excellent Task Completion',
                    message: `Team has ${completionRate.toFixed(1)}% task completion rate`
                });
            } else if (completionRate < 50) {
                insights.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Low Task Completion',
                    message: `Only ${completionRate.toFixed(1)}% of tasks completed`
                });
            }
        }

        // Overdue tasks insight
        if (analytics.tasks.overdue > 0) {
            insights.push({
                type: 'error',
                icon: '🚨',
                title: 'Overdue Tasks Alert',
                message: `${analytics.tasks.overdue} tasks are overdue and need attention`
            });
        }

        // Financial insights
        if (analytics.financial.totalIncome > analytics.financial.totalExpenses) {
            const profit = analytics.financial.totalIncome - analytics.financial.totalExpenses;
            insights.push({
                type: 'success',
                icon: '💰',
                title: 'Positive Cash Flow',
                message: `Net positive of ${Utils.formatCurrency(profit)} this ${analytics.timeframe}`
            });
        }

        // Team growth insight
        if (analytics.team.newMembers > 0) {
            insights.push({
                type: 'info',
                icon: '👥',
                title: 'Team Growth',
                message: `${analytics.team.newMembers} new members joined this ${analytics.timeframe}`
            });
        }

        // Productivity insight
        if (analytics.productivity.completionRate > 75) {
            insights.push({
                type: 'success',
                icon: '⚡',
                title: 'High Productivity',
                message: `Team productivity is at ${analytics.productivity.completionRate.toFixed(1)}%`
            });
        }

        return insights;
    },

    // Calculate trends (would need historical data in real implementation)
    calculateTrends(analytics) {
        // Placeholder for trend calculations
        // In a real implementation, you'd compare with previous periods
        return {
            tasks: {
                completion: { value: analytics.productivity.completionRate, trend: 'up', change: 5.2 },
                creation: { value: analytics.tasks.total, trend: 'up', change: 12.3 }
            },
            financial: {
                income: { value: analytics.financial.totalIncome, trend: 'up', change: 8.7 },
                expenses: { value: analytics.financial.totalExpenses, trend: 'down', change: -3.2 }
            },
            team: {
                activity: { value: analytics.team.activeMembers, trend: 'stable', change: 0 },
                growth: { value: analytics.team.newMembers, trend: 'up', change: 15.0 }
            }
        };
    },

    // Generate actionable recommendations
    generateRecommendations(analytics) {
        const recommendations = [];

        // Task management recommendations
        if (analytics.tasks.overdue > 0) {
            recommendations.push({
                priority: 'high',
                category: 'tasks',
                title: 'Address Overdue Tasks',
                description: 'Review and reassign overdue tasks to prevent project delays',
                action: 'View Overdue Tasks',
                url: 'pages/logs/task-logs.html?filter=overdue'
            });
        }

        if (analytics.productivity.completionRate < 60) {
            recommendations.push({
                priority: 'medium',
                category: 'productivity',
                title: 'Improve Task Completion',
                description: 'Consider breaking down large tasks or providing additional support',
                action: 'Review Task Distribution',
                url: 'pages/logs/task-logs.html'
            });
        }

        // Financial recommendations
        if (analytics.financial.totalExpenses > analytics.financial.totalIncome) {
            recommendations.push({
                priority: 'high',
                category: 'financial',
                title: 'Review Expenses',
                description: 'Expenses exceed income. Review and optimize spending',
                action: 'View Financial Report',
                url: 'pages/logs/payment-logs.html'
            });
        }

        // Event recommendations
        if (analytics.events.upcoming === 0) {
            recommendations.push({
                priority: 'low',
                category: 'events',
                title: 'Plan Upcoming Events',
                description: 'No upcoming events scheduled. Consider planning team activities',
                action: 'Create Event',
                url: 'pages/logs/event-logs.html'
            });
        }

        return recommendations;
    },

    // Get individual member analytics
    async getMemberAnalytics(memberId) {
        return await this.getCachedData(`member-analytics-${memberId}`, async () => {
            try {
                // Fetch member-specific data
                const [tasksSnap, transactionsSnap] = await Promise.all([
                    db.collection('logs').get(),
                    db.collection('transactions').get()
                ]);

                const memberTasks = tasksSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(log => log.type === 'task' && log.data?.assignee === memberId);

                const memberTransactions = transactionsSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(trans => trans.memberId === memberId);

                return this.processMemberAnalytics(memberTasks, memberTransactions);
            } catch (error) {
                console.error('Error fetching member analytics:', error);
                return null;
            }
        });
    },

    // Process member-specific analytics
    processMemberAnalytics(tasks, transactions) {
        const completed = tasks.filter(t => t.data?.status === 'completed');
        const pending = tasks.filter(t => t.data?.status !== 'completed');
        const overdue = tasks.filter(t => {
            const dueDate = t.data?.dueDate?.toDate?.();
            return dueDate && dueDate < new Date() && t.data?.status !== 'completed';
        });

        const totalPaid = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalOwed = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
            tasks: {
                total: tasks.length,
                completed: completed.length,
                pending: pending.length,
                overdue: overdue.length,
                completionRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0
            },
            financial: {
                totalPaid,
                totalOwed,
                balance: totalPaid - totalOwed
            },
            performance: {
                avgCompletionTime: this.calculateAvgCompletionTime(completed),
                productivity: this.calculateProductivityScore(tasks),
                reliability: this.calculateReliabilityScore(tasks)
            }
        };
    },

    // Calculate average task completion time
    calculateAvgCompletionTime(completedTasks) {
        if (completedTasks.length === 0) return 0;

        const totalDays = completedTasks.reduce((sum, task) => {
            if (!task.createdAt || !task.data?.completedAt) return sum;
            
            const created = task.createdAt.toDate();
            const completed = task.data.completedAt.toDate();
            const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0);

        return Math.round(totalDays / completedTasks.length);
    },

    // Calculate productivity score (0-100)
    calculateProductivityScore(tasks) {
        if (tasks.length === 0) return 0;

        const completed = tasks.filter(t => t.data?.status === 'completed').length;
        const overdue = tasks.filter(t => {
            const dueDate = t.data?.dueDate?.toDate?.();
            return dueDate && dueDate < new Date() && t.data?.status !== 'completed';
        }).length;

        const completionScore = (completed / tasks.length) * 70; // 70% weight
        const timelinessScore = Math.max(0, (tasks.length - overdue) / tasks.length) * 30; // 30% weight

        return Math.round(completionScore + timelinessScore);
    },

    // Calculate reliability score (0-100)
    calculateReliabilityScore(tasks) {
        if (tasks.length === 0) return 100;

        const onTime = tasks.filter(t => {
            if (t.data?.status !== 'completed' || !t.data?.dueDate || !t.data?.completedAt) return true;
            
            const dueDate = t.data.dueDate.toDate();
            const completedDate = t.data.completedAt.toDate();
            return completedDate <= dueDate;
        }).length;

        return Math.round((onTime / tasks.length) * 100);
    },

    // Generate performance report
    async generatePerformanceReport(timeframe = 'month') {
        const analytics = await this.getTeamAnalytics(timeframe);
        if (!analytics) return null;

        return {
            summary: {
                period: analytics.period,
                totalTasks: analytics.tasks.total,
                completionRate: analytics.productivity.completionRate,
                teamSize: analytics.team.totalMembers,
                activeMembers: analytics.team.activeMembers
            },
            highlights: analytics.insights.filter(i => i.type === 'success'),
            concerns: analytics.insights.filter(i => i.type === 'warning' || i.type === 'error'),
            recommendations: analytics.recommendations.slice(0, 5),
            trends: analytics.trends,
            financial: {
                income: analytics.financial.totalIncome,
                expenses: analytics.financial.totalExpenses,
                balance: analytics.financial.totalIncome - analytics.financial.totalExpenses
            }
        };
    },

    // Render analytics dashboard
    renderAnalyticsDashboard(containerId, analytics) {
        const container = document.getElementById(containerId);
        if (!container || !analytics) return;

        container.innerHTML = `
            <div class="analytics-dashboard">
                <!-- Key Metrics -->
                <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div class="metric-card">
                        <div class="metric-value">${analytics.tasks.total}</div>
                        <div class="metric-label">Total Tasks</div>
                        <div class="metric-trend ${analytics.trends.tasks.creation.trend}">
                            ${analytics.trends.tasks.creation.change > 0 ? '↗' : analytics.trends.tasks.creation.change < 0 ? '↘' : '→'} 
                            ${Math.abs(analytics.trends.tasks.creation.change)}%
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${analytics.productivity.completionRate.toFixed(1)}%</div>
                        <div class="metric-label">Completion Rate</div>
                        <div class="metric-trend ${analytics.trends.tasks.completion.trend}">
                            ${analytics.trends.tasks.completion.change > 0 ? '↗' : analytics.trends.tasks.completion.change < 0 ? '↘' : '→'} 
                            ${Math.abs(analytics.trends.tasks.completion.change)}%
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${analytics.team.activeMembers}</div>
                        <div class="metric-label">Active Members</div>
                        <div class="metric-trend ${analytics.trends.team.activity.trend}">
                            ${analytics.trends.team.activity.change > 0 ? '↗' : analytics.trends.team.activity.change < 0 ? '↘' : '→'} 
                            ${Math.abs(analytics.trends.team.activity.change)}%
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${Utils.formatCurrency(analytics.financial.totalIncome - analytics.financial.totalExpenses)}</div>
                        <div class="metric-label">Net Balance</div>
                        <div class="metric-trend ${analytics.financial.totalIncome > analytics.financial.totalExpenses ? 'up' : 'down'}">
                            ${analytics.financial.totalIncome > analytics.financial.totalExpenses ? '↗' : '↘'} 
                            ${((Math.abs(analytics.financial.totalIncome - analytics.financial.totalExpenses) / Math.max(analytics.financial.totalIncome, 1)) * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>

                <!-- Insights -->
                ${analytics.insights.length > 0 ? `
                    <div class="insights-section" style="margin-bottom: 2rem;">
                        <h3 style="margin-bottom: 1rem;">📊 Key Insights</h3>
                        <div style="display: grid; gap: 0.75rem;">
                            ${analytics.insights.map(insight => `
                                <div class="insight-card insight-${insight.type}" style="padding: 1rem; border-radius: 8px; border-left: 4px solid var(--${this.getInsightColor(insight.type)});">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="font-size: 1.5rem;">${insight.icon}</span>
                                        <div>
                                            <div style="font-weight: 600;">${insight.title}</div>
                                            <div class="text-muted text-sm">${insight.message}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Recommendations -->
                ${analytics.recommendations.length > 0 ? `
                    <div class="recommendations-section">
                        <h3 style="margin-bottom: 1rem;">💡 Recommendations</h3>
                        <div style="display: grid; gap: 0.75rem;">
                            ${analytics.recommendations.map(rec => `
                                <div class="recommendation-card" style="padding: 1rem; background: var(--bg-glass); border-radius: 8px; border-left: 4px solid var(--${this.getPriorityColor(rec.priority)});">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; margin-bottom: 0.25rem;">${rec.title}</div>
                                            <div class="text-muted text-sm" style="margin-bottom: 0.5rem;">${rec.description}</div>
                                            <span class="priority-badge priority-${rec.priority}">${rec.priority} priority</span>
                                        </div>
                                        <button class="btn btn-primary btn-sm" onclick="window.location.href='${rec.url}'">${rec.action}</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        this.addAnalyticsStyles();
    },

    // Get insight color based on type
    getInsightColor(type) {
        const colors = {
            success: 'success-500',
            warning: 'warning-500',
            error: 'danger-500',
            info: 'info-500'
        };
        return colors[type] || 'primary-500';
    },

    // Get priority color
    getPriorityColor(priority) {
        const colors = {
            high: 'danger-500',
            medium: 'warning-500',
            low: 'success-500'
        };
        return colors[priority] || 'primary-500';
    },

    // Add analytics-specific styles
    addAnalyticsStyles() {
        if (document.getElementById('analyticsStyles')) return;

        const style = document.createElement('style');
        style.id = 'analyticsStyles';
        style.textContent = `
            .metric-card {
                background: var(--bg-glass);
                border: 1px solid var(--bg-glass-border);
                border-radius: 12px;
                padding: 1.5rem;
                text-align: center;
                transition: transform 0.2s ease;
            }
            
            .metric-card:hover {
                transform: translateY(-2px);
            }
            
            .metric-value {
                font-size: 2rem;
                font-weight: 700;
                color: var(--primary-500);
                margin-bottom: 0.5rem;
            }
            
            .metric-label {
                color: var(--text-muted);
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }
            
            .metric-trend {
                font-size: 0.8rem;
                font-weight: 600;
            }
            
            .metric-trend.up {
                color: var(--success-500);
            }
            
            .metric-trend.down {
                color: var(--danger-500);
            }
            
            .metric-trend.stable {
                color: var(--text-muted);
            }
            
            .insight-card {
                background: rgba(255, 255, 255, 0.02);
            }
            
            .insight-success {
                background: rgba(16, 185, 129, 0.1);
            }
            
            .insight-warning {
                background: rgba(245, 158, 11, 0.1);
            }
            
            .insight-error {
                background: rgba(239, 68, 68, 0.1);
            }
            
            .insight-info {
                background: rgba(59, 130, 246, 0.1);
            }
        `;
        document.head.appendChild(style);
    },

    // Clear cache
    clearCache() {
        this.cache.clear();
    }
};

window.Analytics = Analytics;