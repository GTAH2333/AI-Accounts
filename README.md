# AI Accounts Dashboard

Track your AI service account balances locally. Zero dependencies.

Local dashboard to check balances for AI API accounts (DeepSeek, etc.).
No npm install, no node_modules, just a single Node.js file.

## Features

- **Zero dependencies** — uses only Node.js built-in modules
- **Clean dashboard** — dark/light adaptive UI
- **Multi-account** — add as many accounts as you want
- **In-browser shutdown** — click Stop Server on the page
- **No console window** — start.vbs launches silently in background

## Quick Start

### 1. Configure API keys

Copy config.example.json to config.json and add your keys:

`json
[
  {
    "name": "My DeepSeek",
    "apiKey": "sk-your-key-here",
    "provider": "deepseek"
  }
]
`

**Security:** config.json is in .gitignore and never committed.

### 2. Start the server

**Windows** — double-click start.vbs (no black console window).

Or manually:
`ash
node server.js
`

### 3. Open the dashboard

Visit **http://localhost:3456**

## How it works

1. Browser fetches account list from /api/accounts
2. Server queries DeepSeek /user/balance API
3. Balances displayed in card layout
4. Click Stop Server to shut down gracefully

The balance API is free and does not consume tokens.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/accounts | List configured accounts (keys masked) |
| POST | /api/refresh | Refresh one account: {"name":"..."} |
| POST | /api/refresh-all | Refresh all accounts |
| POST | /api/shutdown | Stop the server gracefully |

## Project Structure

```
ai-accounts/
  server.js           -- HTTP server (zero dependencies)
  public/index.html   -- Dashboard UI
  start.vbs           -- Silent launcher (Windows)
  config.example.json -- Config template
```

## License

Deepseek-v4
