
import api from '@/lib/api';

export interface Session {
  sessionId: string;
  whatsappId?: string;
  status: 'CONNECTED' | 'SCANNING_QR' | 'CONNECTING' | 'STOPPED' | 'DISCONNECTED';
}

export interface Message {
  id: string;
  sessionId: string;
  from?: string;
  to?: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
}

export interface Template {
  name: string;
  content: string;
  category: string;
}

export const sessionService = {
  getAll: async () => {
    const res = await api.get<{ sessions: Session[] }>('/sessions');
    return res.data.sessions;
  },
  create: async (sessionId: string, webhookUrl?: string) => {
    return api.post('/sessions/start', { sessionId, webhookUrl });
  },
  start: async (sessionId: string) => {
    return api.post('/sessions/start', { sessionId });
  },
  stop: async (sessionId: string) => {
    return api.post(`/sessions/${sessionId}/stop`);
  },
  delete: async (sessionId: string) => {
    return api.post(`/sessions/${sessionId}/logout`);
  },
  getQR: async (sessionId: string) => {
    return api.get(`/sessions/${sessionId}/qr`);
  },
  getMessageLog: async () => {
    const res = await api.get<{ messages: Message[] }>('/sessions/messages/log');
    return res.data.messages;
  },
  sendMessage: async (sessionId: string, to: string, message: string) => {
    return api.post(`/sessions/${sessionId}/message/send/text`, {
        to: to.includes('@') ? to : `${to}@s.whatsapp.net`,
        message
    });
  },
  sendFile: async (sessionId: string, to: string, formData: FormData) => {
    // Override content type for FormData
    return api.post(`/sessions/${sessionId}/message/send/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  sendTemplate: async (sessionId: string, to: string, templateName: string, variables: Record<string, string>) => {
      return api.post(`/sessions/${sessionId}/message/send/template`, {
          to: to.includes('@') ? to : `${to}@s.whatsapp.net`,
          templateName,
          variables
      });
  }
};

export const templateService = {
  getAll: async () => {
    const res = await api.get<{ data: { templates: Template[] } }>('/templates');
    return res.data.data.templates;
  },
  create: async (template: Template) => {
    return api.post('/templates', template);
  },
  delete: async (name: string) => {
    return api.delete(`/templates/${name}`);
  }
};
