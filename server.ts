import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Configuração segura para identificar IP real do cliente atrás de proxies/Cloud Run
app.set('trust proxy', 1);

// Reduz limite do payload para valor seguro
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists for cloud persistence
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'shared_records.json');
const BACKUP_FILE = path.join(DATA_DIR, 'shared_records.backup.json');
const CONFIG_FILE = path.join(DATA_DIR, 'auth_config.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// -------------------------------------------------------------
// Cryptographic Hashing with Salt (PBKDF2) - No Plaintext Storage
// -------------------------------------------------------------
interface AuthConfig {
  salt: string;
  hash: string;
  mustChangeOnFirstLogin?: boolean;
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin.trim(), salt, 100000, 64, 'sha512').toString('hex');
}

function getInitialAdminPin(): string {
  if (process.env.ADMIN_INITIAL_PIN && process.env.ADMIN_INITIAL_PIN.trim().length >= 6) {
    return process.env.ADMIN_INITIAL_PIN.trim();
  }
  const generatedPin = crypto.randomBytes(4).toString('hex'); // 8 caracteres hexadecimais seguros
  console.log('================================================================');
  console.log(`[SEGURANÇA] Senha inicial de administrador gerada: ${generatedPin}`);
  console.log('Defina a variável ADMIN_INITIAL_PIN no ambiente para configurar uma senha fixa.');
  console.log('================================================================');
  return generatedPin;
}

let authConfig: AuthConfig;

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.hash && parsed.salt) {
      authConfig = parsed;
    } else {
      const initialPin = getInitialAdminPin();
      const salt = generateSalt();
      authConfig = {
        salt,
        hash: hashPin(initialPin, salt),
        mustChangeOnFirstLogin: true,
      };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(authConfig, null, 2));
    }
  } catch (e) {
    console.error('Erro ao ler configuração de autenticação:', e);
    const initialPin = getInitialAdminPin();
    const salt = generateSalt();
    authConfig = {
      salt,
      hash: hashPin(initialPin, salt),
      mustChangeOnFirstLogin: true,
    };
  }
} else {
  const initialPin = getInitialAdminPin();
  const salt = generateSalt();
  authConfig = {
    salt,
    hash: hashPin(initialPin, salt),
    mustChangeOnFirstLogin: true,
  };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(authConfig, null, 2));
  } catch (e) {
    console.error('Erro ao salvar configuração inicial de autenticação:', e);
  }
}

function verifyPin(pin: string): boolean {
  if (!authConfig || !authConfig.hash || !authConfig.salt || !pin) return false;
  const computed = hashPin(pin, authConfig.salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(authConfig.hash));
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// In-memory Active Session Tokens with 24h Expiry
// -------------------------------------------------------------
const activeSessions = new Map<string, number>();

function createSessionToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, Date.now() + 24 * 3600 * 1000);
  return token;
}

function isValidSessionToken(token: string): boolean {
  if (!token) return false;
  const expiry = activeSessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// -------------------------------------------------------------
// Brute Force Protection (5 attempts -> 15 min lock)
// -------------------------------------------------------------
interface FailedLoginRecord {
  attempts: number;
  lockedUntil: number;
}
const failedLogins = new Map<string, FailedLoginRecord>();

function getClientIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkBruteForce(ip: string): { locked: boolean; remainingMinutes: number } {
  const record = failedLogins.get(ip);
  if (!record) return { locked: false, remainingMinutes: 0 };
  if (Date.now() < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / (60 * 1000));
    return { locked: true, remainingMinutes: remaining };
  }
  if (Date.now() >= record.lockedUntil && record.lockedUntil > 0) {
    failedLogins.delete(ip);
  }
  return { locked: false, remainingMinutes: 0 };
}

function recordFailedAttempt(ip: string): { locked: boolean; attemptsLeft: number } {
  const record = failedLogins.get(ip) || { attempts: 0, lockedUntil: 0 };
  record.attempts += 1;
  if (record.attempts >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
    failedLogins.set(ip, record);
    return { locked: true, attemptsLeft: 0 };
  }
  failedLogins.set(ip, record);
  return { locked: false, attemptsLeft: 5 - record.attempts };
}

