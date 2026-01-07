function app() {
    return {
        apiKey: localStorage.getItem('WA_GATEWAY_API_KEY') || '',
        inputApiKey: '',
        isAuthenticated: false,
        isLoading: false,
        sessions: [],
        templates: [],

        // Modal States
        qrModalOpen: false,
        currentQr: '',
        openCreateSessionModal: false,
        openCreateTemplateModal: false,
        openTestSendModal: false,

        // Forms
        newSessionId: '',
        newWebhookUrl: '',

        newTemplate: {
            name: '',
            content: '',
            category: '',
        },

        // Test Send
        selectedTemplate: null,
        testSendSessionId: '',
        testSendTo: '',
        testSendVariables: '{}',

        // QR Polling
        qrPollInterval: null,
        activeQrSessionId: null,

        // Message Log
        messageLog: [],
        logPollInterval: null,

        // Send Message
        openSendMessageModal: false,
        sendMsgSessionId: '',
        sendMsgTo: '',
        sendMsgText: '',

        async init() {
            if (this.apiKey) {
                this.isLoading = true;
                await this.fetchData();
                this.isLoading = false;

                // If fetchData didn't trigger logout (apiKey still exists), we are auth'd
                if (this.apiKey) {
                    this.isAuthenticated = true;
                    // Poll for status updates every 5 seconds
                    setInterval(() => {
                        if (this.apiKey && this.isAuthenticated)
                            this.fetchSessions();
                    }, 5000);

                    // Poll for message log every 3 seconds
                    this.fetchMessageLog();
                    setInterval(() => {
                        if (this.apiKey && this.isAuthenticated)
                            this.fetchMessageLog();
                    }, 3000);
                }
            }
        },

        async saveApiKey() {
            if (this.inputApiKey) {
                this.apiKey = this.inputApiKey;
                localStorage.setItem('WA_GATEWAY_API_KEY', this.apiKey);

                this.isLoading = true;
                await this.fetchData();
                this.isLoading = false;

                if (this.apiKey) {
                    this.isAuthenticated = true;
                    // Start polling logic duplicate? Maybe move to a startPolling method?
                    // For now, simple enough. The init interval covers it if we reload,
                    // but for SPA feel we might need to start it here or just let the user reload/wait.
                    // Actually, let's just rely on the user interacting or a reload for the interval,
                    // OR move the interval logic out.
                    // Let's add startPolling method to be clean.
                    this.startPolling();
                }
            }
        },

        startPolling() {
            setInterval(() => {
                if (this.apiKey && this.isAuthenticated) this.fetchSessions();
            }, 5000);
        },

        logout() {
            this.apiKey = '';
            this.isAuthenticated = false;
            localStorage.removeItem('WA_GATEWAY_API_KEY');
            this.sessions = [];
            this.templates = [];
            this.closeQRModal();
        },

        async apiCall(endpoint, method = 'GET', body = null) {
            const headers = {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
            };
            const config = { method, headers };
            if (body) config.body = JSON.stringify(body);

            try {
                const response = await fetch(`/api/v1${endpoint}`, config);

                // Read as text first to avoid JSON parse errors on HTML responses
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error(
                        'API Response was not JSON:',
                        text.substring(0, 200),
                    );
                    throw new Error(
                        `API returned invalid response (Status: ${response.status})`,
                    );
                }

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        this.logout();
                        throw new Error(
                            'Authentication failed. Please check your API Key.',
                        );
                    }
                    throw new Error(data.message || 'API Error');
                }

                return data;
            } catch (error) {
                console.error('API Call Failed:', error);
                // Don't alert on routine polling errors to avoid spamming the user
                if (
                    !endpoint.includes('/log') &&
                    !endpoint.includes('/sessions')
                ) {
                    alert('Error: ' + error.message);
                }
                return null;
            }
        },

        async fetchData() {
            await this.fetchSessions();
            await this.fetchTemplates();
        },

        async fetchSessions() {
            const data = await this.apiCall('/sessions');
            if (data && data.sessions) {
                this.sessions = data.sessions;
            }
        },

        async fetchTemplates() {
            const data = await this.apiCall('/templates');
            if (data && data.data && data.data.templates) {
                this.templates = data.data.templates;
            }
        },

        async createSession() {
            if (!this.newSessionId) return alert('Session ID required');
            const res = await this.apiCall('/sessions/start', 'POST', {
                sessionId: this.newSessionId,
                webhookUrl: this.newWebhookUrl,
            });
            if (res) {
                this.openCreateSessionModal = false;
                this.newSessionId = '';
                this.newWebhookUrl = '';
                this.fetchSessions();
                alert(
                    'Session created! Please wait for QR code or scan it via "View QR".',
                );
            }
        },

        async resumeSession(sessionId) {
            const res = await this.apiCall('/sessions/start', 'POST', {
                sessionId: sessionId,
            });
            if (res) {
                alert('Session starting...');
                this.fetchSessions();
            }
        },

        async stopSession(sessionId) {
            if (
                !confirm(
                    `Stop session ${sessionId}? This will disconnect WhatsApp but keep data.`,
                )
            )
                return;
            const res = await this.apiCall(
                `/sessions/${sessionId}/stop`,
                'POST',
            );
            if (res) {
                // alert('Session stopped'); // Optional, status update is better
                this.fetchSessions();
            }
        },

        async deleteSession(sessionId) {
            if (
                !confirm(
                    `Permanently delete session ${sessionId}? This will logout and remove all data.`,
                )
            )
                return;
            await this.apiCall(`/sessions/${sessionId}/logout`, 'POST');
            this.fetchSessions();
        },

        // QR Polling
        qrPollInterval: null,
        activeQrSessionId: null,

        async viewQR(sessionId) {
            this.activeQrSessionId = sessionId;
            await this.updateQR();

            // Start polling
            if (this.qrModalOpen) {
                this.qrPollInterval = setInterval(() => {
                    if (this.qrModalOpen && this.activeQrSessionId) {
                        this.updateQR();
                    } else {
                        this.closeQRModal();
                    }
                }, 3000); // Poll every 3 seconds
            }
        },

        async updateQR() {
            if (!this.activeQrSessionId) return;
            const res = await this.apiCall(
                `/sessions/${this.activeQrSessionId}/qr`,
            );

            if (res && res.qrImage) {
                this.currentQr = res.qrImage;
                this.qrModalOpen = true;
            } else if (res && res.qr) {
                // Fallback (though backend should return qrImage now)
                this.currentQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(res.qr)}`;
                this.qrModalOpen = true;
            } else if (res && res.status === 'CONNECTED') {
                this.closeQRModal();
                alert('Session connected!');
                this.fetchSessions();
            } else {
                // Session might be stopped or QR invalid
                // Keep modal open but maybe show status?
                // For now, if we can't get QR, maybe just close?
                // But wait, if it's expired/regenerating, we might get 404 or empty.
                // Let's retry unless it returned 'not_found' explicitly and stopped.
            }
        },

        closeQRModal() {
            this.qrModalOpen = false;
            if (this.qrPollInterval) {
                clearInterval(this.qrPollInterval);
                this.qrPollInterval = null;
            }
            this.activeQrSessionId = null;
        },

        async createTemplate() {
            if (!this.newTemplate.name || !this.newTemplate.content)
                return alert('Name and Content required');
            const res = await this.apiCall(
                '/templates',
                'POST',
                this.newTemplate,
            );
            if (res) {
                this.openCreateTemplateModal = false;
                this.newTemplate = { name: '', content: '', category: '' };
                this.fetchTemplates();
                alert('Template created');
            }
        },

        async deleteTemplate(name) {
            if (!confirm(`Delete template ${name}?`)) return;
            const res = await this.apiCall(`/templates/${name}`, 'DELETE');
            if (res) this.fetchTemplates();
        },

        testSendTemplate(template) {
            this.selectedTemplate = template;
            this.openTestSendModal = true;
            // Pre-fill variables based on parsing?
            // Simple regex to find {{key}}
            const matches = [...template.content.matchAll(/{{(.*?)}}/g)];
            const vars = {};
            matches.forEach((m) => (vars[m[1]] = ''));
            this.testSendVariables = JSON.stringify(vars, null, 2);
        },

        async executeTestSend() {
            if (!this.testSendSessionId || !this.testSendTo)
                return alert('Session and To number required');

            let variables = {};
            try {
                variables = JSON.parse(this.testSendVariables);
            } catch (e) {
                return alert('Invalid JSON variables');
            }

            const res = await this.apiCall(
                `/sessions/${this.testSendSessionId}/message/send/template`,
                'POST',
                {
                    to: this.testSendTo.includes('@')
                        ? this.testSendTo
                        : `${this.testSendTo}@s.whatsapp.net`,
                    templateName: this.selectedTemplate.name,
                    variables: variables,
                },
            );

            if (res) {
                this.openTestSendModal = false;
                alert(
                    `Message sent! ID: ${res.result?.messages?.[0]?.key?.id || 'Unknown'}`,
                );
            }
        },

        // Message Log
        async fetchMessageLog() {
            const data = await this.apiCall('/sessions/messages/log');
            if (data && data.messages) {
                this.messageLog = data.messages;
            }
        },

        // Send Message
        async sendMessage() {
            if (
                !this.sendMsgSessionId ||
                !this.sendMsgTo ||
                !this.sendMsgText
            ) {
                return alert(
                    'Session, recipient, and message text are required',
                );
            }

            const res = await this.apiCall(
                `/sessions/${this.sendMsgSessionId}/message/send/text`,
                'POST',
                {
                    to: this.sendMsgTo.includes('@')
                        ? this.sendMsgTo
                        : `${this.sendMsgTo}@s.whatsapp.net`,
                    message: this.sendMsgText,
                },
            );

            if (res) {
                this.openSendMessageModal = false;
                this.sendMsgText = '';
                alert('Message sent!');
                this.fetchMessageLog(); // Refresh log
            }
        },
    };
}
