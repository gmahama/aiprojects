# 13F Portfolio Analyzer

A modern, user-friendly web application for analyzing 13F filings and discovering hedge fund portfolios. Built with HTML, CSS, and JavaScript, this tool helps you find new 13F filers with concentrated portfolios (less than 15 positions).

## Features

- **Clean, Modern UI**: Beautiful gradient design with responsive layout
- **Filer Search**: Search by company name or CIK number
- **Portfolio Analysis**: View holdings, share counts, market values, and position changes
- **Options Toggle**: Include or exclude call/put options from analysis
- **New Filer Detection**: Automatically identifies first-time 13F filers
- **Position Tracking**: Compare current quarter vs. previous quarter holdings
- **Concentration Filtering**: Focus on portfolios with limited positions

## Setup

1. **Download Files**: Save both `index.html` and `script.js` to the same directory
2. **API Keys**: Your Whale Wisdom API keys are already configured in the application
3. **Open Application**: Double-click `index.html` or open it in your web browser
4. **Ready to Use**: The application is pre-configured and ready to analyze portfolios!

## Usage

### Basic Search
1. Enter a filer name (e.g., "Berkshire Hathaway") or CIK number
2. Select a filing period (optional - defaults to most recent)
3. Set maximum positions to filter (default: 15)
4. Toggle options inclusion on/off
5. Click "Analyze Portfolio"

### Understanding Results

**Filer Information**
- Company name and CIK
- Total number of positions
- Whether this is a new 13F filer

**Holdings Table**
- **Security Name**: Stock/security identifier
- **Shares**: Current share count
- **Market Value**: Current market value in USD
- **Position Change**: Change in shares vs. previous quarter
  - Green: Position increased
  - Red: Position decreased
  - Gray: New position or no change
- **% of Portfolio**: Position weight in the portfolio

**New Filer Alerts**
- Special highlighting for new filers with ≤15 positions
- Perfect for finding concentrated, focused portfolios

## API Endpoints Used

The application uses the following Whale Wisdom API endpoints:
- `/filers/search` - Search for filers by name/CIK
- `/filers/{cik}/holdings` - Get portfolio holdings
- `/filers/{cik}/filings` - Check filing history

## Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript (no frameworks)
- **API**: RESTful calls to Whale Wisdom API
- **Data Processing**: Client-side filtering and calculations
- **Responsive Design**: Works on desktop and mobile devices

## Troubleshooting

**"API key not configured"**
- The application is pre-configured with your API keys

**"Filer not found"**
- Check spelling of company name
- Try using the CIK number instead
- Verify the company files 13F reports

**"Error analyzing portfolio"**
- Check your internet connection
- Verify your API key is valid
- Check Whale Wisdom API status

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Data Sources

All data is sourced from the Whale Wisdom API, which aggregates 13F filings from the SEC. 13F filings are required quarterly reports from institutional investment managers with over $100 million in assets under management.

## Legal Notice

This application is for informational purposes only. Investment decisions should not be based solely on 13F filing data. Always conduct thorough research and consider consulting with financial professionals before making investment decisions.

## Support

For technical issues with this application, check the browser console for error messages. For API-related issues, contact Whale Wisdom support.
