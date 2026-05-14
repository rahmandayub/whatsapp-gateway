import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
createRoot(document.getElementById('root')).render(_jsx(AuthProvider, { children: _jsx(ToastProvider, { children: _jsx(App, {}) }) }));
