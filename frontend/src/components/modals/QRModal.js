import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../context/ToastContext';
export default function QRModal({ sessionId, onClose }) {
    const apiCall = useApi();
    const { addToast } = useToast();
    const [qrImage, setQrImage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const fetchQR = useCallback(async () => {
        const res = await apiCall(`/sessions/${sessionId}/qr`);
        if (!res)
            return;
        if (res.qrImage) {
            setQrImage(res.qrImage);
        }
        else if (res.qr) {
            setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(res.qr)}`);
        }
        else if (res.status === 'CONNECTED') {
            setIsConnected(true);
            addToast('Session connected!', 'success');
            setTimeout(onClose, 1000);
        }
    }, [sessionId, apiCall, addToast, onClose]);
    usePolling(fetchQR, 3000, true);
    useEffect(() => {
        fetchQR();
    }, [sessionId, fetchQR]);
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center relative animate-fade-in", children: [_jsx("h3", { className: "text-xl font-bold mb-6 text-slate-800", children: "Scan QR Code" }), isConnected ? (_jsxs("div", { className: "py-8", children: [_jsx("div", { className: "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx("svg", { className: "w-8 h-8 text-green-600", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("p", { className: "text-green-600 font-medium", children: "Connected!" })] })) : qrImage ? (_jsx("img", { src: qrImage, alt: "QR Code", className: "mx-auto rounded-xl border border-slate-200" })) : (_jsxs("div", { className: "py-8 flex flex-col items-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-4 border-orange-100 border-l-orange-600" }), _jsx("p", { className: "mt-4 text-slate-500 text-sm", children: "Loading QR code..." })] })), _jsx("button", { onClick: onClose, className: "mt-6 w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors", children: "Close" })] })] }));
}
