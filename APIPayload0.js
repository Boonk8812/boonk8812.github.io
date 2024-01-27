const express = require('express');
const bodyParser = require('body-parser');
const { Octokit } = require("@octokit/rest");
const app = express();
app.use(bodyParser.json());

// Initialize Octokit instance with your GitHub App credentials
const octokit = new Octokit({
  authStrategy: async () => process.env.APP_PRIVATE_KEY // You should store the private key securely!
});

// Define route for handling incoming POST requests from GitHub Webhooks
app.post('/webhook', async (req, res) => {
  const payload = req.body;
  console.log(`Received event: ${payload.action} at repo: ${payload.repository.full_name}`);

  const PayloadJSON = "payload.json"
  
  try {
    if (payload.action === 'opened') {
      // Example action: add label to opened pull request
      await octokit.issues.addLabels({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.pull_request.number,
        labels: ['review requested']
      });

      const AppAPI = new GitHubAppWebhook(PayloadJSON)
      
      console.log(`Added 'review requested' label to PR #${payload.pull_request.number}`);
    } else if (payload.action === 'closed') {
      // Example action: remove assigned users when a pull request is closed
      await octokit.issues.removeAssignees({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.pull_request.number,
        assignees: [payload.sender.login]
      });
      
      console.log(`Removed assignation for user ${payload.sender.login} on PR #${payload.pull_request.number}`);
    }
    
    // Return HTTP success status to acknowledge receipt of the webhook event
    return res.status(200).send('OK');
  } catch (error) {
    console.error(`Failed to handle event: ${error.message}`);
    return res.status(500).send('Error processing webhook event.');
  }
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