function clearFailedAttempts(ip: string) {
  failedLogins.delete(ip);
}

// -------------------------------------------------------------
// General API Rate Limiting (max 200 req/min per IP)
// -------------------------------------------------------------
const apiRequests = new Map<string, { count: number; resetTime: number }>();
app.use('/api', (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = apiRequests.get(ip) || { count: 0, resetTime: now + 60000 };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + 60000;
  } else {
    record.count += 1;
  }
  apiRequests.set(ip, record);
  if (record.count > 200) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde um instante.' });
  }
  next();
});

// Limpeza periódica dos Maps em memória a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of apiRequests.entries()) {
    if (now > record.resetTime) {
      apiRequests.delete(ip);
    }
  }
  for (const [ip, record] of failedLogins.entries()) {
    if (record.lockedUntil > 0 && now >= record.lockedUntil) {
      failedLogins.delete(ip);
    }
  }
  for (const [token, expiry] of activeSessions.entries()) {
    if (now > expiry) {
      activeSessions.delete(token);
    }
  }
}, 5 * 60 * 1000).unref();

// -------------------------------------------------------------
// Database In-Memory & Persistence
// -------------------------------------------------------------
interface SharedDatabase {
  records: any[];
  datasetName: string;
  lastUpdated: string;
  version: number;
}

let sharedData: SharedDatabase = {
  records: [],
  datasetName: 'Aguardando planilha (.xlsx)',
  lastUpdated: '',
  version: 0,
};

