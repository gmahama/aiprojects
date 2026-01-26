class PortfolioAnalyzer {
    constructor() {
        this.sharedKey = 'RxrZtcsYf6EzIVv12P1R';
        this.secretKey = 'Nbj92Gb7yW3UMpSdmMaLqRtRSdLbdVXSv3NaXZts';
        this.baseUrl = 'https://whalewisdom.com';
        this.currentFiler = null;
        this.currentHoldings = [];
        this.previousHoldings = [];
        
        this.initializeEventListeners();
        
        // Test API connection
        this.testApiConnection();
    }

    initializeEventListeners() {
        // Options toggle
        const optionsToggle = document.getElementById('options-toggle');
        const optionsCheckbox = document.getElementById('options-checkbox');
        const optionsLabel = document.getElementById('options-label');

        optionsToggle.addEventListener('click', () => {
            optionsCheckbox.checked = !optionsCheckbox.checked;
            this.updateOptionsToggle();
        });

        // Search button
        document.getElementById('search-btn').addEventListener('click', () => {
            this.analyzePortfolio();
        });

        // Test API button
        document.getElementById('test-btn').addEventListener('click', () => {
            this.testApiConnection();
        });

        // Enter key in search field
        document.getElementById('filer-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzePortfolio();
            }
        });
    }

    updateOptionsToggle() {
        const optionsToggle = document.getElementById('options-toggle');
        const optionsCheckbox = document.getElementById('options-checkbox');
        const optionsLabel = document.getElementById('options-label');

        if (optionsCheckbox.checked) {
            optionsToggle.classList.add('active');
            optionsLabel.textContent = 'Yes';
        } else {
            optionsToggle.classList.remove('active');
            optionsLabel.textContent = 'No';
        }
    }

    async analyzePortfolio() {
        const filerName = document.getElementById('filer-name').value.trim();
        const filingPeriod = document.getElementById('filing-period').value;
        const maxPositions = document.getElementById('max-positions').value;
        const includeOptions = document.getElementById('options-checkbox').checked;

        if (!filerName) {
            this.showError('Please enter a filer name or CIK');
            return;
        }

        this.showLoading();
        this.disableSearchButton();

        try {
            // First, search for the filer
            const filer = await this.searchFiler(filerName);
            if (!filer) {
                this.showError('Filer not found. Please check the name or CIK.');
                return;
            }

            this.currentFiler = filer;

            // Get current holdings
            const currentHoldings = await this.getHoldings(filer.cik, filingPeriod, includeOptions);
            this.currentHoldings = currentHoldings;

            // Get previous quarter holdings for comparison
            const previousPeriod = this.getPreviousQuarter(filingPeriod);
            const previousHoldings = await this.getHoldings(filer.cik, previousPeriod, includeOptions);
            this.previousHoldings = previousHoldings;

            // Check if this is a new filer
            const isNewFiler = await this.checkIfNewFiler(filer.cik);

            // Filter holdings based on max positions
            const filteredHoldings = this.filterHoldingsByPositionCount(currentHoldings, maxPositions);

            // Display results
            this.displayResults(filer, filteredHoldings, isNewFiler);

        } catch (error) {
            console.error('Error analyzing portfolio:', error);
            this.showError(`Error analyzing portfolio: ${error.message}`);
        } finally {
            this.hideLoading();
            this.enableSearchButton();
        }
    }

    async searchFiler(searchTerm) {
        try {
            console.log('Searching for filer:', searchTerm);
            console.log('API URL:', `${this.baseUrl}/shell/command.json?args=search_filers ${encodeURIComponent(searchTerm)}&api_shared_key=${this.sharedKey}&api_sig=${this.secretKey}`);
            
            const response = await fetch(`${this.baseUrl}/shell/command.json?args=search_filers ${encodeURIComponent(searchTerm)}&api_key=${this.sharedKey}`, {
                method: 'GET'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response data:', data);
            
            if (data.filers && data.filers.length > 0) {
                return data.filers[0]; // Return first match
            }
            
            return null;
        } catch (error) {
            console.error('Error searching for filer:', error);
            throw error;
        }
    }

    async getHoldings(cik, filingPeriod, includeOptions) {
        try {
            console.log('Getting holdings for CIK:', cik);
            
            const args = filingPeriod ? `get_holdings ${cik} ${filingPeriod}` : `get_holdings ${cik}`;
            const response = await fetch(`${this.baseUrl}/shell/command.json?args=${encodeURIComponent(args)}&api_key=${this.sharedKey}`, {
                method: 'GET'
            });

            console.log('Holdings response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Holdings API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }

            const data = await response.json();
            console.log('Holdings API Response data:', data);
            
            if (!data.holdings) {
                return [];
            }

            // Filter holdings based on options preference
            let holdings = data.holdings;
            if (!includeOptions) {
                holdings = holdings.filter(holding => 
                    !holding.security_type || 
                    (holding.security_type !== 'call' && holding.security_type !== 'put')
                );
            }

            return holdings;
        } catch (error) {
            console.error('Error getting holdings:', error);
            throw error;
        }
    }

    async checkIfNewFiler(cik) {
        try {
            console.log('Checking if new filer for CIK:', cik);
            
            const args = `get_filing_history ${cik} ${twoYearsAgo.toISOString().split('T')[0]}`;
            const response = await fetch(`${this.baseUrl}/shell/command.json?args=${encodeURIComponent(args)}&api_shared_key=${this.sharedKey}&api_sig=${this.secretKey}`, {
                method: 'GET'
            });

            if (!response.ok) {
                return false; // Assume not new if we can't check
            }

            const data = await response.json();
            console.log('Filing history data:', data);
            
            // If this is the first filing, it's a new filer
            return data.filings && data.filings.length <= 1;
        } catch (error) {
            console.error('Error checking if new filer:', error);
            return false;
        }
    }

    getPreviousQuarter(filingPeriod) {
        if (!filingPeriod) return '';
        
        const date = new Date(filingPeriod);
        date.setMonth(date.getMonth() - 3);
        return date.toISOString().split('T')[0];
    }

    filterHoldingsByPositionCount(holdings, maxPositions) {
        if (!maxPositions || maxPositions >= holdings.length) {
            return holdings;
        }

        // Sort by market value and take top positions
        return holdings
            .sort((a, b) => (b.market_value || 0) - (a.market_value || 0))
            .slice(0, parseInt(maxPositions));
    }

    calculatePositionChange(currentHolding, previousHoldings) {
        const previousHolding = previousHoldings.find(h => 
            h.security_cusip === currentHolding.security_cusip ||
            h.security_name === currentHolding.security_name
        );

        if (!previousHolding) {
            return {
                shares: currentHolding.shares || 0,
                change: 'New Position',
                changeClass: 'neutral'
            };
        }

        const currentShares = currentHolding.shares || 0;
        const previousShares = previousHolding.shares || 0;
        const change = currentShares - previousShares;

        let changeClass = 'neutral';
        if (change > 0) changeClass = 'positive';
        else if (change < 0) changeClass = 'negative';

        return {
            shares: currentShares,
            change: change,
            changeClass: changeClass
        };
    }

    displayResults(filer, holdings, isNewFiler) {
        const resultsDiv = document.getElementById('results');
        
        let html = `
            <div class="filer-info">
                <h3>${filer.name || 'Unknown Filer'}</h3>
                <div class="filer-stats">
                    <div class="stat-item">
                        <div class="stat-value">${holdings.length}</div>
                        <div class="stat-label">Total Positions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${isNewFiler ? 'Yes' : 'No'}</div>
                        <div class="stat-label">New Filer</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${filer.cik}</div>
                        <div class="stat-label">CIK</div>
                    </div>
                </div>
            </div>
        `;

        if (isNewFiler && holdings.length <= 15) {
            html += `
                <div class="success">
                    <i class="fas fa-star"></i> 
                    <strong>New Filer Alert!</strong> This is a new 13F filer with ${holdings.length} positions - perfect for concentrated portfolio analysis!
                </div>
            `;
        }

        if (holdings.length === 0) {
            html += `
                <div class="no-results">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #dee2e6; margin-bottom: 20px;"></i>
                    <h3>No Holdings Found</h3>
                    <p>No holdings were found for the specified period and criteria.</p>
                </div>
            `;
        } else {
            html += `
                <table class="holdings-table">
                    <thead>
                        <tr>
                            <th>Security Name</th>
                            <th>Shares</th>
                            <th>Market Value</th>
                            <th>Position Change</th>
                            <th>% of Portfolio</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            const totalValue = holdings.reduce((sum, h) => sum + (h.market_value || 0), 0);

            holdings.forEach(holding => {
                const positionData = this.calculatePositionChange(holding, this.previousHoldings);
                const portfolioPercentage = totalValue > 0 ? ((holding.market_value || 0) / totalValue * 100).toFixed(2) : '0.00';

                html += `
                    <tr>
                        <td><strong>${holding.security_name || 'Unknown'}</strong></td>
                        <td>${positionData.shares.toLocaleString()}</td>
                        <td>$${(holding.market_value || 0).toLocaleString()}</td>
                        <td class="position-change ${positionData.changeClass}">
                            ${typeof positionData.change === 'number' ? 
                                (positionData.change > 0 ? '+' : '') + positionData.change.toLocaleString() : 
                                positionData.change}
                        </td>
                        <td>${portfolioPercentage}%</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
        }

        resultsDiv.innerHTML = html;
    }

    showLoading() {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <h3>Analyzing Portfolio...</h3>
                <p>Fetching 13F data from Whale Wisdom</p>
            </div>
        `;
    }

    hideLoading() {
        // Loading will be replaced by results
    }

    showError(message) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
    }

    disableSearchButton() {
        const searchBtn = document.getElementById('search-btn');
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    }

    enableSearchButton() {
        const searchBtn = document.getElementById('search-btn');
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Portfolio';
    }

    async testApiConnection() {
        try {
            console.log('Testing API connection...');
            
            // Try different authentication methods for WhaleWisdom API
            const url = `${this.baseUrl}/shell/command.json?args=status&api_key=${this.sharedKey}`;
            console.log('Testing API URL:', url);
            
            const response = await fetch(url, {
                method: 'GET'
            });
            
            console.log('API Status Response:', response.status);
            if (response.ok) {
                console.log('API connection successful!');
                this.showSuccess('API connection test successful!');
            } else {
                console.log('API connection failed with status:', response.status);
                this.showError(`API connection failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error('API connection test failed:', error);
            this.showError(`API connection test failed: ${error.message}`);
        }
    }

    showSuccess(message) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="success">
                <i class="fas fa-check-circle"></i> ${message}
            </div>
        `;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioAnalyzer = new PortfolioAnalyzer();
});
