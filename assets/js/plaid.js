
let plaidLinkHandler;

// Initialize Plaid
function initializePlaid() {
  fetch('/create_link_token')
    .then(response => response.json())
    .then(data => {
      if (data.link_token) {
        createPlaidLinkHandler(data.link_token);
      } else {
        console.error('Failed to fetch link token');
      }
    })
    .catch(error => {
      console.error('Error fetching link token:', error);
    });
}

// Create Plaid Link handler
function createPlaidLinkHandler() {
  plaidLinkHandler = Plaid.create({
    token: 'YOUR_LINK_TOKEN', // Replace with your generated link token
    onSuccess: (public_token, metadata) => {
      // Send public_token to your server
      exchangePublicToken(public_token);
    },
    onExit: (err, metadata) => {
      if (err != null) {
        // Handle error
      }
    },
    onEvent: (eventName, metadata) => {
      // Optional: track events
    }
  });
}

// Exchange public token for access token
function exchangePublicToken(publicToken) {
  // This should be done on your server for security reasons
  fetch('/exchange_public_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_token: publicToken }),
  })
  .then(response => response.json())
  .then(data => {
    // Handle the response (access token)
    console.log('Access token received:', data.access_token);
    // Store the access token securely or use it to fetch account data
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

// Open Plaid Link
function openPlaidLink() {
  if (plaidLinkHandler) {
    plaidLinkHandler.open();
  } else {
    console.error('Plaid Link handler not initialized');
  }
}

// Export functions to be used in other files
export { initializePlaid, openPlaidLink };