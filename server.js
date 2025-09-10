
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// FORWARD_WEBHOOK_URL: Replace this with your actual destination webhook URL.
// This is where the incoming data will be sent.
const FORWARD_WEBHOOK_URL = process.env.FORWARD_WEBHOOK_URL || 'https://qh4ltblkwgtg4uczgrvqgcyi.hooks.n8n.cloud/';

// WEBHOOK_SECRET: A secret token to verify that incoming requests are legitimate.
// The sender must include this token in the 'x-webhook-token' header.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_secret_token_here_for_security';

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Middleware function to verify the incoming webhook's secret token
function verifyWebhook(req, res, next) {
  const providedToken = req.headers['x-webhook-token'];
  if (providedToken !== WEBHOOK_SECRET) {
    console.log('Unauthorized webhook attempt. Wrong token.');
    return res.status(401).send('Unauthorized: Invalid token');
  }
  // If the token is correct, proceed to the main handler
  next();
}

// Define the main webhook endpoint at /webhook
// It uses the 'verifyWebhook' middleware first.
app.post('/webhook', verifyWebhook, async (req, res) => {
  const eventPayload = req.body;
  console.log('Received authenticated webhook event:', eventPayload);

  try {
    // Forward the event to the destination webhook
    const forwardResponse = await fetch(FORWARD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'NodeJS-Webhook-Forwarder/1.0'
      },
      body: JSON.stringify(eventPayload),
    });

    // Check if the forwarding was successful
    if (!forwardResponse.ok) {
      const errorText = await forwardResponse.text();
      console.error('Failed to forward webhook:', forwardResponse.status, errorText);
      // Don't send the external error back to the original sender for security
      return res.status(502).send('Bad Gateway: Failed to forward webhook');
    }

    console.log('Successfully forwarded webhook event to:', FORWARD_WEBHOOK_URL);
    res.status(200).send({
      status: 'success',
      message: 'Webhook received and forwarded successfully'
    });

  } catch (error) {
    console.error('Error forwarding webhook:', error.message);
    res.status(500).send('Internal Server Error while forwarding webhook');
  }
});

// Start the server and listen for connections
app.listen(port, () => {
  console.log(`Webhook forwarding server is running.`);
  console.log(`Listening on port: ${port}`);
  console.log(`Forwarding incoming POST requests from /webhook to: ${FORWARD_WEBHOOK_URL}`);
  console.log('Ensure incoming requests include the "x-webhook-token" header for authentication.');
});
