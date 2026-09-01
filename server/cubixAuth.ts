import net from 'net';
import crypto from 'crypto';

export interface CubixAuthResult {
  success: boolean;
  username?: string;
  error?: string;
}

/**
 * Authenticates user credentials via CubixWorld Native TCP Authentication Protocol.
 * Protocol Constants loaded from process.env:
 * - CUBIX_TCP_HOST
 * - CUBIX_TCP_PORT
 * - CUBIX_PROTOCOL_MAGIC (hex string or uint32 number, e.g. 0x72472417)
 * - CUBIX_RSA_MODULUS_HEX
 * - CUBIX_RSA_EXPONENT_HEX
 */
export async function authenticateViaCubixTcp(username: string, password: string): Promise<CubixAuthResult> {
  const host = process.env.CUBIX_TCP_HOST || '127.0.0.1';
  const port = parseInt(process.env.CUBIX_TCP_PORT || '19172', 10);
  const rawMagic = process.env.CUBIX_PROTOCOL_MAGIC || '0x72472417';
  const magic = typeof rawMagic === 'string' && rawMagic.startsWith('0x') 
    ? parseInt(rawMagic, 16) 
    : parseInt(rawMagic, 10);

  const modulusHex = process.env.CUBIX_RSA_MODULUS_HEX || '';
  const exponentHex = process.env.CUBIX_RSA_EXPONENT_HEX || '10001';

  if (!modulusHex || modulusHex.includes('{RsaString}')) {
    console.warn('[CubixWorld TCP Auth] WARNING: CUBIX_RSA_MODULUS_HEX is not configured in .env');
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isSettled = false;

    const cleanup = () => {
      if (!socket.destroyed) {
        socket.destroy();
      }
    };

    const finish = (result: CubixAuthResult) => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        resolve(result);
      }
    };

    // Set timeout for TCP connection & response
    socket.setTimeout(8000, () => {
      finish({ success: false, error: 'Превышено время ожидания ответа от сервера авторизации CubixWorld' });
    });

    socket.on('error', (err) => {
      console.error('[CubixWorld TCP Auth Error]:', err.message);
      finish({ success: false, error: `Ошибка соединения с TCP сервером авторизации: ${err.message}` });
    });

    socket.on('connect', () => {
      try {
        // Construct payload: username + '\n' + password
        const authDataStr = `${username.trim()}\n${password}`;
        const rawPayload = Buffer.from(authDataStr, 'utf-8');

        // Encrypt payload if RSA parameters are provided
        let encryptedPayload: Buffer;
        if (modulusHex && !modulusHex.includes('{RsaString}')) {
          try {
            const modulusBuf = Buffer.from(modulusHex.replace(/^0x/i, ''), 'hex');
            const exponentBuf = Buffer.from(exponentHex.replace(/^0x/i, ''), 'hex');
            
            const publicKeyPem = crypto.createPublicKey({
              key: {
                kty: 'RSA',
                n: modulusBuf.toString('base64url'),
                e: exponentBuf.toString('base64url')
              },
              format: 'jwk'
            });

            encryptedPayload = crypto.publicEncrypt(
              {
                key: publicKeyPem,
                padding: crypto.constants.RSA_PKCS1_PADDING
              },
              rawPayload
            );
          } catch (rsaErr: any) {
            console.warn('[CubixWorld TCP Auth] RSA Encryption fallback to raw payload:', rsaErr.message);
            encryptedPayload = rawPayload;
          }
        } else {
          encryptedPayload = rawPayload;
        }

        // Build Native TCP Packet Structure:
        // [4 Bytes Big-Endian: ProtocolMagic (0x72472417)]
        // [256 Bytes: RSA Encrypted Payload (username\npassword)]
        const magicHeader = Buffer.alloc(4);
        magicHeader.writeUInt32BE(magic, 0);

        const finalPacket = Buffer.concat([magicHeader, encryptedPayload]);
        socket.write(finalPacket);
      } catch (prepErr: any) {
        finish({ success: false, error: `Ошибка формирования пакета авторизации: ${prepErr.message}` });
      }
    });

    socket.connect(port, host);

    let receivedBuffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      receivedBuffer = Buffer.concat([receivedBuffer, chunk]);

      if (receivedBuffer.length >= 1) {
        const statusByte = receivedBuffer[0];
        const responseText = receivedBuffer.toString('utf-8').trim();

        // 0x01 or 0x00 status byte response
        if (statusByte === 0x01 || statusByte === 0x31 || responseText.toUpperCase().includes('OK') || responseText.toUpperCase().includes('SUCCESS')) {
          finish({ success: true, username: username.trim() });
        } else {
          finish({ success: false, error: 'Неверный логин или пароль от аккаунта CubixWorld' });
        }
      }
    });
  });
}
