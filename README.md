# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1aa21081-1230-4b6f-96da-12cb197da7d3

## Deployment Solution

The geo-profile-dashboard now includes a complete deployment solution for VPS hosting with scheduled execution of profiles via SimpleMDM API. Key features:

- **Express Server**: Replaces Vercel functions with a standard Express server
- **Scheduler**: Uses cron jobs to run schedules at specified times
- **Cloudflare Tunnel**: Provides secure access without exposing ports
- **PM2 Process Management**: Ensures the application stays running
- **Comprehensive Documentation**: Includes detailed deployment guides

### Deployment Documents

- [Deployment Guide](DEPLOYMENT.md) - Step-by-step deployment instructions
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Comprehensive setup checklist
- [Cron Setup Guide](CRON_SETUP.md) - Details on setting up cron jobs
- [Monitoring Guide](MONITORING.md) - Guidance on monitoring and maintenance
- [Quick Profile Scheduler](QUICK_PROFILE_SCHEDULER.md) - Guide for temporary profile installations

### Quick Installation

For a quick installation on your VPS (requires root access):

```bash
# Download the installer
wget -O install.sh https://raw.githubusercontent.com/your-username/geo-profile-dashboard/main/install.sh

# Make it executable
chmod +x install.sh

# Run the installer
sudo ./install.sh
```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1aa21081-1230-4b6f-96da-12cb197da7d3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1aa21081-1230-4b6f-96da-12cb197da7d3) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
