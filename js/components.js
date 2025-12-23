// =============================================
// COMPONENTS.JS - Reusable UI Components
// =============================================

const Modal = {
    currentModal: null,

    show(options) {
        const { title, content, onSubmit, submitText = 'Submit', cancelText = 'Cancel', size = 'medium' } = options;

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
                    ${cancelText ? `<button class="btn btn-secondary" onclick="Modal.close()">${cancelText}</button>` : ''}
                    <button class="btn btn-primary" id="modalSubmit">${submitText}</button>
                </div>
            </div>
        `;

        if (!document.getElementById('modalStyles')) {
            const style = document.createElement('style');
            style.id = 'modalStyles';
            style.textContent = `
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 1rem;
                    animation: modalFadeIn 0.25s ease-out;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .modal-container {
                    background: linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 20px;
                    width: 100%;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6);
                    animation: modalSlideUp 0.35s ease;
                }
                @keyframes modalSlideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .modal-header {
                    padding: 1.5rem 1.75rem;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-title { 
                    font-size: 1.35rem; 
                    font-weight: 700; 
                    margin: 0;
                    color: white;
                }
                .modal-close {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 1.5rem;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-close:hover { 
                    background: rgba(239, 68, 68, 0.3);
                    color: #fca5a5;
                }
                .modal-body { 
                    padding: 1.75rem;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                .modal-footer {
                    padding: 1.25rem 1.75rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.875rem;
                }
                @media (max-width: 768px) {
                    .modal-overlay {
                        padding: 0.5rem;
                        align-items: flex-end;
                    }
                    .modal-container {
                        border-radius: 20px 20px 0 0;
                    }
                    .modal-footer {
                        flex-direction: column;
                    }
                    .modal-footer .btn {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        this.currentModal = overlay;

        document.getElementById('modalSubmit').addEventListener('click', () => {
            if (onSubmit) onSubmit();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

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
