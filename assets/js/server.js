require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

app.post('/exchange_public_token', async (req, res) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: req.body.public_token,
    });
    const accessToken = response.data.access_token;
    // Store the access token securely (e.g., in a database)
    res.json({ access_token: accessToken });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
});

app.post('/create_link_token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: 'user_good', // Use a unique identifier for the user
      },
      client_name: 'Your App Name',
      products: ['auth', 'transactions'], // Specify the products you need
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

console.log('PLAID_CLIENT_ID:', process.env.PLAID_CLIENT_ID);
console.log('PLAID_SECRET:', process.env.PLAID_SECRET);

app.listen(3000, () => console.log('Server running on port 3000'));