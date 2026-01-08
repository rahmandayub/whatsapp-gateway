
"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import SessionsList from "@/components/dashboard/SessionsList";
import MessageLog from "@/components/dashboard/MessageLog";
import TemplatesList from "@/components/dashboard/TemplatesList";
import {
  sessionService,
  templateService,
  Session,
  Message,
  Template,
} from "@/services/api";
import CreateSessionModal from "@/components/modals/CreateSessionModal";
import QrModal from "@/components/modals/QrModal";
import CreateTemplateModal from "@/components/modals/CreateTemplateModal";
import SendMessageModal from "@/components/modals/SendMessageModal";
import TestSendModal from "@/components/modals/TestSendModal";

export default function Dashboard() {
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Modals
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activeQrSessionId, setActiveQrSessionId] = useState<string | null>(
    null
  );

  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [isTestSendOpen, setIsTestSendOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Data Fetching
  const fetchSessions = useCallback(async () => {
    try {
      const data = await sessionService.getAll();
      setSessions(data || []);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await sessionService.getMessageLog();
      setMessages(data || []);
    } catch (e) {
      console.error("Failed to fetch messages", e);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await templateService.getAll();
      setTemplates(data || []);
    } catch (e) {
      console.error("Failed to fetch templates", e);
    }
  }, []);

  // Polling
  useEffect(() => {
    // Initial fetch handled inside effect
    const initialFetch = async () => {
        await Promise.all([fetchSessions(), fetchMessages(), fetchTemplates()]);
    };

    void initialFetch();

    const sessionInterval = setInterval(fetchSessions, 5000);
    const messageInterval = setInterval(fetchMessages, 3000);

    return () => {
      clearInterval(sessionInterval);
      clearInterval(messageInterval);
    };
  }, [fetchSessions, fetchMessages, fetchTemplates]);

  // QR Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQrOpen && activeQrSessionId) {
      interval = setInterval(async () => {
        try {
          const res = await sessionService.getQR(activeQrSessionId);
          if (res.data.qrImage) {
            setQrCode(res.data.qrImage);
          } else if (res.data.qr) {
            setQrCode(
              `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                res.data.qr
              )}`
            );
          } else if (res.data.status === "CONNECTED") {
            setIsQrOpen(false);
            setActiveQrSessionId(null);
            fetchSessions();
            alert("Session connected!");
          }
        } catch (e) {
           // Ignore errors during polling or handle 404
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isQrOpen, activeQrSessionId, fetchSessions]);

  // Handlers
  const handleCreateSession = async (sessionId: string, webhookUrl?: string) => {
    try {
      await sessionService.create(sessionId, webhookUrl);
      fetchSessions();
      alert("Session created! Scan QR code.");
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        alert(error.response?.data?.message || "Failed to create session");
    }
  };

  const handleViewQR = async (sessionId: string) => {
    setActiveQrSessionId(sessionId);
    setQrCode(null);
    setIsQrOpen(true);
    // Initial fetch
    try {
        const res = await sessionService.getQR(sessionId);
        if (res.data.qrImage) {
            setQrCode(res.data.qrImage);
        } else if (res.data.qr) {
            setQrCode(
              `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                res.data.qr
              )}`
            );
        }
    } catch (e) {
        console.error("Failed to fetch QR", e);
    }
  };

  const handleStopSession = async (sessionId: string) => {
      if(!confirm(`Stop session ${sessionId}?`)) return;
      try {
          await sessionService.stop(sessionId);
          fetchSessions();
      } catch (e) {
          console.error(e);
      }
  };

  const handleResumeSession = async (sessionId: string) => {
      try {
          await sessionService.start(sessionId);
          alert("Session starting...");
          fetchSessions();
      } catch (e) {
          console.error(e);
      }
  };

  const handleDeleteSession = async (sessionId: string) => {
      if(!confirm(`Delete session ${sessionId}? This will logout and remove data.`)) return;
      try {
          await sessionService.delete(sessionId);
          fetchSessions();
      } catch (e) {
          console.error(e);
      }
  };

  const handleCreateTemplate = async (template: Template) => {
      try {
          await templateService.create(template);
          fetchTemplates();
          alert("Template created");
      } catch (e: unknown) {
          const error = e as { response?: { data?: { message?: string } } };
          alert(error.response?.data?.message || "Failed to create template");
      }
  };

  const handleDeleteTemplate = async (name: string) => {
      if(!confirm(`Delete template ${name}?`)) return;
      try {
          await templateService.delete(name);
          fetchTemplates();
      } catch (e) {
          console.error(e);
      }
  };

  const handleTestSendOpen = (template: Template) => {
      setSelectedTemplate(template);
      setIsTestSendOpen(true);
  };

  const handleSendTest = async (sessionId: string, to: string, templateName: string, variables: Record<string, string>) => {
      await sessionService.sendTemplate(sessionId, to, templateName, variables);
      alert("Test message sent!");
  };

  const handleSendText = async (sessionId: string, to: string, message: string) => {
      await sessionService.sendMessage(sessionId, to, message);
      fetchMessages();
  };

  const handleSendFile = async (sessionId: string, to: string, formData: FormData) => {
      await sessionService.sendFile(sessionId, to, formData);
      fetchMessages();
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-100 blur-[120px] opacity-60"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[100px] opacity-60"></div>
      </div>

      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Sessions & Messages */}
          <div className="lg:col-span-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <SessionsList
              sessions={sessions}
              onCreateOpen={() => setIsCreateSessionOpen(true)}
              onViewQR={handleViewQR}
              onStop={handleStopSession}
              onResume={handleResumeSession}
              onDelete={handleDeleteSession}
            />
            <MessageLog
              messages={messages}
              onQuickSend={() => setIsSendMessageOpen(true)}
            />
          </div>

          {/* Right Column: Templates */}
          <div className="lg:col-span-4 animate-in slide-in-from-bottom-8 duration-500">
            <TemplatesList
              templates={templates}
              onCreateOpen={() => setIsCreateTemplateOpen(true)}
              onDelete={handleDeleteTemplate}
              onTestSend={handleTestSendOpen}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
        onCreate={handleCreateSession}
      />
      <QrModal
        isOpen={isQrOpen}
        onClose={() => {
            setIsQrOpen(false);
            setActiveQrSessionId(null);
        }}
        qrCode={qrCode}
      />
      <CreateTemplateModal
        isOpen={isCreateTemplateOpen}
        onClose={() => setIsCreateTemplateOpen(false)}
        onCreate={handleCreateTemplate}
      />
      <SendMessageModal
        isOpen={isSendMessageOpen}
        onClose={() => setIsSendMessageOpen(false)}
        sessions={sessions}
        onSendText={handleSendText}
        onSendFile={handleSendFile}
      />
      <TestSendModal
        isOpen={isTestSendOpen}
        onClose={() => setIsTestSendOpen(false)}
        template={selectedTemplate}
        sessions={sessions}
        onSend={handleSendTest}
      />
    </div>
  );
}
