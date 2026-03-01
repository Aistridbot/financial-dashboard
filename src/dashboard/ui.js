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

function validateTransactionFormData(input) {
  const errors = {};
  const values = {
    portfolioId: typeof input.portfolioId === 'string' ? input.portfolioId.trim() : '',
    symbol: typeof input.symbol === 'string' ? input.symbol.trim().toUpperCase() : '',
    type: typeof input.type === 'string' ? input.type.trim().toUpperCase() : '',
    quantity: input.quantity,
    price: input.price,
    occurredAt: typeof input.occurredAt === 'string' ? input.occurredAt.trim() : '',
  };

  if (!values.portfolioId) {
    errors.portfolioId = 'Portfolio is required.';
  }

  if (!values.symbol || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(values.symbol)) {
    errors.symbol = 'Symbol must be 1-10 characters (A-Z, 0-9, ., -).';
  }

  if (values.type !== 'BUY' && values.type !== 'SELL') {
    errors.type = 'Side must be BUY or SELL.';
  }

  const quantityNumber = Number(values.quantity);
  if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
    errors.quantity = 'Quantity must be a positive number.';
  }

  const priceNumber = Number(values.price);
  if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
    errors.price = 'Price must be a positive number.';
  }

  const date = new Date(values.occurredAt);
  if (!values.occurredAt || Number.isNaN(date.getTime())) {
    errors.occurredAt = 'Date must be valid.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value: {
      portfolioId: values.portfolioId,
      symbol: values.symbol,
      type: values.type,
      quantity: quantityNumber,
      price: priceNumber,
      occurredAt: values.occurredAt,
    },
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

      <section aria-label="Record transaction" data-testid="transaction-create-section">
        <h2>Record transaction</h2>
        <form id="transaction-form" data-testid="transaction-form" novalidate>
          <label for="transaction-portfolio">Portfolio</label>
          <select id="transaction-portfolio" name="portfolioId" data-testid="transaction-input-portfolio"></select>
          <p data-testid="transaction-field-error-portfolio" hidden></p>

          <label for="transaction-symbol">Symbol</label>
          <input id="transaction-symbol" name="symbol" data-testid="transaction-input-symbol" type="text" maxlength="10" />
          <p data-testid="transaction-field-error-symbol" hidden></p>

          <label for="transaction-side">Side</label>
          <select id="transaction-side" name="type" data-testid="transaction-input-side">
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <p data-testid="transaction-field-error-side" hidden></p>

          <label for="transaction-quantity">Quantity</label>
          <input id="transaction-quantity" name="quantity" data-testid="transaction-input-quantity" type="number" min="0.0001" step="0.0001" />
          <p data-testid="transaction-field-error-quantity" hidden></p>

          <label for="transaction-price">Price</label>
          <input id="transaction-price" name="price" data-testid="transaction-input-price" type="number" min="0.01" step="0.01" />
          <p data-testid="transaction-field-error-price" hidden></p>

          <label for="transaction-date">Date</label>
          <input id="transaction-date" name="occurredAt" data-testid="transaction-input-date" type="date" />
          <p data-testid="transaction-field-error-date" hidden></p>

          <button type="submit" data-testid="transaction-submit">Create transaction</button>
          <p data-testid="transaction-form-message" hidden></p>
        </form>
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

  function validateTransactionPayload(input) {
    var errors = {};
    var symbol = typeof input.symbol === 'string' ? input.symbol.trim().toUpperCase() : '';
    var type = typeof input.type === 'string' ? input.type.trim().toUpperCase() : '';
    var quantity = Number(input.quantity);
    var price = Number(input.price);
    var occurredAt = typeof input.occurredAt === 'string' ? input.occurredAt.trim() : '';
    var occurredDate = new Date(occurredAt);

    if (!input.portfolioId) errors.portfolioId = 'Portfolio is required.';
    if (!symbol || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) errors.symbol = 'Symbol must be 1-10 characters (A-Z, 0-9, ., -).';
    if (type !== 'BUY' && type !== 'SELL') errors.type = 'Side must be BUY or SELL.';
    if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = 'Quantity must be a positive number.';
    if (!Number.isFinite(price) || price <= 0) errors.price = 'Price must be a positive number.';
    if (!occurredAt || Number.isNaN(occurredDate.getTime())) errors.occurredAt = 'Date must be valid.';

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors,
      value: {
        portfolioId: input.portfolioId,
        symbol: symbol,
        type: type,
        quantity: quantity,
        price: price,
        occurredAt: occurredAt
      }
    };
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

  var transactionForm = qs('[data-testid="transaction-form"]');
  var transactionPortfolioInput = qs('[data-testid="transaction-input-portfolio"]');
  var transactionSymbolInput = qs('[data-testid="transaction-input-symbol"]');
  var transactionSideInput = qs('[data-testid="transaction-input-side"]');
  var transactionQuantityInput = qs('[data-testid="transaction-input-quantity"]');
  var transactionPriceInput = qs('[data-testid="transaction-input-price"]');
  var transactionDateInput = qs('[data-testid="transaction-input-date"]');
  var transactionSubmit = qs('[data-testid="transaction-submit"]');
  var transactionFormMessage = qs('[data-testid="transaction-form-message"]');

  function setFieldError(testId, message) {
    var element = qs('[data-testid="' + testId + '"]');
    if (!element) return;
    element.hidden = !message;
    element.textContent = message || '';
  }

  function clearFieldErrors() {
    setFieldError('transaction-field-error-portfolio', '');
    setFieldError('transaction-field-error-symbol', '');
    setFieldError('transaction-field-error-side', '');
    setFieldError('transaction-field-error-quantity', '');
    setFieldError('transaction-field-error-price', '');
    setFieldError('transaction-field-error-date', '');
  }

  function setTransactionMessage(message, isError) {
    if (!transactionFormMessage) return;
    transactionFormMessage.hidden = !message;
    transactionFormMessage.textContent = message || '';
    transactionFormMessage.dataset.variant = isError ? 'error' : 'success';
  }

  function setSubmitPending(isPending) {
    if (transactionSubmit) transactionSubmit.disabled = !!isPending;
  }

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

  function loadSummary(selectedPortfolioId) {
    return fetch('/api/dashboard/summary?portfolioId=' + encodeURIComponent(selectedPortfolioId))
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP_' + response.status);
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

  function getSelectedPortfolioCurrency() {
    if (!portfolioSelector || portfolioSelector.selectedIndex < 0) return 'USD';
    var option = portfolioSelector.options[portfolioSelector.selectedIndex];
    return option ? (option.dataset.currency || 'USD') : 'USD';
  }

  function syncTransactionFormPortfolio(selectedId) {
    if (!transactionPortfolioInput || !portfolioSelector) return;

    transactionPortfolioInput.innerHTML = portfolioSelector.innerHTML;
    transactionPortfolioInput.value = selectedId || portfolioSelector.value;
  }

  function syncPortfolioSelectors(selectedId) {
    if (portfolioSelector && selectedId) {
      portfolioSelector.value = selectedId;
    }

    if (transactionPortfolioInput && selectedId) {
      transactionPortfolioInput.value = selectedId;
    }
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
          syncTransactionFormPortfolio('');
          setTransactionsState({ loading: false, error: false, empty: true, showTable: false });
          return;
        }

        var selectedId = portfolioId || items[0].id;
        portfolioSelector.value = selectedId;
        syncTransactionFormPortfolio(selectedId);

        portfolioSelector.addEventListener('change', function () {
          syncPortfolioSelectors(portfolioSelector.value);
          loadSummary(portfolioSelector.value)
            .catch(function () {
              showError('Unable to load dashboard summary. Please retry.');
            });
          loadTransactions(portfolioSelector.value, getSelectedPortfolioCurrency());
        });

        if (transactionPortfolioInput) {
          transactionPortfolioInput.addEventListener('change', function () {
            syncPortfolioSelectors(transactionPortfolioInput.value);
          });
        }

        return Promise.all([
          loadSummary(selectedId),
          loadTransactions(selectedId, getSelectedPortfolioCurrency())
        ]);
      })
      .catch(function () {
        setTransactionsState({ loading: false, error: true, errorMessage: 'Unable to load transactions. Please retry.', empty: false, showTable: false });
        setTransactionMessage('Unable to load portfolios for transaction creation.', true);
      });
  }

  function mapServerFieldErrors(errorPayload) {
    var details = errorPayload && errorPayload.error && errorPayload.error.details;
    var mapped = {};
    if (!details || typeof details !== 'object') return mapped;

    if (details.field === 'symbol') mapped.symbol = errorPayload.error.message;
    if (details.field === 'quantity') mapped.quantity = errorPayload.error.message;
    if (details.field === 'price') mapped.price = errorPayload.error.message;
    if (details.field === 'occurredAt') mapped.occurredAt = errorPayload.error.message;
    if (details.field === 'type') mapped.type = errorPayload.error.message;

    return mapped;
  }

  function bindTransactionCreateFlow() {
    if (!transactionForm) return;

    transactionForm.addEventListener('submit', function (event) {
      event.preventDefault();
      clearFieldErrors();
      setTransactionMessage('', false);

      var validation = validateTransactionPayload({
        portfolioId: transactionPortfolioInput ? transactionPortfolioInput.value : '',
        symbol: transactionSymbolInput ? transactionSymbolInput.value : '',
        type: transactionSideInput ? transactionSideInput.value : '',
        quantity: transactionQuantityInput ? transactionQuantityInput.value : '',
        price: transactionPriceInput ? transactionPriceInput.value : '',
        occurredAt: transactionDateInput ? transactionDateInput.value : ''
      });

      if (!validation.isValid) {
        setFieldError('transaction-field-error-portfolio', validation.errors.portfolioId || '');
        setFieldError('transaction-field-error-symbol', validation.errors.symbol || '');
        setFieldError('transaction-field-error-side', validation.errors.type || '');
        setFieldError('transaction-field-error-quantity', validation.errors.quantity || '');
        setFieldError('transaction-field-error-price', validation.errors.price || '');
        setFieldError('transaction-field-error-date', validation.errors.occurredAt || '');
        setTransactionMessage('Please fix the highlighted fields.', true);
        return;
      }

      var payload = {
        type: validation.value.type,
        symbol: validation.value.symbol,
        quantity: validation.value.quantity,
        price: validation.value.price,
        occurredAt: validation.value.occurredAt
      };

      setSubmitPending(true);

      fetch('/api/portfolios/' + encodeURIComponent(validation.value.portfolioId) + '/transactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (response.ok) return response.json();

          return response.json()
            .catch(function () { return { error: { message: 'Unable to create transaction.' } }; })
            .then(function (errorPayload) {
              var serverFieldErrors = mapServerFieldErrors(errorPayload);
              setFieldError('transaction-field-error-symbol', serverFieldErrors.symbol || '');
              setFieldError('transaction-field-error-side', serverFieldErrors.type || '');
              setFieldError('transaction-field-error-quantity', serverFieldErrors.quantity || '');
              setFieldError('transaction-field-error-price', serverFieldErrors.price || '');
              setFieldError('transaction-field-error-date', serverFieldErrors.occurredAt || '');
              setTransactionMessage((errorPayload.error && errorPayload.error.message) || 'Unable to create transaction.', true);
              throw new Error('CREATE_FAILED');
            });
        })
        .then(function () {
          if (transactionForm) transactionForm.reset();
          if (transactionSideInput) transactionSideInput.value = 'BUY';
          if (transactionPortfolioInput) transactionPortfolioInput.value = validation.value.portfolioId;
          setTransactionMessage('Transaction created successfully.', false);

          syncPortfolioSelectors(validation.value.portfolioId);

          return Promise.all([
            loadSummary(validation.value.portfolioId),
            loadTransactions(validation.value.portfolioId, getSelectedPortfolioCurrency())
          ]);
        })
        .catch(function (errorObject) {
          if (errorObject && errorObject.message === 'CREATE_FAILED') {
            return;
          }

          setTransactionMessage('Unable to create transaction. Please retry.', true);
        })
        .finally(function () {
          setSubmitPending(false);
        });
    });
  }

  bindTransactionCreateFlow();

  if (!portfolioId) {
    showError('Unable to load dashboard summary. Missing portfolioId query parameter.');
    setTransactionsState({ loading: false, error: true, errorMessage: 'Unable to load transactions. Missing portfolio selection.', empty: false, showTable: false });
    setTransactionMessage('Portfolio selection is required to create transactions.', true);
    return;
  }

  loadPortfolioSelectorAndTransactions()
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
  validateTransactionFormData,
  renderDashboardPage,
  renderDashboardClientScript,
  registerDashboardUiRoutes,
};