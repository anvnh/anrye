# AnRye - Advanced Note-Taking Platform

<div align="center">
  <img src="public/favicon.ico" alt="AnRye Logo" width="80" height="80">
  <h3>Your intelligent workspace for notes, code, and collaboration</h3>
  <p>Built with Next.js 15, TypeScript, and modern web technologies</p>
</div>

## ✨ Features

### 📝 Rich Text Editing
- **Markdown Support** with live preview and syntax highlighting
- **Code Execution** with Pyodide for Python and JavaScript
- **LaTeX Math** rendering with KaTeX
- **Obsidian-style Callouts** for better content organization
- **Wiki-style Linking** with autocomplete (`[[note-name]]`)
- **Task Lists** with interactive checkboxes
- **Table Support** with markdown tables
- **Code Blocks** with syntax highlighting for multiple languages

### 🎨 User Experience
- **Split View** - Edit and preview simultaneously
- **Multiple Themes** - Light and dark modes with custom themes
- **Responsive Design** - Works on desktop, tablet, and mobile
- **PWA Support** - Install as a native app
- **Drag & Drop** - Organize notes and folders intuitively
- **Keyboard Shortcuts** - Power user features
- **Font Customization** - Adjustable font family and sizes

### 🔐 Security & Storage
- **End-to-End Encryption** for sensitive notes
- **Multiple Storage Providers**:
  - Google Drive integration
  - Cloudflare R2 + Turso database
- **Real-time Sync** across devices
- **Offline Support** with service workers

### 📅 Calendar Integration
- **Google Calendar** integration
- **Event Management** with rich editing
- **Multiple View Types** - Month, week, day, agenda
- **Event Creation** directly from notes

### 🖼️ Media Management
- **Image Upload** and management
- **Thumbnail Generation** for quick previews
- **Cloud Storage** integration for images
- **Drag & Drop** image uploads

### 🤝 Collaboration
- **Real-time Sync** with other users
- **Share Notes** with public links
- **Version History** and conflict resolution

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm/yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/anrye.git
   cd anrye
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Google OAuth
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Database (if using Turso)
   TURSO_DATABASE_URL=your_turso_url
   TURSO_AUTH_TOKEN=your_turso_token
   
   # Cloudflare R2 (if using R2 storage)
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=your_bucket_name
   R2_ENDPOINT=your_r2_endpoint
   ```

4. **Run the development server**
```bash
pnpm dev
# or
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **CodeMirror 6** - Code editor with syntax highlighting
- **GSAP** - Animation library
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend & Storage
- **Next.js API Routes** - Serverless functions
- **Google Drive API** - File storage and sync
- **Cloudflare R2** - Object storage
- **Turso** - SQLite database
- **MongoDB** - User data and metadata

### Authentication & Security
- **NextAuth.js** - Authentication framework
- **Google OAuth** - Social login
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing
- **Custom Encryption** - End-to-end encryption

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **pnpm** - Fast package manager
- **Turbopack** - Fast bundling (dev mode)

## 📁 Project Structure

```
anrye/
├── app/                          # Next.js App Router
│   ├── (home)/                   # Main application routes
│   │   ├── notes/               # Notes application
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── services/       # API services
│   │   │   └── utils/          # Utility functions
│   │   └── utils/              # Shared utilities
│   ├── api/                     # API routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── storage/            # Storage management
│   │   └── ai/                 # AI features
│   └── components/             # Shared components
├── components/                  # Reusable UI components
├── lib/                        # Shared libraries
└── public/                     # Static assets
```

## 🔧 Configuration

### Storage Providers

#### Google Drive (Default)
- No additional configuration required
- Automatic authentication via Google OAuth
- Stores both notes and images

#### Cloudflare R2 + Turso
1. Set up a Cloudflare R2 bucket
2. Create a Turso database
3. Configure environment variables
4. Switch storage provider in settings

### Themes
- **Light Theme** - Clean, minimal design
- **Dark Theme** - Easy on the eyes
- **Custom Themes** - Extensible theming system

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Docker
```bash
docker build -t anrye .
docker run -p 3000:3000 anrye
```

### Manual Deployment
```bash
pnpm build
pnpm start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [CodeMirror](https://codemirror.net/) - Code editor
- [Radix UI](https://www.radix-ui.com/) - UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Google Drive API](https://developers.google.com/drive) - File storage
- [Turso](https://turso.tech/) - Database
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - Object storage

## 📞 Support

- 📧 Email: support@anrye.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/anrye/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/anrye/discussions)

---

<div align="center">
  <p>Made with ❤️ by the AnRye team</p>
  <p>⭐ Star this repo if you found it helpful!</p>
</div>
