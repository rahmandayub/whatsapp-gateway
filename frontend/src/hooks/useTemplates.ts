import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import type { Template } from '../types/api';

export function useTemplates(enabled: boolean) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const apiCall = useApi();

  const fetchTemplates = useCallback(async () => {
    const data = await apiCall('/templates');
    if (data?.data?.templates) {
      setTemplates(data.data.templates);
    }
  }, [apiCall]);

  // Initial fetch only; no polling for templates
  const initFetch = useCallback(async () => {
    if (enabled) await fetchTemplates();
  }, [enabled, fetchTemplates]);

  const createTemplate = useCallback(
    async (template: { name: string; content: string; category?: string }) => {
      return apiCall('/templates', 'POST', template);
    },
    [apiCall]
  );

  const deleteTemplate = useCallback(
    async (name: string) => {
      return apiCall(`/templates/${name}`, 'DELETE');
    },
    [apiCall]
  );

  const sendTemplate = useCallback(
    async (sessionId: string, to: string, templateName: string, variables: Record<string, string>) => {
      return apiCall(`/sessions/${sessionId}/message/send/template`, 'POST', {
        to,
        templateName,
        variables,
      });
    },
    [apiCall]
  );

  return {
    templates,
    fetchTemplates: initFetch,
    refetchTemplates: fetchTemplates,
    createTemplate,
    deleteTemplate,
    sendTemplate,
  };
}
