class GitTrack {
  constructor(pat) {
    this.pat = pat;
    this.octokit = new Octokit({ auth: this.pat });
    this.username = 'Boonk8812';
  }

  async authenticate() {
    try {
      await this.octokit.request('/user');
    } catch (error) {
      throw Error('Unable to authorize with GitHub API.');
    }
  }

  async getActivitySummary() {
    try {
      const [events, commits, repos] = await Promise.all([
        this._fetchPublicEvents(),
        this._fetchLatestCommits(),
        this._fetchUpdatedRepositories(),
      ]);

      return { events, commits, repos };
    } catch (error) {
      throw Error('Failed to gather activity summary.');
    }
  }

  displayIframe(summary) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('id', 'github-tracker-iframe');
    iframe.style.fontFamily = '"Arial", sans-serif';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.width = '800px';
    iframe.style.height = '600px';

    iframe.srcdoc = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Git Track Summary</title>
          <style nonce="${Math.random().toString()}">
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 24px;
              font-size: 16px;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              padding: 8px;
              border: 1px solid rgba(0, 0, 0, 0.1);
              vertical-align: top;
            }
            th {
              text-transform: uppercase;
              font-weight: normal;
            }
            strong {
              color: #333;
            }
            .highlight {
              background-color: yellow;
            }
          </style>
        </head>
        <body>
          <h1>GitHub Activity Summary for @${this.username}</h1>
          ${this._renderTable(summary)}
        </body>
      </html>
    `;

    document.body.appendChild(iframe);
  }

  _fetchPublicEvents() {
    return this.octokit.paginate('GET /users/{username}/events/public', {
      username: this.username,
      per_page: 10,
    });
  }

  _fetchLatestCommits() {
    return this.octokit.repos.listCommits({
      username: this.username,
      sort: 'updated',
      direction: 'desc',
      per_page: 10,
    });
  }

  _fetchUpdatedRepositories() {
    return this.octokit.search.repos({
      q: `user:${this.username} fork:false sort:updated`,
      order: 'desc',
      per_page: 10,
    });
  }

  _renderTable(summary) {
    const { events, commits, repos } = summary;
    let eventRowsHtml = '',
      commitRowsHtml = '',
      repoRowsHtml = '';

    for (const event of events) {
      switch (event.type) {
        case 'PushEvent':
          eventRowsHtml += `<tr><td>${this._formatDate(event.created_at)}</td><td><strong>Push Event:</strong></td><td><a href="${event.payload.commits[0].url}" target="_blank">${event.repo.name}</a></td></tr>`;
          break;
        case 'IssueCommentEvent':
          eventRowsHtml += `<tr><td>${this._formatDate(event.created_at)}</td><td><strong>Issue Comment:</strong></td><td><a href="${event.issue.html_url}" target="_blank">${event.repo.name}</a></td></tr>`;
          break;
        case 'CreateEvent':
          eventRowsHtml += `<tr><td>${this._formatDate(event.created_at)}</td><td><strong>Created:</strong></td><td><a href="${event.repo.html_url}" target="_blank">${event.repo.name}</a></td></tr>`;
          break;
      }
    }

    for (const commit of commits) {
      commitRowsHtml += `<tr><td>${this._formatDate(commit.commit.author.date)}</td><td><strong>Commit:</strong></td><td><a href="${commit.html_url}" target="_blank">${commit.sha.substring(0, 7)}</a></td></tr>`;
    }

    for (const repo of repos.items) {
      repoRowsHtml += `<tr><td>${this._formatDate(repo.updated_at)}</td><td><strong>Repository:</strong></td><td><a href="${repo.html_url}" target="_blank">${repo.name}</a></td></tr>`;
    }

    return `
      <table cellpadding="0" cellspacing="0">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Item</th>
          </tr>
        </thead>
        <tbody>
          ${eventRowsHtml}${commitRowsHtml}${repoRowsHtml}
        </tbody>
      </table>
    `;
  }

  _formatDate(timestamp) {
    return Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(timestamp));
  }
}
