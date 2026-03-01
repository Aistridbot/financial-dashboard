const CURRENCY_LOCALE = 'en-US';

function formatCurrency(value, currency = 'USD') {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value) {
  const numericValue = Number(value) || 0;
  const sign = numericValue > 0 ? '+' : '';
  return `${sign}${(numericValue * 100).toFixed(2)}%`;
}

function formatQuantity(value) {
  const amount = Number(value) || 0;
  return amount.toFixed(4);
}

function formatTransactionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toISOString().slice(0, 10);
}

function toSummaryViewModel(summary) {
  const investedValue = Number(summary.investedValue) || 0;
  const dayChange = Number(summary.dayChange) || 0;
  const totalGainLoss = Number(summary.totalGainLoss) || 0;
  const currency = summary.currency || 'USD';

  const toRatio = (value) => {
    if (!investedValue) {
      return 0;
    }

    return value / investedValue;
  };

  return {
    totalValueText: formatCurrency(summary.totalValue, currency),
    investedValueText: formatCurrency(investedValue, currency),
    dayChangeText: formatCurrency(dayChange, currency),
    dayChangePercentText: formatPercent(toRatio(dayChange)),
    totalGainLossText: formatCurrency(totalGainLoss, currency),
    totalGainLossPercentText: formatPercent(toRatio(totalGainLoss)),
  };
}

function renderDashboardPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Financial Dashboard</title>
  </head>
  <body>
    <main>
      <h1>Portfolio dashboard</h1>
      <p id="dashboard-loading" data-testid="dashboard-loading">Loading dashboard summary...</p>
      <p id="dashboard-error" data-testid="dashboard-error" hidden>Unable to load dashboard summary.</p>
      <section id="summary-cards" data-testid="dashboard-summary" aria-label="Portfolio summary" hidden>
        <article data-testid="summary-card-total-value">
          <h2>Total value</h2>
          <p data-testid="summary-value-total-value">--</p>
        </article>
        <article data-testid="summary-card-invested">
          <h2>Invested</h2>
          <p data-testid="summary-value-invested">--</p>
        </article>
        <article data-testid="summary-card-day-change">
          <h2>Day change</h2>
          <p data-testid="summary-value-day-change">--</p>
          <p data-testid="summary-value-day-change-percent">--</p>
        </article>
        <article data-testid="summary-card-gain-loss">
          <h2>Gain/loss</h2>
          <p data-testid="summary-value-gain-loss">--</p>
          <p data-testid="summary-value-gain-loss-percent">--</p>
        </article>
      </section>

      <section aria-label="Portfolio transactions" data-testid="transactions-section">
        <h2>Recent transactions</h2>
        <label for="portfolio-selector">Portfolio</label>
        <select id="portfolio-selector" data-testid="portfolio-selector"></select>
        <p id="transactions-loading" data-testid="transactions-loading" hidden>Loading transactions...</p>
        <p id="transactions-error" data-testid="transactions-error" hidden>Unable to load transactions.</p>
        <p id="transactions-empty" data-testid="transactions-empty" hidden>No transactions found for this portfolio.</p>
        <table data-testid="transactions-table" aria-label="Transactions table" hidden>
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody data-testid="transactions-table-body"></tbody>
        </table>
      </section>
    </main>
    <script src="/dashboard.js"></script>
  </body>
</html>`;
}

function renderDashboardClientScript() {
  return `'use strict';
