// =============================================
// COMPONENTS.JS - Reusable UI Components
// =============================================

const Modal = {
    currentModal: null,

    // Show a modal with custom content
    show(options) {
        const { title, content, onSubmit, submitText = 'Submit', cancelText = 'Cancel', size = 'medium' } = options;

        // Remove existing modal
        this.close();

        const sizes = { small: '400px', medium: '500px', large: '700px' };

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modalOverlay';
        overlay.innerHTML = `
            <div class="modal-container" style="max-width: ${sizes[size] || sizes.medium};">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="Modal.close()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Modal.close()">${cancelText}</button>
                    <button class="btn btn-primary" id="modalSubmit">${submitText}</button>
                </div>
            </div>
        `;

        // Add styles if not present
        if (!document.getElementById('modalStyles')) {
            const style = document.createElement('style');
            style.id = 'modalStyles';
            style.textContent = `
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 1rem;
                    animation: fadeIn 0.2s ease;
                }
                .modal-container {
                    background: rgba(30, 41, 59, 0.98);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    width: 100%;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    animation: slideUp 0.3s ease;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-title { font-size: 1.25rem; font-weight: 600; margin: 0; }
                .modal-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 1.5rem;
                    cursor: pointer;
                    line-height: 1;
                }
                .modal-close:hover { color: white; }
                .modal-body { padding: 1.5rem; }
                .modal-footer {
                    padding: 1rem 1.5rem;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        this.currentModal = overlay;

        // Handle submit
        document.getElementById('modalSubmit').addEventListener('click', () => {
            if (onSubmit) onSubmit();
        });

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Close on Escape
        document.addEventListener('keydown', this.handleEscape);
    },

    handleEscape(e) {
        if (e.key === 'Escape') Modal.close();
    },

    close() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
        document.removeEventListener('keydown', this.handleEscape);
    },

    // Convenience: Form Modal
    form(options) {
        const { title, fields, onSubmit } = options;

        const formHtml = fields.map(field => {
            const inputType = field.type || 'text';
            const required = field.required ? 'required' : '';

            if (inputType === 'select') {
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <select class="form-input" id="modal_${field.name}" ${required}>
                            ${field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                        </select>
                    </div>
                `;
            } else if (inputType === 'textarea') {
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <textarea class="form-input" id="modal_${field.name}" rows="3" placeholder="${field.placeholder || ''}" ${required}></textarea>
                    </div>
                `;
            } else {
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <input type="${inputType}" class="form-input" id="modal_${field.name}" placeholder="${field.placeholder || ''}" ${required}>
                    </div>
                `;
            }
        }).join('');

        this.show({
            title,
            content: `<form id="modalForm">${formHtml}</form>`,
            onSubmit: () => {
                const formData = {};
                fields.forEach(field => {
                    const el = document.getElementById(`modal_${field.name}`);
                    formData[field.name] = el ? el.value : '';
                });

                // Basic validation
                const valid = fields.every(field => {
                    if (field.required) {
                        return formData[field.name] && formData[field.name].trim();
                    }
                    return true;
                });

                if (!valid) {
                    Utils.showToast('Please fill all required fields', 'error');
                    return;
                }

                onSubmit(formData);
                this.close();
            }
        });
    },

    // Convenience: Confirm Dialog
    confirm(message, onConfirm) {
        this.show({
            title: 'Confirm',
            content: `<p style="text-align: center; padding: 1rem 0;">${message}</p>`,
            submitText: 'Yes, Confirm',
            onSubmit: () => {
                onConfirm();
                this.close();
            }
        });
    }
};

window.Modal = Modal;
