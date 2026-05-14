import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../context/ToastContext';

interface QRModalProps {
    sessionId: string;
    onClose: () => void;
}

export default function QRModal({ sessionId, onClose }: QRModalProps) {
    const apiCall = useApi();
    const { addToast } = useToast();
    const [qrImage, setQrImage] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const fetchQR = useCallback(async () => {
        const res = await apiCall(`/sessions/${sessionId}/qr`);
        if (!res) return;

        if (res.qrImage) {
            setQrImage(res.qrImage);
        } else if (res.qr) {
            setQrImage(
                `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(res.qr)}`,
            );
        } else if (res.status === 'CONNECTED') {
            setIsConnected(true);
            addToast('Session connected!', 'success');
            setTimeout(onClose, 1000);
        }
    }, [sessionId, apiCall, addToast, onClose]);

    usePolling(fetchQR, 3000, true);

    useEffect(() => {
        fetchQR();
    }, [sessionId, fetchQR]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center relative animate-fade-in">
                <h3 className="text-xl font-bold mb-6 text-slate-800">
                    Scan QR Code
                </h3>
                {isConnected ? (
                    <div className="py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <p className="text-green-600 font-medium">Connected!</p>
                    </div>
                ) : qrImage ? (
                    <img
                        src={qrImage}
                        alt="QR Code"
                        className="mx-auto rounded-xl border border-slate-200"
                    />
                ) : (
                    <div className="py-8 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-100 border-l-orange-600" />
                        <p className="mt-4 text-slate-500 text-sm">
                            Loading QR code...
                        </p>
                    </div>
                )}
                <button
                    onClick={onClose}
                    className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