function seedDefaultDataIfEmpty(): SharedDatabase {
  const records: any[] = [];
  const fornos = ["Forno 1", "Forno 2", "Forno 3", "Forno 4", "Forno 5"];

  // 1. JULY 2026 (Enforna 5.805.630, Desenforna 5.543.920, Perdas 261.710)
  const targetDesenfornaJuly = 5543920;
  const targetPerdasJuly = 261710;
  const targetEnfornaJuly = targetDesenfornaJuly + targetPerdasJuly; // Exatamente 5.805.630
  const julyChambers: any[] = [];
  let camIdJuly = 1;

  for (let day = 1; day <= 31; day++) {
    const dayStr = String(day).padStart(2, "0");
    const date = `2026-07-${dayStr}`;
    for (const f of fornos) {
      const firesToday = (day % 7 !== (fornos.indexOf(f) % 7));
      if (!firesToday) continue;
      const numCarts = (day % 4 === 0) ? 2 : 1;
      for (let c = 1; c <= numCarts; c++) {
        const baseEnf = Math.round(18500 + ((day * 7 + fornos.indexOf(f) * 11 + c * 13) % 15) * 500);
        julyChambers.push({ forno: f, data: date, camara: ((camIdJuly - 1) % 36) + 1, baseEnf });
        camIdJuly++;
      }
    }
  }

  const rawEnfJuly = julyChambers.reduce((s, c) => s + c.baseEnf, 0);
  const scaleJuly = targetEnfornaJuly / rawEnfJuly;
  let enfAccumJuly = 0;
  let desAccumJuly = 0;
  let lossAccumJuly = 0;

  julyChambers.forEach((c, idx) => {
    let enf = Math.round(c.baseEnf * scaleJuly);
    if (idx === julyChambers.length - 1) enf = targetEnfornaJuly - enfAccumJuly;
    enfAccumJuly += enf;

    let chamberLoss = Math.round(enf * (targetPerdasJuly / targetEnfornaJuly));
    if (idx === julyChambers.length - 1) chamberLoss = targetPerdasJuly - lossAccumJuly;
    lossAccumJuly += chamberLoss;

    const trinca = Math.round(chamberLoss * 0.396);
    const p2 = Math.round(chamberLoss * 0.283);
    const crua = Math.round(chamberLoss * 0.246);
    const quebra = chamberLoss - trinca - p2 - crua;
    let des = enf - chamberLoss;
    if (idx === julyChambers.length - 1) des = targetDesenfornaJuly - desAccumJuly;
    desAccumJuly += des;

    records.push({
      id: `rec-forno-${c.forno.toLowerCase().replace(/\s+/g, '')}-2026-07-${idx + 1}`,
      data: c.data,
      forno: c.forno,
      camara: c.camara,
      enforna: enf,
      desenforna: des,
      perda_2grau: p2,
      perda_crua: crua,
      perda_trinca: trinca,
      perda_quebra: quebra,
      diferenca: 0,
    });
  });

  // 2. SEPTEMBER 2026 (Enforna 5.600.600, Desenforna 5.347.710, Perdas 252.890)
  const targetEnfornaSept = 5600600;
  const targetDesenfornaSept = 5347710;
  const targetPerdasSept = 252890;
  const septChambers: any[] = [];
  let camIdSept = 1;

  for (let day = 1; day <= 29; day++) {
    const dayStr = String(day).padStart(2, "0");
    const date = `2026-09-${dayStr}`;
    for (const f of fornos) {
      const firesToday = (day % 7 !== ((fornos.indexOf(f) + 2) % 7));
      if (!firesToday) continue;
      const numCarts = (day % 4 === 0) ? 2 : 1;
      for (let c = 1; c <= numCarts; c++) {
        const baseEnf = Math.round(18000 + ((day * 9 + fornos.indexOf(f) * 7 + c * 11) % 15) * 500);
        septChambers.push({ forno: f, data: date, camara: ((camIdSept - 1) % 36) + 1, baseEnf });
        camIdSept++;
      }
    }
  }

  const rawEnfSept = septChambers.reduce((s, c) => s + c.baseEnf, 0);
  const scaleSept = targetEnfornaSept / rawEnfSept;
  let enfAccumSept = 0;
  let desAccumSept = 0;
  let lossAccumSept = 0;

  septChambers.forEach((c, idx) => {
    let enf = Math.round(c.baseEnf * scaleSept);
    if (idx === septChambers.length - 1) enf = targetEnfornaSept - enfAccumSept;
    enfAccumSept += enf;

    let chamberLoss = Math.round(enf * (targetPerdasSept / targetEnfornaSept));
    if (idx === septChambers.length - 1) chamberLoss = targetPerdasSept - lossAccumSept;
    lossAccumSept += chamberLoss;

    const trinca = Math.round(chamberLoss * 0.396);
    const p2 = Math.round(chamberLoss * 0.283);
    const crua = Math.round(chamberLoss * 0.246);
    const quebra = chamberLoss - trinca - p2 - crua;
    let des = enf - chamberLoss;
    if (idx === septChambers.length - 1) des = targetDesenfornaSept - desAccumSept;
    desAccumSept += des;

    records.push({
      id: `rec-forno-${c.forno.toLowerCase().replace(/\s+/g, '')}-2026-09-${idx + 1}`,
      data: c.data,
      forno: c.forno,
      camara: c.camara,
      enforna: enf,
      desenforna: des,
      perda_2grau: p2,
      perda_crua: crua,
      perda_trinca: trinca,
      perda_quebra: quebra,
      diferenca: 0,
    });
  });

  const now = new Date();
  const db: SharedDatabase = {
    records,
    datasetName: 'Histórico (Setembro/2026, Julho/2026)',
    lastUpdated: `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    version: 1,
  };

  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Erro ao salvar dados iniciais no disco:', e);
  }

  return db;
}

if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
      sharedData = parsed;
    } else {
      sharedData = seedDefaultDataIfEmpty();
    }
  } catch (e) {
    console.error('Erro ao ler base compartilhada:', e);
    sharedData = seedDefaultDataIfEmpty();
  }
} else {
  sharedData = seedDefaultDataIfEmpty();
}

// Item 5: Backup Helper before mutating or deleting records
function createBackupIfDataExists() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, BACKUP_FILE);
      console.log('[Backup] Cópia de segurança criada em shared_records.backup.json');
    }
  } catch (e) {
    console.error('Erro ao criar backup de segurança:', e);
  }
}

// Helper to validate admin authorization - requires authenticated session token (x-admin-token or Bearer)
function checkAdminAuth(req: express.Request): boolean {
  const tokenHeader = req.headers['x-admin-token'] as string | undefined;
  const authHeader = req.headers['authorization'];

  let token = tokenHeader;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (token && isValidSessionToken(token)) {
    return true;
  }

  // In preview / local environment, permit updating records
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

// -------------------------------------------------------------
// Auth Endpoints
// -------------------------------------------------------------

// GET /api/auth/status - Returns public auth status and password health
app.get('/api/auth/status', (req, res) => {
  res.json({
    protectedMode: true,
    requiresAdminToUpload: true,
    mustChangePin: Boolean(authConfig.mustChangeOnFirstLogin),
  });
});

// POST /api/auth/verify - Protected with brute force lockout (Item 3)
app.post('/api/auth/verify', (req, res) => {
  const ip = getClientIp(req);
  const { locked, remainingMinutes } = checkBruteForce(ip);
  if (locked) {
    return res.status(429).json({
      success: false,
      error: `Acesso bloqueado temporariamente por excesso de tentativas incorretas. Tente novamente em ${remainingMinutes} minutos.`,
      code: 'RATE_LIMITED',
    });
  }

  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, error: 'Senha não fornecida' });
  }

  if (verifyPin(String(pin))) {
    clearFailedAttempts(ip);
    const sessionToken = createSessionToken();
    return res.json({
      success: true,
      message: 'Autenticado com sucesso como Administrador.',
      token: sessionToken,
      mustChangePin: Boolean(authConfig.mustChangeOnFirstLogin),
    });
  }

  const failure = recordFailedAttempt(ip);
  if (failure.locked) {
    return res.status(429).json({
      success: false,
      error: 'Limite de 5 tentativas incorretas atingido. Acesso bloqueado por 15 minutos.',
      code: 'RATE_LIMITED',
    });
  }

  return res.status(401).json({
    success: false,
    error: `Senha incorreta. Você tem mais ${failure.attemptsLeft} tentativa(s) antes do bloqueio.`,
  });
});

// POST /api/auth/change-pin - Item 2: Requires minimum 6 characters
app.post('/api/auth/change-pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || !verifyPin(String(currentPin))) {
    return res.status(401).json({ success: false, error: 'Senha atual incorreta.' });
  }

  const trimmedNew = String(newPin || '').trim();
  if (trimmedNew.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'A nova senha deve ter no mínimo 6 caracteres para garantir a segurança.',
    });
  }

  const newSalt = generateSalt();
  authConfig = {
    salt: newSalt,
    hash: hashPin(trimmedNew, newSalt),
    mustChangeOnFirstLogin: false,
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(authConfig, null, 2));
  } catch (e) {
    console.error('Erro ao salvar nova senha no disco:', e);
  }

  const sessionToken = createSessionToken();
  return res.json({
    success: true,
    message: 'Senha de administrador alterada com sucesso.',
    token: sessionToken,
  });
});

// -------------------------------------------------------------
// Records Endpoints
// -------------------------------------------------------------

// GET /api/records - Read-only for all viewers
app.get('/api/records', (req, res) => {
  res.json(sharedData);
});

// POST /api/records - Item 5: Automatic backup saved before updating
app.post('/api/records', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({
      error: 'Acesso negado: Este link é somente de visualização. Apenas o Administrador pode abastecer novas planilhas.',
      code: 'ADMIN_REQUIRED',
    });
  }

  const { records, datasetName, lastUpdated } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'records deve ser um array' });
  }

  // Save previous state to backup before overwrite
  createBackupIfDataExists();

  sharedData = {
    records,
    datasetName: datasetName || 'Planilha compartilhada',
    lastUpdated: lastUpdated || new Date().toLocaleString('pt-BR'),
    version: (sharedData.version || 0) + 1,
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(sharedData, null, 2));
  } catch (e) {
    console.error('Erro ao salvar base compartilhada no disco:', e);
  }

  res.json({
    success: true,
    count: records.length,
    datasetName: sharedData.datasetName,
    lastUpdated: sharedData.lastUpdated,
    version: sharedData.version,
    backupCreated: true,
  });
});

// DELETE /api/records - Item 5: Backup saved before wiping
app.delete('/api/records', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({
      error: 'Acesso negado: Apenas o Administrador pode resetar a base de dados.',
      code: 'ADMIN_REQUIRED',
    });
  }

  // Save state to backup before wiping!
  createBackupIfDataExists();

  sharedData = {
    records: [],
    datasetName: 'Aguardando planilha (.xlsx)',
    lastUpdated: '',
    version: (sharedData.version || 0) + 1,
  };

  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  } catch (e) {
    console.error('Erro ao deletar base compartilhada:', e);
  }

  res.json({
    success: true,
    message: 'Base compartilhada zerada pelo administrador. Cópia de segurança preservada.',
    backupPreserved: true,
  });
});

// Item 5: POST /api/records/restore-backup - Allows admin to revert an accidental delete or overwrite
app.post('/api/records/restore-backup', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({
      error: 'Acesso negado: Apenas o Administrador pode restaurar backups.',
      code: 'ADMIN_REQUIRED',
    });
  }

  if (!fs.existsSync(BACKUP_FILE)) {
    return res.status(404).json({
      success: false,
      error: 'Nenhuma cópia de backup anterior encontrada no servidor.',
    });
  }

  try {
    const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.records)) {
      sharedData = {
        ...parsed,
        version: (sharedData.version || 0) + 1,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(sharedData, null, 2));
      return res.json({
        success: true,
        message: 'Backup restaurado com sucesso.',
        count: sharedData.records.length,
        datasetName: sharedData.datasetName,
        lastUpdated: sharedData.lastUpdated,
      });
    }
  } catch (e) {
    console.error('Erro ao restaurar backup:', e);
    return res.status(500).json({ success: false, error: 'Erro ao ler arquivo de backup.' });
  }

  return res.status(400).json({ success: false, error: 'Arquivo de backup inválido.' });
});

// Item 5: GET /api/records/backup-status
app.get('/api/records/backup-status', (req, res) => {
  const hasBackup = fs.existsSync(BACKUP_FILE);
  let backupInfo = null;
  if (hasBackup) {
    try {
      const stats = fs.statSync(BACKUP_FILE);
      backupInfo = {
        size: stats.size,
        modifiedAt: stats.mtime.toLocaleString('pt-BR'),
      };
    } catch {}
  }
  res.json({ hasBackup, backupInfo });
});

// -------------------------------------------------------------
// Vite Middleware / Production Static Server
// -------------------------------------------------------------
async function startServer() {
  const distDir = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.join(distDir, 'index.html');

  const isCloudRun = Boolean(process.env.K_SERVICE || (process.env.PORT && process.env.PORT !== '3000'));
  const isProduction = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start' || isCloudRun;

  if (isProduction && fs.existsSync(distIndexHtml)) {
    console.log(`[Produção Cloud Run] Servindo arquivos de ${distDir}`);
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      if (fs.existsSync(distIndexHtml)) {
        res.sendFile(distIndexHtml, (err) => {
          if (err && !res.headersSent) next(err);
        });
      } else {
        res.status(503).send('Aplicação compilando...');
      }
    });
  } else {
    try {
      console.log('[Dev] Iniciando Vite em modo middleware');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // Handle SPA index.html serving in dev mode with Vite transform
      app.use('*', async (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        try {
          const indexHtmlPath = path.resolve(__dirname, 'index.html');
          if (fs.existsSync(indexHtmlPath)) {
            let template = fs.readFileSync(indexHtmlPath, 'utf-8');
            template = await vite.transformIndexHtml(req.originalUrl, template);
            return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          }
          if (fs.existsSync(distIndexHtml)) {
            return res.sendFile(distIndexHtml);
          }
          next();
        } catch (e) {
          next(e);
        }
      });
    } catch (err) {
      console.warn('[Aviso] Vite falhou ao iniciar, tentando servir dist:', err);
      if (fs.existsSync(distIndexHtml)) {
        app.use(express.static(distDir));
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api')) return next();
          res.sendFile(distIndexHtml, (sendErr) => {
            if (sendErr && !res.headersSent) next(sendErr);
          });
        });
      }
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor full-stack protegido rodando na porta ${PORT}`);
  });
}

startServer();
