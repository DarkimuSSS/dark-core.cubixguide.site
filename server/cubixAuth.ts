import * as net from 'net';
import * as crypto from 'crypto';

export interface CubixAuthResult {
  login: string;
  accessToken: string;
}

export interface CubixAccountInfo {
  login: string;
  rank?: string;
  ruble?: string;
  bonus?: number | string;
  groups?: Array<{
    group_name: string;
    server: string;
    server_main_name: string;
  }>;
}

export class CubixAuthClient {
  /**
   * Выполнить TCP-авторизацию и получить access_token
   */
  public async authenticate(login: string, password: string): Promise<CubixAuthResult> {
    const HOST = process.env.CUBIX_TCP_HOST || 'sash.cubix.world';
    const PORT = parseInt(process.env.CUBIX_TCP_PORT || '7777', 10);
    const rawMagic = process.env.CUBIX_PROTOCOL_MAGIC || '0x72472417';
    
    // Magic number: 0x72472417 (Big-Endian uint32)
    const magicNum = typeof rawMagic === 'string' && rawMagic.startsWith('0x') 
      ? parseInt(rawMagic, 16) 
      : parseInt(rawMagic, 10);
    
    const PROTOCOL_MAGIC = Buffer.alloc(4);
    PROTOCOL_MAGIC.writeUInt32BE(magicNum, 0);

    const RSA_MODULUS_HEX = (process.env.CUBIX_RSA_MODULUS_HEX || 'a8c208cf0528e4b9d7d45af60372cebc0a09cd5ead4aa3e192d5ab7a6877af8fe7dc94f93259b77a73d4f05d5d3a8e6a545ff5971f6cce41de37685d7972cc1f3a64246b34d1376640ccace403faf91851991b4329a5f06d498411147602eadc54d4244ebf27c63dd044839e89680dbb9128612b318bc51c701b25d48b93d0bae87c3fbefdebe6da164b4b6ab2ea5543ff4702055d11f2a752d615fbe5afcd47c0bae0e7c347d200569c8d7fc2f38d0b2ef00a6d97608f002a81eb4a086e3bf095b14d81a7929549b243bf040c996ac122bd772d97d1ee6103647a592ae03de4b75d5b53bf37224304bca62646a7f2bde339fc38ea07d856fe7c2890c5432b89').replace(/^0x/i, '');

    const RSA_EXPONENT_HEX = (process.env.CUBIX_RSA_EXPONENT_HEX || '10001').replace(/^0x/i, '');

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let step: 'handshake' | 'auth' = 'handshake';
      let buffer = Buffer.alloc(0);

      socket.setTimeout(8000, () => {
        socket.destroy();
        reject(new Error('Превышено время ожидания ответа от TCP-сервера CubixWorld'));
      });

      socket.connect(PORT, HOST, () => {
        // 1. Handshake
        const modulusBytes = Buffer.from(RSA_MODULUS_HEX, 'hex');
        
        // Если первый байт >= 0x80, добавляем 0x00 в начало для корректного знакового байта Java BigInteger
        const formattedModulus = modulusBytes[0] >= 0x80
          ? Buffer.concat([Buffer.from([0x00]), modulusBytes])
          : modulusBytes;

        const handshakePayload = Buffer.concat([
          PROTOCOL_MAGIC,
          this.writeByteArray(formattedModulus),
          this.writeVarInt(4) // Packet ID = 4 (Auth)
        ]);

        socket.write(handshakePayload);
      });

      socket.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        if (step === 'handshake') {
          if (buffer.length < 1) return;

          const accepted = buffer[0];
          buffer = buffer.subarray(1);

          if (accepted !== 1) {
            socket.destroy();
            return reject(new Error('Сервер отклонил handshake подключения.'));
          }

          step = 'auth';

          // 2. Шифрование пароля по RSA (PKCS#1)
          const encryptedPassword = this.encryptPassword(password, RSA_MODULUS_HEX, RSA_EXPONENT_HEX);

          // 3. Отправка логина и зашифрованного пароля
          const authPayload = Buffer.concat([
            this.writeString(login),
            this.writeByteArray(encryptedPassword)
          ]);

          socket.write(authPayload);
        } else if (step === 'auth') {
          // Читаем строку ошибки (первая VarInt строка)
          const errorResult = this.readVarIntString(buffer);
          if (!errorResult) return; // Ожидаем дозагрузки данных

          if (errorResult.text.length > 0) {
            socket.destroy();
            return reject(new Error(errorResult.text));
          }

          // Оставшаяся часть ответа содержит Access Token (64 ASCII символа в конце)
          const restBytes = buffer.subarray(errorResult.bytesRead);
          socket.destroy();

          const responseText = restBytes.toString('ascii').trim();
          
          // Извлекаем токен (последние символы)
          const tokenMatch = responseText.match(/[a-fA-F0-9]{32,64}/);
          const accessToken = tokenMatch ? tokenMatch[0] : responseText;

          resolve({
            login,
            accessToken
          });
        }
      });

      socket.on('error', (err) => reject(err));
    });
  }

  /**
   * Получить информацию о балансе и рангах с REST API
   */
  public async getAccountInfo(login: string, accessToken: string): Promise<CubixAccountInfo> {
    const url = `https://cubixworld.net/api/account.info?login=${encodeURIComponent(login)}&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return (await res.json()) as CubixAccountInfo;
  }

  // ==========================================
  // Вспомогательные бинарные и крипто методы
  // ==========================================

  private encryptPassword(password: string, modulusHex: string, exponentHex: string): Buffer {
    const modulusBuf = Buffer.from(modulusHex, 'hex');
    const pem = '-----BEGIN PUBLIC KEY-----\n' +
      Buffer.from('30820122300d06092a864886f70d01010105000382010f003082010a0282010100' + modulusHex + '0203010001', 'hex').toString('base64').match(/.{1,64}/g)?.join('\n') +
      '\n-----END PUBLIC KEY-----';

    return crypto.publicEncrypt(
      {
        key: pem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(password, 'utf8')
    );
  }

  private writeVarInt(val: number): Buffer {
    const bytes: number[] = [];
    while ((val & -128) !== 0) {
      bytes.push((val & 0x7f) | 0x80);
      val >>>= 7;
    }
    bytes.push(val & 0x7f);
    return Buffer.from(bytes);
  }

  private writeByteArray(data: Buffer): Buffer {
    return Buffer.concat([this.writeVarInt(data.length), data]);
  }

  private writeString(str: string): Buffer {
    const bytes = Buffer.from(str, 'utf8');
    return this.writeByteArray(bytes);
  }

  private readVarIntString(buffer: Buffer): { text: string; bytesRead: number } | null {
    let value = 0;
    let shift = 0;
    let offset = 0;

    while (true) {
      if (offset >= buffer.length) return null;
      const b = buffer[offset++];
      value |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }

    if (buffer.length < offset + value) return null;
    const text = buffer.subarray(offset, offset + value).toString('utf8');

    return {
      text,
      bytesRead: offset + value
    };
  }
}

export async function authenticateViaCubixTcp(username: string, password: string) {
  const client = new CubixAuthClient();
  try {
    const res = await client.authenticate(username, password);
    let accountInfo: CubixAccountInfo | null = null;
    try {
      accountInfo = await client.getAccountInfo(res.login, res.accessToken);
    } catch (e) {
      console.warn('[CubixWorld API Account Info Warning]:', e);
    }
    return {
      success: true,
      username: res.login,
      accessToken: res.accessToken,
      accountInfo
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Ошибка авторизации CubixWorld'
    };
  }
}
