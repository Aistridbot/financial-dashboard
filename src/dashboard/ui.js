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

  function toRatio(value, base) {
    if (!base) return 0;
    return value / base;
  }

  var loading = qs('#dashboard-loading');
  var error = qs('#dashboard-error');
  var summary = qs('#summary-cards');
  var params = new URLSearchParams(window.location.search);
  var portfolioId = params.get('portfolioId');

  function showError(message) {
    if (loading) loading.hidden = true;
    if (summary) summary.hidden = true;
    if (error) {
      error.hidden = false;
      error.textContent = message;
    }
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
    })
    .catch(function () {
      showError('Unable to load dashboard summary. Please retry.');
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
  toSummaryViewModel,
  renderDashboardPage,
  renderDashboardClientScript,
  registerDashboardUiRoutes,
};
