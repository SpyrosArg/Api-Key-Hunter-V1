# APIKeyHunter

A security scanning tool that helps developers identify potential security risks in their codebase, focusing on exposed API keys and security misconfigurations.

## Usage

```bash
npm install
npm run dev:all
```

Access the application:
- Web UI: http://localhost:5173
- API: http://localhost:3001

## Features

- Scans for exposed API keys (OpenAI, Anthropic, Google AI, etc.)
- Detects sensitive configuration files
- Identifies risky code patterns
- Shows exact line numbers for issues
- Real-time scanning results
- URL scanning support

## API Endpoints

- `POST /api/scan` - Scan local directory
- `POST /api/scan/url` - Scan public URL
- `GET /api/health` - Health check

## Stack

- React + TypeScript
- Express.js
- Tailwind CSS
- Vite

## License

MIT