import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

async function connectToWhatsApp() {
    const { state, saveCreds } =
        await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR Code received, please scan:');
        }

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect.error instanceof Boom &&
                lastDisconnect.error.output?.statusCode !==
                    DisconnectReason.loggedOut;
            console.log(
                'Connection closed due to ',
                lastDisconnect.error,
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
