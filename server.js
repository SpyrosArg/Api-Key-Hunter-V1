import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV === 'development';

const app = express();

const corsOptions = {
  origin: isDev 
    ? ['http://localhost:5173']
    : ['https://apikeyhunter.com', 'https://www.apikeyhunter.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDev ? err.message : 'An unexpected error occurred'
  });
});

const PATTERNS = {
  'OpenAI': /sk-[a-zA-Z0-9]{48}/g,
  'Anthropic': /sk-ant-[a-zA-Z0-9]{32}/g,
  'Cohere': /[a-zA-Z0-9]{40}/g,
  'AI21': /[a-zA-Z0-9]{32}/g,
  'Google AI': /AIza[0-9A-Za-z-_]{35}/g,
  'Azure OpenAI': /[a-f0-9]{32}/g,
  'Hugging Face': /hf_[a-zA-Z0-9]{34}/g
};

const SENSITIVE_FILES = ['.env', 'config.json', 'settings.json', 'credentials.json', 'secrets.json'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite-cache']);
const SKIP_EXTS = new Set(['.jpg', '.png', '.gif', '.pdf', '.zip', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot']);

const CODE_PATTERNS = {
  'API Calls': /\.create\(|\.generate\(|\.complete\(|\.predict\(/g,
  'Debug Mode': /debug:\s*true|DEBUG\s*=\s*true/ig,
  'Hardcoded Credentials': /password|secret|key|token|auth/ig
};

async function* walk(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          yield* walk(fullPath);
        }
      } else {
        if (!SKIP_EXTS.has(path.extname(entry.name))) {
          yield fullPath;
        }
      }
    }
  } catch (error) {
    console.error(`Error walking directory ${dir}:`, error);
  }
}

async function validateDirectory(dir) {
  try {
    const stats = await fs.stat(dir);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Directory does not exist');
    }
    throw error;
  }
}

async function findLineNumber(content, match) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) {
      return i + 1;
    }
  }
  return 1;
}

async function scanUrl(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const findings = {
      api_keys: [],
      sensitive_files: [],
      code_issues: [],
      summary: {
        total_files_scanned: 1,
        total_issues: 0,
        risk_level: 'LOW',
        scanned_url: url,
        scan_started_at: new Date().toISOString()
      }
    };

    const scriptContents = [];
    $('script').each((_, elem) => {
      const content = $(elem).html();
      if (content) scriptContents.push(content);
    });

    const textContent = response.data;

    for (const [service, pattern] of Object.entries(PATTERNS)) {
      const matches = textContent.match(pattern);
      if (matches) {
        const lineNumber = await findLineNumber(textContent, matches[0]);
        findings.api_keys.push({
          file: url,
          service,
          line: lineNumber,
          issue: `Potential ${service} API key found`,
          recommendation: `Remove hardcoded ${service} API key and use secure storage methods`
        });
      }
    }

    for (const [pattern, regex] of Object.entries(CODE_PATTERNS)) {
      const combinedScript = scriptContents.join('\n');
      const matches = combinedScript.match(regex);
      if (matches) {
        const lineNumber = await findLineNumber(combinedScript, matches[0]);
        findings.code_issues.push({
          file: url,
          line: lineNumber,
          issue: 'Potential sensitive data handling in code',
          pattern,
          recommendation: 'Review security practices and implement proper data handling'
        });
      }
    }

    SENSITIVE_FILES.forEach(file => {
      if (textContent.includes(file)) {
        findings.sensitive_files.push({
          file: url,
          line: null,
          issue: `Reference to sensitive file "${file}" found`,
          recommendation: 'Ensure sensitive files are not exposed or referenced in public URLs'
        });
      }
    });

    const totalIssues = findings.api_keys.length + findings.sensitive_files.length + findings.code_issues.length;
    findings.summary.total_issues = totalIssues;
    findings.summary.risk_level = totalIssues === 0 ? 'LOW' : totalIssues <= 3 ? 'MEDIUM' : 'HIGH';
    findings.summary.scan_completed_at = new Date().toISOString();

    return findings;
  } catch (error) {
    throw new Error(`Failed to scan URL: ${error.message}`);
  }
}

app.get('/', (req, res) => {
  res.json({
    status: 'API is running',
    endpoints: {
      health: '/api/health',
      scan: '/api/scan',
      scanUrl: '/api/scan/url'
    },
    mode: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    mode: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/scan', async (req, res) => {
  try {
    const { directory = '.' } = req.body;
    const targetDir = directory === '.' ? '.' : resolve(directory);
    
    await validateDirectory(targetDir);
    
    const findings = {
      api_keys: [],
      sensitive_files: [],
      code_issues: [],
      summary: {
        total_files_scanned: 0,
        total_issues: 0,
        risk_level: 'LOW',
        scanned_directory: targetDir,
        scan_started_at: new Date().toISOString()
      }
    };

    for await (const filePath of walk(targetDir)) {
      findings.summary.total_files_scanned++;
      const fileName = path.basename(filePath);
      const relativePath = path.relative(targetDir, filePath);

      if (SENSITIVE_FILES.includes(fileName.toLowerCase())) {
        findings.sensitive_files.push({
          file: relativePath,
          line: null,
          issue: 'Potentially sensitive configuration file found',
          recommendation: 'Move sensitive data to secure storage or environment variables'
        });
      }

      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        for (const [service, pattern] of Object.entries(PATTERNS)) {
          const matches = content.match(pattern);
          if (matches) {
            const lineNumber = await findLineNumber(content, matches[0]);
            findings.api_keys.push({
              file: relativePath,
              service,
              line: lineNumber,
              issue: `Potential ${service} API key found`,
              recommendation: `Remove hardcoded ${service} API key and use environment variables`
            });
          }
        }

        for (const [pattern, regex] of Object.entries(CODE_PATTERNS)) {
          const matches = content.match(regex);
          if (matches) {
            const lineNumber = await findLineNumber(content, matches[0]);
            findings.code_issues.push({
              file: relativePath,
              line: lineNumber,
              issue: 'Potential sensitive data handling in code',
              pattern,
              recommendation: 'Review security practices and implement proper data handling'
            });
          }
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }

    const totalIssues = findings.api_keys.length + findings.sensitive_files.length + findings.code_issues.length;
    findings.summary.total_issues = totalIssues;
    findings.summary.risk_level = totalIssues === 0 ? 'LOW' : totalIssues <= 3 ? 'MEDIUM' : 'HIGH';
    findings.summary.scan_completed_at = new Date().toISOString();

    res.json(findings);
  } catch (error) {
    res.status(400).json({
      error: 'Scan Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/scan/url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      throw new Error('URL is required');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Invalid URL format. URL must start with http:// or https://');
    }

    const findings = await scanUrl(url);
    res.json(findings);
  } catch (error) {
    res.status(400).json({
      error: 'URL Scan Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

if (!isDev) {
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API endpoints:`);
    console.log(`  - GET  /api/health`);
    console.log(`  - POST /api/scan`);
    console.log(`  - POST /api/scan/url`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

const shutdown = () => {
  if (server) {
    console.log('Shutdown signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown();
});