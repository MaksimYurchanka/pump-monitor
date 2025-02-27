# Pump.fun Monitor Bot 🚀

![Pump.fun Monitor Bot](https://via.placeholder.com/800x120?text=Pump.fun+Monitor+Bot)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

A powerful, real-time monitoring solution for tracking new token listings on the Solana blockchain, with a focus on Pump.fun and Raydium DEX. The bot monitors token prices, market movements, and developer wallet activities, sending instant alerts via Telegram.

## ✨ Key Features

- 🔍 **Real-time Detection** - Monitors DEXs for new token listings with sub-5 second latency
- 📈 **Achievement Tracking** - Automatically tracks market cap milestones from 1.1x to 100x
- 👨‍💻 **Developer Analysis** - Identifies patterns in developer wallet activity to detect potential risks
- 📱 **Telegram Alerts** - Delivers instant, richly formatted notifications to your device
- 💾 **Persistent Storage** - Records comprehensive token history and achievements
- 🛡️ **Rate Limiting** - Built-in protection for API limits and reliable operation
- 🔄 **Batch Processing** - Efficiently handles high volume data with optimized database operations

## 🎯 Purpose

Designed for cryptocurrency traders and investors who need timely information about new Solana token listings and price movements. The bot provides the crucial 30-45 second advantage for early entry into promising tokens, while also tracking their growth through preset achievement milestones.

---

## 📋 Table of Contents

- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [Architecture](#-architecture)
- [Development](#-development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [License & Credits](#-license--credits)

---

## 🔧 Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Telegram bot token (from [@BotFather](https://t.me/BotFather))
- Supabase account and project
- Docker & Docker Compose (optional for containerized deployment)

### Local Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/pump-monitor.git
cd pump-monitor
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

```bash
cp .env.template .env
# Edit .env with your credentials
```

4. **Set up Supabase database**

```bash
# Apply the database migrations
npx supabase db reset
# or if you have Supabase CLI installed
supabase db reset
```

5. **Start the application**

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Docker Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/pump-monitor.git
cd pump-monitor
```

2. **Set up environment variables**

```bash
cp .env.template .env
# Edit .env with your credentials
```

3. **Build and start the container**

```bash
docker-compose up -d --build
```

4. **View logs**

```bash
docker-compose logs -f
```

---

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from BotFather |
| `TELEGRAM_CHAT_ID` | Chat ID where notifications will be sent |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase service role key |

### Optional Configuration Parameters

<details>
<summary>Click to expand all configuration options</summary>

#### Telegram Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_ADMIN_CHAT_ID` | Admin chat ID for system notifications | Same as TELEGRAM_CHAT_ID |
| `TELEGRAM_POLLING_ENABLED` | Enable/disable Telegram polling | true |
| `TELEGRAM_MAX_MESSAGE_LENGTH` | Maximum message length | 4096 |
| `TELEGRAM_MESSAGE_DELAY` | Delay between messages (ms) | 50 |

#### DexScreener Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DEXSCREENER_API_URL` | DexScreener API base URL | https://api.dexscreener.com/latest/dex |
| `DEXSCREENER_RATE_LIMIT` | Requests per minute | 300 |
| `DEXSCREENER_MAX_RETRIES` | Max retries for failed requests | 3 |
| `DEXSCREENER_RETRY_DELAY` | Delay between retries (ms) | 2000 |
| `DEXSCREENER_INITIAL_LOOKBACK_HOURS` | Initial data load period | 24 |

#### Monitoring Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MIN_LIQUIDITY_USD` | Minimum token liquidity threshold | 1000 |
| `BATCH_SIZE` | Database batch operation size | 50 |
| `SCAN_INTERVAL` | Token scanning interval (ms) | 5000 |
| `ACHIEVEMENT_CHECK_INTERVAL` | Achievement check interval (ms) | 60000 |
| `CLEANUP_INTERVAL` | Database cleanup interval (ms) | 86400000 |
| `DEV_WALLET_CHECK_INTERVAL` | Developer wallet analysis interval (ms) | 300000 |

#### Logging Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | info |
| `LOG_FILE_PATH` | Log file path | ./logs/pump-monitor.log |
| `LOG_CONSOLE_ENABLED` | Enable console logging | true |
| `LOG_FILE_ENABLED` | Enable file logging | true |
| `LOG_MAX_FILE_SIZE` | Maximum log file size (bytes) | 10485760 |
| `LOG_MAX_FILES` | Maximum number of log files | 5 |

#### Application Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |

</details>

### Example Configuration File

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=5555555555:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
TELEGRAM_CHAT_ID=-1001234567890
TELEGRAM_ADMIN_CHAT_ID=123456789

# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeGlvZHB1YWdkeGlramZ0dmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3NzI5NDI2OSwiZXhwIjoxOTkzMDU5NzY5fQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Monitoring Configuration
MIN_LIQUIDITY_USD=2000
SCAN_INTERVAL=5000
LOG_LEVEL=info
NODE_ENV=production
```

### Security Considerations

- **API Keys**: Store your Supabase key and Telegram token securely. Never commit them to version control.
- **Service Role**: The Supabase key should be a service role key for database write access, but keep it secure.
- **Environment File**: Protect your `.env` file and consider using secrets management in production.
- **Rate Limiting**: Respect API rate limits to avoid being blocked. The defaults are conservative.

---

## 📱 Usage Guide

### Basic Usage

Once the bot is running, it will automatically:

1. Scan for new token listings every 5 seconds (configurable)
2. Send notifications about new tokens via Telegram
3. Track market cap achievements for monitored tokens
4. Analyze developer wallet patterns

### Available Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and get welcome message |
| `/help` | Show available commands and information |
| `/status` | Show current bot status and statistics |
| `/settings` | Adjust notification settings (if implemented) |
| `/stats` | Show monitoring statistics |

### Understanding Notifications

#### New Token Alert

```
🆕 New Token Detected! 🆕

EXAMPLE TOKEN (EXT)
💰 Initial Price: $0.000000125000
💵 Market Cap: $125,000
💧 Liquidity: $25,000
📊 24h Volume: $5,000
🔊 Created: 2/27/2025, 10:15:30 AM

▶️ Token Address:
8v5yPBcN5g5WBPKb7Zs5e8xDZQN7eEpBPeSfKXFv7E9d

[View Chart](https://dexscreener.com/solana/8v5yPBcN5g5WBPKb7Zs5e8xDZQN7eEpBPeSfKXFv7E9d)
```

#### Achievement Alert

```
🏆 Achievement Unlocked: 5X! 💫

EXAMPLE TOKEN (EXT) reached 5X from initial market cap!

💵 Initial MC: $125,000
💰 Current MC: $625,000
📈 Current Price: $0.000000625000
📊 24h Volume: $82,000
⏱ Time to achieve: 2h 15m

▶️ Token Address:
8v5yPBcN5g5WBPKb7Zs5e8xDZQN7eEpBPeSfKXFv7E9d

[View Chart](https://dexscreener.com/solana/8v5yPBcN5g5WBPKb7Zs5e8xDZQN7eEpBPeSfKXFv7E9d)
```

#### Developer Wallet Alert

```
👨‍💻 Developer Wallet Alert ⚠️

This developer has created 7 tokens:
▶️ Ax7fpG5GtHNe1yhE9yCFJLgwQzX3Cj5Tw91McQxF1Kv4

Latest token: EXAMPLE TOKEN (EXT)
💰 Price: $0.000000125000
💵 Market Cap: $125,000
⏱ Created: 2/27/2025, 10:15:30 AM

⚠️ Use caution when trading tokens from this developer.

[View Token](https://dexscreener.com/solana/8v5yPBcN5g5WBPKb7Zs5e8xDZQN7eEpBPeSfKXFv7E9d)
```

### Achievement Tracking

The bot tracks the following market cap multipliers:
- Early Growth: 1.1x, 1.2x, 1.3x, 1.4x, 1.5x, 1.75x
- Significant Growth: 2x, 2.5x, 3x, 4x, 5x
- Major Achievements: 7.5x, 10x, 15x, 20x
- Exceptional Growth: 30x, 50x, 75x, 100x

Each achievement gets a different emoji based on significance:
- 2x-4x: ✌️ 
- 5x-9x: 💫
- 10x-19x: 🔥
- 20x-49x: 🌟
- 50x-99x: 👑
- 100x+: 🏆

### Developer Wallet Analysis

The bot analyzes developer wallet patterns by:

1. Tracking all tokens created by each wallet
2. Calculating a reputation score based on token creation frequency
3. Flagging wallets with suspicious patterns
4. Warning about developers with large numbers of token launches
5. Detecting potential rug pull patterns

---

## 🏗️ Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Pump.fun Monitor Bot                        │
└────────────────┬─────────────────────────────┬──────────────────┘
                 │                             │
┌────────────────▼──────┐      ┌──────────────▼─────────────────┐
│  External Services    │      │   Monitoring Engine             │
│                       │      │                                 │
│  ┌─────────────────┐  │      │  ┌──────────────────────────┐  │
│  │  DexScreener    │◄─┼──────┼─►│  Token Listing Monitor   │  │
│  │     API         │  │      │  └──────────────────────────┘  │
│  └─────────────────┘  │      │  ┌──────────────────────────┐  │
│                       │      │  │  Achievement Monitor      │  │
│  ┌─────────────────┐  │      │  └──────────────────────────┘  │
│  │   Telegram      │◄─┼──────┼─►┌──────────────────────────┐  │
│  │    Bot API      │  │      │  │  Developer Wallet Monitor │  │
│  └─────────────────┘  │      │  └──────────────────────────┘  │
└───────────────────────┘      └─────────────┬─────────────────┘
                                             │
┌─────────────────────────────────────────┐  │
│             Services Layer               │◄─┘
│                                          │
│  ┌──────────────┐  ┌───────────────┐    │
│  │ DexScreener  │  │   Telegram    │    │
│  │  Service     │  │   Service     │    │
│  └──────────────┘  └───────────────┘    │
│         ┌──────────────────┐            │
│         │    Supabase      │            │
│         │    Service       │            │
│         └────────┬─────────┘            │
└──────────────────┼──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│              Database                    │
│                                          │
│  ┌──────────────┐  ┌───────────────┐    │
│  │ Monitored    │  │  Developer    │    │
│  │  Tokens      │  │   Wallets     │    │
│  └──────────────┘  └───────────────┘    │
│         ┌──────────────────┐            │
│         │     Token        │            │
│         │  Achievements    │            │
│         └──────────────────┘            │
└──────────────────────────────────────────┘
```

### Component Descriptions

#### Core Components

- **Monitoring Engine**: Central coordinator that orchestrates all monitoring activities
- **Service Layer**: Handles external API communication and data persistence
- **Database**: Stores all token and developer wallet data

#### Monitors

- **Token Listing Monitor**: Detects new token listings and triggers notifications
- **Achievement Monitor**: Tracks market cap milestones for tokens
- **Developer Wallet Monitor**: Analyzes developer wallet patterns

#### Services

- **DexScreener Service**: Handles API requests with rate limiting and error handling
- **Telegram Service**: Manages message formatting, queuing, and command handling
- **Supabase Service**: Provides database operations and batch processing

### Data Flow

1. The monitoring engine initializes all services and monitors
2. The token listing monitor periodically checks for new tokens via the DexScreener service
3. When a new token is found, it is:
   - Stored in the database via the Supabase service
   - Announced via the Telegram service
   - Added to achievement tracking
4. For existing tokens:
   - The achievement monitor checks for market cap milestones
   - When a milestone is reached, a notification is sent
5. Developer wallets are analyzed for patterns and risk indicators

### Database Schema

#### Monitored Tokens Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| address | text | Token contract address |
| pair_address | text | DEX pair address |
| symbol | text | Token symbol |
| name | text | Token name |
| initial_price | numeric | Initial price at detection |
| initial_market_cap | numeric | Initial market cap |
| dev_wallet | text | Developer wallet address |
| achievements | numeric[] | Array of achievement multipliers |
| last_price | numeric | Most recent price |
| last_market_cap | numeric | Most recent market cap |
| created_at | timestamp | Token creation timestamp |
| last_updated | timestamp | Last update timestamp |

#### Developer Wallets Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| address | text | Wallet address |
| tokens_created | text[] | Array of token addresses |
| last_token_time | timestamp | Last token creation time |
| total_tokens | integer | Total tokens created |
| is_blacklisted | boolean | Blacklist status |
| reputation_score | integer | Reputation score (0-100) |
| first_seen_at | timestamp | First detection timestamp |

#### Token Achievements Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| token_address | text | Token address (foreign key) |
| multiplier | numeric | Achievement multiplier |
| achieved_at | timestamp | Achievement timestamp |
| price_at_achievement | numeric | Token price at achievement |
| market_cap_at_achievement | numeric | Market cap at achievement |

---

## 💻 Development

### Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/pump-monitor.git
cd pump-monitor
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.template .env
# Edit .env with development values
```

4. **Start local Supabase (optional)**

If you have Supabase CLI installed:

```bash
supabase start
supabase db reset
```

5. **Run in development mode**

```bash
npm run dev
```

This will start the application with hot reloading enabled.

### Testing

The project uses Jest for testing:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

### Code Style and Conventions

This project follows:

- TypeScript best practices with strict type checking
- ESLint for code quality
- Prettier for code formatting

Run the linter and formatter:

```bash
# Lint the codebase
npm run lint

# Format the codebase
npm run format
```

### Project Structure

```
pump-monitor/
├── src/                   # Source code
│   ├── config/            # Configuration management
│   ├── services/          # API and service integrations
│   │   ├── dexscreener.service.ts
│   │   ├── telegram.service.ts
│   │   └── supabase.service.ts
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   │   ├── logger.ts
│   │   └── formatters.ts
│   ├── monitoring/        # Monitoring logic
│   │   ├── monitoring.engine.ts
│   │   └── monitors/
│   └── index.ts           # Application entry point
├── supabase/              # Database migrations
├── tests/                 # Test files
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── dist/                  # Compiled output
├── logs/                  # Log files
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
└── ...                    # Config files, README, etc.
```

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Run tests and ensure they pass
5. Run linting and formatting
6. Commit your changes with descriptive commit messages
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

<details>
<summary>Pull Request Template</summary>

```markdown
## Description
Briefly describe the changes in this pull request.

## Type of change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
Please describe the tests that you ran to verify your changes.

## Checklist:
- [ ] My code follows the code style of this project
- [ ] I have added tests to cover my changes
- [ ] All new and existing tests passed
- [ ] I have updated the documentation accordingly
```

</details>

---

## 🚀 Deployment

### Deployment Options

#### Docker Deployment (Recommended)

The easiest way to deploy the bot is using Docker:

```bash
# On your server
git clone https://github.com/yourusername/pump-monitor.git
cd pump-monitor
cp .env.template .env
# Edit .env with production values
docker-compose up -d --build
```

#### Manual Deployment

1. Clone the repository on your server
2. Install dependencies: `npm install --production`
3. Build the application: `npm run build`
4. Set up environment variables
5. Start the application: `npm start`

Consider using a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/index.js --name pump-monitor
pm2 save
```

### Production Considerations

1. **Environment**: Always set `NODE_ENV=production`
2. **Logging**: Consider setting `LOG_LEVEL=info` for production
3. **Security**: Use secure methods for storing API keys and tokens
4. **Monitoring**: Implement a monitoring solution to ensure uptime
5. **Backups**: Set up regular database backups

### Scaling

The bot is designed to run as a single instance, but you can scale:

1. **Vertical Scaling**: Increase CPU and memory allocation
2. **Monitoring Separation**: Run multiple bots with different monitoring focuses
3. **Database Optimization**: Tune Supabase for better performance

### Monitoring and Logging

- Use the built-in Winston logger for application logs
- Monitor the Docker container with standard tools:

```bash
# Check container health
docker ps

# View logs
docker-compose logs -f

# Monitor resource usage
docker stats
```

- Consider setting up log aggregation with ELK, Grafana, or similar tools
- Set up alerts for bot downtime or errors

### Backup and Recovery

1. **Database Backups**:
   - Set up regular Supabase database backups
   - Export important data periodically

2. **Configuration Backups**:
   - Keep secure backups of your `.env` file
   - Document any custom settings

3. **Recovery Plan**:
   - Document the steps to restore from backup
   - Test the recovery process occasionally

---

## 🔍 Troubleshooting

### Common Issues and Solutions

<details>
<summary>API Rate Limiting</summary>

**Issue**: The bot encounters rate limiting from the DexScreener API.

**Solution**:
1. Check the `DEXSCREENER_RATE_LIMIT` setting (default 300 requests/minute)
2. Increase the `SCAN_INTERVAL` to reduce API calls
3. Verify logs for API response errors

```
Error in token scan interval: API request failed: 429 Too Many Requests
```

If you see this error, increase the scan interval.
</details>

<details>
<summary>Telegram Connection Issues</summary>

**Issue**: The bot cannot connect to Telegram or send messages.

**Solution**:
1. Verify your bot token is correct
2. Ensure your bot has permission to send messages to the chat ID
3. Check network connectivity to Telegram's API servers
4. Look for networking errors in logs:

```
Error initializing Telegram bot: ETELEGRAM: 401 Unauthorized
```

This typically means your bot token is invalid.
</details>

<details>
<summary>Supabase Database Issues</summary>

**Issue**: Database connection or query errors.

**Solution**:
1. Verify Supabase credentials are correct
2. Ensure database migrations have been applied
3. Check Supabase service status
4. Look for specific error messages:

```
Error connecting to database: connection refused
```

This means the bot cannot reach your Supabase instance.
</details>

<details>
<summary>Memory Usage Issues</summary>

**Issue**: The bot uses excessive memory over time.

**Solution**:
1. Limit the number of tokens tracked with database cleanup
2. Adjust `CLEANUP_INTERVAL` for more frequent cleanup
3. Consider restarting the bot daily with Docker restart policy
4. Monitor memory usage trends
</details>

### Reading and Understanding Logs

Logs are stored in the `logs/` directory:

- `pump-monitor.log`: Contains all logs
- `error.log`: Contains only error-level logs

Example log entry:

```json
{
  "level": "info",
  "message": "Found 3 new tokens, processing...",
  "timestamp": "2025-02-27 10:15:30",
  "service": "pump-monitor"
}
```

Error logs include stack traces and additional context:

```json
{
  "level": "error",
  "message": "API Error:",
  "error": "Request failed with status code 429",
  "stack": "Error: Request failed with status code 429\n    at createError (/app/node_modules/axios/lib/core/createError.js:16:15)...",
  "response": {
    "status": 429,
    "data": {
      "error": "Too Many Requests"
    }
  },
  "timestamp": "2025-02-27 10:15:30",
  "service": "pump-monitor"
}
```

### Debugging Tips

1. **Increase Log Level**: Set `LOG_LEVEL=debug` to see more details
2. **Check API Responses**: Look for API communication issues in logs
3. **Monitor Memory Usage**: Use `docker stats` to check resource usage
4. **Database Queries**: Review Supabase logs for slow queries
5. **Real-time Logs**: Use `docker-compose logs -f` to follow logs in real time

### Support Resources

- **Issues**: Open an issue on the GitHub repository
- **Documentation**: Refer to this README and code comments
- **Community**: Join our community Discord/Telegram (if available)
- **DexScreener API**: [DexScreener API Documentation](https://docs.dexscreener.com/api/reference)
- **Supabase**: [Supabase Documentation](https://supabase.io/docs)

---

## 📄 License & Credits

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Acknowledgments

- [DexScreener API](https://docs.dexscreener.com/api/reference) for providing token data
- [Supabase](https://supabase.io/) for database services
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) for Telegram integration
- [Winston](https://github.com/winstonjs/winston) for logging

### Third-Party APIs

- **DexScreener API**: Used for token data retrieval with rate limits of 300 requests per minute
- **Telegram Bot API**: Used for sending notifications and handling commands
- **Supabase/PostgreSQL**: Used for data storage and persistence

### Contributors

- [Your Name](https://github.com/yourusername) - Creator and maintainer

<details>
<summary>How to Become a Contributor</summary>

1. Check out our [Contributing Guide](CONTRIBUTING.md)
2. Fork the repository and make your changes
3. Submit a Pull Request
4. Join our community discussions

We welcome contributions of all kinds, including:
- Bug fixes
- Feature enhancements
- Documentation improvements
- UI enhancements
- Testing improvements

</details>

---

## 🔗 Related Projects

- [Solana Token Tracker](https://github.com/example/solana-token-tracker)
- [Dexscreener API Client](https://github.com/example/dexscreener-api-client)
- [Telegram Trading Bot](https://github.com/example/telegram-trading-bot)

---

⭐ Found this project helpful? Star it on GitHub! ⭐
