
/* eslint-disable @next/next/no-img-element */
import Modal from "../ui/Modal";

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string | null;
}

export default function QrModal({ isOpen, onClose, qrCode }: QrModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan QR Code">
      <div className="text-center">
        <div className="mb-6 p-4 bg-white rounded-xl shadow-inner border border-slate-100 inline-block">
          {qrCode ? (
            <img
              src={qrCode}
              className="w-64 h-64 object-contain rounded-lg"
              alt="QR Code"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                <p>Loading QR...</p>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Open WhatsApp on your phone and scan the code.
        </p>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 font-medium"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