(function () {
  function qs(id) { return document.querySelector(id); }

  function setText(testId, value) {
    var element = qs('[data-testid="' + testId + '"]');
    if (element) element.textContent = value;
  }

  function formatCurrency(value, currency) {
    var amount = Number(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  function formatPercent(value) {
    var numericValue = Number(value) || 0;
    var sign = numericValue > 0 ? '+' : '';
    return sign + (numericValue * 100).toFixed(2) + '%';
  }

  function formatQuantity(value) {
    var amount = Number(value) || 0;
    return amount.toFixed(4);
  }

  function formatTransactionDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toISOString().slice(0, 10);
  }

  function toRatio(value, base) {
    if (!base) return 0;
    return value / base;
  }

  var loading = qs('#dashboard-loading');
  var error = qs('#dashboard-error');
  var summary = qs('#summary-cards');
  var params = new URLSearchParams(window.location.search);
  var portfolioId = params.get('portfolioId');

  var portfolioSelector = qs('#portfolio-selector');
  var transactionsLoading = qs('#transactions-loading');
  var transactionsError = qs('#transactions-error');
  var transactionsEmpty = qs('#transactions-empty');
  var transactionsTable = qs('[data-testid="transactions-table"]');
  var transactionsBody = qs('[data-testid="transactions-table-body"]');

  function showError(message) {
    if (loading) loading.hidden = true;
    if (summary) summary.hidden = true;
    if (error) {
      error.hidden = false;
      error.textContent = message;
    }
  }

  function setTransactionsState(options) {
    if (transactionsLoading) transactionsLoading.hidden = !options.loading;
    if (transactionsError) {
      transactionsError.hidden = !options.error;
      if (options.errorMessage) transactionsError.textContent = options.errorMessage;
    }
    if (transactionsEmpty) transactionsEmpty.hidden = !options.empty;
    if (transactionsTable) transactionsTable.hidden = !options.showTable;
  }

  function renderTransactions(items, currency) {
    if (!transactionsBody) return;
    transactionsBody.innerHTML = '';

    items.forEach(function (item) {
      var row = document.createElement('tr');
      row.innerHTML = [
        '<td>' + formatTransactionDate(item.occurredAt) + '</td>',
        '<td>' + (item.symbol || '') + '</td>',
        '<td>' + (item.type || '') + '</td>',
        '<td>' + formatQuantity(item.quantity) + '</td>',
        '<td>' + formatCurrency(item.price, currency) + '</td>',
        '<td>' + formatCurrency(item.totalAmount, currency) + '</td>'
      ].join('');
      transactionsBody.appendChild(row);
    });
  }

  function loadTransactions(selectedPortfolioId, currency) {
    if (!selectedPortfolioId) {
      setTransactionsState({ loading: false, error: true, errorMessage: 'Unable to load transactions. Missing portfolio selection.', empty: false, showTable: false });
      return Promise.resolve();
    }

    setTransactionsState({ loading: true, error: false, empty: false, showTable: false });

    return fetch('/api/portfolios/' + encodeURIComponent(selectedPortfolioId) + '/transactions')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP_' + response.status);
        return response.json();
      })
      .then(function (data) {
        var items = Array.isArray(data.items) ? data.items : [];
        if (items.length === 0) {
          if (transactionsBody) transactionsBody.innerHTML = '';
          setTransactionsState({ loading: false, error: false, empty: true, showTable: false });
          return;
        }

        renderTransactions(items, currency);
        setTransactionsState({ loading: false, error: false, empty: false, showTable: true });
      })
      .catch(function () {
        setTransactionsState({ loading: false, error: true, errorMessage: 'Unable to load transactions. Please retry.', empty: false, showTable: false });
      });
  }

  function loadPortfolioSelectorAndTransactions() {
    if (!portfolioSelector) return Promise.resolve();

    setTransactionsState({ loading: true, error: false, empty: false, showTable: false });

    return fetch('/api/portfolios')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP_' + response.status);
        return response.json();
      })
      .then(function (data) {
        var items = Array.isArray(data.items) ? data.items : [];
        portfolioSelector.innerHTML = '';

        items.forEach(function (portfolio) {
          var option = document.createElement('option');
          option.value = portfolio.id;
          option.textContent = portfolio.name + ' (' + (portfolio.baseCurrency || 'USD') + ')';
          option.dataset.currency = portfolio.baseCurrency || 'USD';
          portfolioSelector.appendChild(option);
        });

        if (items.length === 0) {
          setTransactionsState({ loading: false, error: false, empty: true, showTable: false });
          return;
        }

        var selectedId = portfolioId || items[0].id;
        portfolioSelector.value = selectedId;

        var selectedOption = portfolioSelector.options[portfolioSelector.selectedIndex];
        var selectedCurrency = selectedOption ? (selectedOption.dataset.currency || 'USD') : 'USD';

        portfolioSelector.addEventListener('change', function () {
          var option = portfolioSelector.options[portfolioSelector.selectedIndex];
          var currency = option ? (option.dataset.currency || 'USD') : 'USD';
          loadTransactions(portfolioSelector.value, currency);
        });

        return loadTransactions(selectedId, selectedCurrency);
      })
      .catch(function () {
        setTransactionsState({ loading: false, error: true, errorMessage: 'Unable to load transactions. Please retry.', empty: false, showTable: false });
      });
  }

  if (!portfolioId) {
    showError('Unable to load dashboard summary. Missing portfolioId query parameter.');
    return;
  }

  fetch('/api/dashboard/summary?portfolioId=' + encodeURIComponent(portfolioId))
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP_' + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      var investedValue = Number(data.investedValue) || 0;
      var dayChange = Number(data.dayChange) || 0;
      var totalGainLoss = Number(data.totalGainLoss) || 0;
      var currency = data.currency || 'USD';

      setText('summary-value-total-value', formatCurrency(data.totalValue, currency));
      setText('summary-value-invested', formatCurrency(investedValue, currency));
      setText('summary-value-day-change', formatCurrency(dayChange, currency));
      setText('summary-value-day-change-percent', formatPercent(toRatio(dayChange, investedValue)));
      setText('summary-value-gain-loss', formatCurrency(totalGainLoss, currency));
      setText('summary-value-gain-loss-percent', formatPercent(toRatio(totalGainLoss, investedValue)));

      if (loading) loading.hidden = true;
      if (error) error.hidden = true;
      if (summary) summary.hidden = false;

      return loadPortfolioSelectorAndTransactions();
    })
    .catch(function () {
      showError('Unable to load dashboard summary. Please retry.');
      setTransactionsState({ loading: false, error: true, errorMessage: 'Unable to load transactions. Please retry.', empty: false, showTable: false });
    });
})();`;
}

function registerDashboardUiRoutes(app) {
  app.get('/dashboard', (_req, res) => {
    res.type('html').send(renderDashboardPage());
  });

  app.get('/dashboard.js', (_req, res) => {
    res.type('application/javascript').send(renderDashboardClientScript());
  });
}

module.exports = {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatTransactionDate,
  toSummaryViewModel,
  renderDashboardPage,
  renderDashboardClientScript,
  registerDashboardUiRoutes,
};
