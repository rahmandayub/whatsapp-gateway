import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    ConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

import qrcode from 'qrcode-terminal';

async function connectToWhatsApp(): Promise<void> {
    const { state, saveCreds } =
        await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }) as any,
        printQRInTerminal: false,
        auth: state,
    });

    sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR Code received, please scan:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error as Boom)?.output?.statusCode !==
                DisconnectReason.loggedOut;
            console.log(
                'Connection closed due to ',
                lastDisconnect?.error,
                ', reconnecting ',
                shouldReconnect,
            );
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Opened connection to WhatsApp!');
            process.exit(0); // Exit on success for this POC
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
