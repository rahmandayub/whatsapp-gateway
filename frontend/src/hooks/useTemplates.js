import { useState, useCallback } from 'react';
import { useApi } from './useApi';
export function useTemplates(enabled) {
    const [templates, setTemplates] = useState([]);
    const apiCall = useApi();
    const fetchTemplates = useCallback(async () => {
        const data = await apiCall('/templates');
        if (data?.data?.templates) {
            setTemplates(data.data.templates);
        }
    }, [apiCall]);
    // Initial fetch only; no polling for templates
    const initFetch = useCallback(async () => {
        if (enabled)
            await fetchTemplates();
    }, [enabled, fetchTemplates]);
    const createTemplate = useCallback(async (template) => {
        return apiCall('/templates', 'POST', template);
    }, [apiCall]);
    const deleteTemplate = useCallback(async (name) => {
        return apiCall(`/templates/${name}`, 'DELETE');
    }, [apiCall]);
    const sendTemplate = useCallback(async (sessionId, to, templateName, variables) => {
        return apiCall(`/sessions/${sessionId}/message/send/template`, 'POST', {
            to,
            templateName,
            variables,
        });
    }, [apiCall]);
    return {
        templates,
        fetchTemplates: initFetch,
        refetchTemplates: fetchTemplates,
        createTemplate,
        deleteTemplate,
        sendTemplate,
    };
}
