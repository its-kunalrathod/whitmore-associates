# Whitmore & Associates - Vercel Deployment

## Project Structure

```
├── index.html          # Main website homepage
├── chat.js             # AI chat widget
├── vercel.json         # Vercel configuration
├── dashboard/
│   └── index.html      # Partner dashboard (password: partner2026)
```

## Deploy to Vercel

### Option 1: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from project folder:
   ```bash
   cd D:\project
   vercel --prod
   ```

### Option 2: Using Vercel Web Interface

1. Go to https://vercel.com/new
2. Import your GitHub repository (or drag & drop the folder)
3. Click "Deploy"

### Option 3: Using Vercel Git Integration

1. Push these files to a GitHub/GitLab/Bitbucket repo
2. Connect repo to Vercel
3. Auto-deploy on every push

## After Deployment

- **Homepage**: `https://your-project.vercel.app`
- **Dashboard**: `https://your-project.vercel.app/dashboard`
- **Dashboard Password**: `partner2026`

## Connect n8n Webhook

Edit `chat.js` line 1:
```javascript
N8N_WEBHOOK_URL: 'https://your-n8n-instance.com/webhook/chat-assistant'
```

Replace with your actual n8n webhook URL.

## Files Summary

| File | Size | Purpose |
|------|------|---------|
| index.html | 36.5 KB | Main website with inline CSS |
| chat.js | 19.4 KB | AI chat widget (minified) |
| dashboard/index.html | 20.8 KB | Partner dashboard with inline CSS |
| vercel.json | 0.6 KB | Routing configuration |

**Total: ~77 KB** - Optimized for fast loading
# Cache bust Tue Apr 28 04:55:58 EDT 2026
