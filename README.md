# AI Projects Collection 🚀

A curated collection of AI-powered projects, tools, and experiments showcasing various technologies and use cases.

## 🌟 Featured Projects

### 📊 [13F Filing Scraper](./13f_scraper/) - **NEW!**
A production-quality Python tool to scrape 13F-HR filings from SEC EDGAR with first-time filer detection and holdings filtering capabilities.

**Key Features:**
- **First-Time Filer Detection**: Automatically identifies funds filing 13F-HR for the first time
- **Holdings Filtering**: Filter results by minimum/maximum holdings count
- **Web Interface**: Beautiful HTML frontend for easy interaction
- **REST API**: Programmatic access via FastAPI endpoints
- **Rate Limiting**: Respects SEC EDGAR guidelines (10 requests/second max)

**Quick Start:**
```bash
cd 13f_scraper
python3 start_frontend.py
# Open http://localhost:8000
```

**🌐 [Live Demo](https://gmahama.github.io/aiprojects/) - Try it out without installation!**

### 🎮 [Pong Game](./pong/)
A classic Pong game implementation with modern web technologies.

### 🏆 [Triumphs Tracker](./triumphs/)
A React + TypeScript application for tracking personal achievements and milestones.

### 🧪 [Test Projects](./test_projects/)
Collection of experimental projects and prototypes.

### 📚 [Documentation](./docs/)
Project documentation and resources.

## 🚀 Quick Navigation

- **13F Scraper**: `./13f_scraper/` - SEC filing analysis tool
- **Pong Game**: `./pong/` - Classic arcade game
- **Triumphs**: `./triumphs/` - Achievement tracking app
- **Test Projects**: `./test_projects/` - Experimental prototypes
- **Docs**: `./docs/` - Project documentation

## 🛠️ Technology Stack

- **Python**: 13F scraper, data processing
- **React + TypeScript**: Modern web applications
- **FastAPI**: RESTful API development
- **Node.js**: Frontend build tools and development
- **Vite**: Fast build tooling
- **Tailwind CSS**: Utility-first CSS framework

## 📁 Project Structure

```
aiprojects/
├── 🌐 13f_scraper/          # SEC filing scraper (Python/FastAPI)
├── 🎮 pong/                 # Pong game (HTML/JS)
├── 🏆 triumphs/             # Achievement tracker (React/TS)
├── 🧪 test_projects/        # Experimental projects
├── 📚 docs/                 # Documentation
└── 📖 README.md             # This file
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/gmahama/aiprojects.git
cd aiprojects

# For Python projects (13F scraper)
cd 13f_scraper
pip3 install -r requirements.txt

# For Node.js projects (Triumphs, etc.)
cd triumphs
npm install
```

## 🔧 Development

### Python Projects
```bash
cd 13f_scraper
python3 -m pytest tests/ -v
python3 start_frontend.py
```

### Node.js Projects
```bash
cd triumphs
npm run dev
npm run build
npm test
```

## 📊 Project Status

| Project | Status | Technology | Description |
|---------|--------|------------|-------------|
| 13F Scraper | ✅ Production Ready | Python/FastAPI | SEC filing analysis |
| Pong Game | ✅ Complete | HTML/JS | Classic arcade game |
| Triumphs | ✅ Complete | React/TS | Achievement tracker |
| Test Projects | 🔄 In Progress | Various | Experimental features |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see individual project directories for specific licensing.

## 📞 Support

For questions or issues:
- Check project-specific README files
- Review documentation in each project directory
- Open an issue on GitHub

---

**Happy Coding! 🚀✨**
