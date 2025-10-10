# Contributing to Refocus

Thank you for your interest in contributing to Refocus! This document provides guidelines and information for contributors, especially for Hacktoberfest participants.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Hacktoberfest](#hacktoberfest)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **MongoDB** (local instance or MongoDB Atlas account)
- **Git**

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/refocus-frontend.git
   cd refocus-frontend
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/refocus-frontend.git
   ```

## Development Setup

### 1. Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority

# NextAuth Configuration
NEXTAUTH_SECRET=your-long-random-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Optional: Daily.co API (for video sessions)
DAILY_API_KEY=your-daily-api-key
```

**Note**: For local development, you can use MongoDB Atlas (free tier) or set up a local MongoDB instance.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 4. Verify Setup

1. Open your browser and navigate to `http://localhost:3000`
2. Try registering a new account
3. Test the login functionality
4. Explore the dashboard and chat features

## Project Structure

```
refocus-frontend/
├── app/                          # Next.js App Router
│   ├── (product)/               # Product routes (dashboard, chat, etc.)
│   │   ├── components/          # React components
│   │   ├── dashboard/           # Dashboard pages
│   │   └── sessions/            # Session pages
│   ├── api/                     # API routes
│   │   ├── auth/                # Authentication endpoints
│   │   ├── chat/                # Chat functionality
│   │   ├── friends/             # Friends management
│   │   ├── session-requests/    # Session request handling
│   │   ├── sessions/            # Session management
│   │   └── users/               # User endpoints
│   ├── auth/                    # Authentication pages
│   └── globals.css              # Global styles
├── components/                   # Shared components
├── lib/                         # Utility libraries
│   ├── auth.ts                  # Authentication utilities
│   ├── mongodb.ts               # Database connection
│   ├── utils.ts                 # General utilities
│   └── ...
├── assets/                      # Static assets
└── ...
```

### Key Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: NextAuth.js with MongoDB adapter
- **Database**: MongoDB
- **Real-time**: Server-Sent Events (SSE)
- **Video**: Daily.co integration

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Fixes**: Fix existing issues
2. **Feature Additions**: Add new functionality
3. **Documentation**: Improve docs and comments
4. **UI/UX Improvements**: Enhance the user interface
5. **Performance**: Optimize code and performance
6. **Testing**: Add tests and improve coverage
7. **Code Quality**: Refactor and improve code structure

### Contribution Workflow

1. **Check Existing Issues**: Look for existing issues or discussions
2. **Create an Issue**: If you have an idea, create an issue first
3. **Get Assigned**: Wait for maintainer approval or assignment
4. **Create a Branch**: Create a feature branch from `main`
5. **Make Changes**: Implement your changes
6. **Test**: Ensure your changes work correctly
7. **Submit PR**: Create a pull request with a clear description

### Branch Naming

Use descriptive branch names:

- `feature/user-profile-enhancement`
- `fix/chat-message-display-bug`
- `docs/update-contributing-guide`
- `refactor/auth-middleware`

## Pull Request Process

### Before Submitting

1. **Update your fork**: Sync with the upstream repository

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit them:

   ```bash
   git add .
   git commit -m "Add: brief description of changes"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Requirements

Your pull request should include:

1. **Clear Title**: Descriptive title explaining the changes
2. **Description**: Detailed description of what was changed and why
3. **Issue Reference**: Link to related issues (e.g., "Fixes #123")
4. **Screenshots**: If applicable, include screenshots of UI changes
5. **Testing Notes**: Describe how you tested the changes
6. **Breaking Changes**: Note any breaking changes

### PR Template

```markdown
## Description

Brief description of the changes made.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested locally
- [ ] All existing tests pass
- [ ] New tests added (if applicable)

## Screenshots (if applicable)

Add screenshots here.

## Checklist

- [ ] Code follows the project's coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors or warnings
```

## Issue Guidelines

### Creating Issues

When creating an issue, please:

1. **Use the issue template** if available
2. **Provide clear description** of the problem or feature request
3. **Include steps to reproduce** for bugs
4. **Add screenshots** if applicable
5. **Label appropriately** (bug, enhancement, documentation, etc.)

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `hacktoberfest`: Suitable for Hacktoberfest participants

## Coding Standards

### Code Style

1. **TypeScript**: Use TypeScript for all new code
2. **ESLint**: Follow the project's ESLint configuration
3. **Formatting**: Use consistent indentation (2 spaces)
4. **Naming**: Use descriptive variable and function names
5. **Comments**: Add comments for complex logic

### File Organization

1. **Components**: Use PascalCase for component files
2. **Utilities**: Use camelCase for utility functions
3. **Constants**: Use UPPER_SNAKE_CASE for constants
4. **Folders**: Use lowercase with hyphens for folder names

### React Best Practices

1. **Functional Components**: Use functional components with hooks
2. **Props**: Define proper TypeScript interfaces for props
3. **State**: Use appropriate state management (useState, useEffect)
4. **Performance**: Optimize with React.memo when necessary

### API Routes

1. **Error Handling**: Implement proper error handling
2. **Validation**: Validate input data
3. **Response Format**: Use consistent response formats
4. **Status Codes**: Use appropriate HTTP status codes

## Testing

### Running Tests

```bash
# Run linting
npm run lint

# Build the project
npm run build

# Start production server (after build)
npm run start
```

### Testing Checklist

Before submitting your PR:

- [ ] Code compiles without errors
- [ ] No ESLint warnings or errors
- [ ] Application builds successfully
- [ ] Features work as expected
- [ ] No console errors in browser
- [ ] Responsive design works on different screen sizes

## Hacktoberfest

### Hacktoberfest Guidelines

This project participates in Hacktoberfest! Here's what you need to know:

1. **Eligible Contributions**:

   - Bug fixes
   - New features
   - Documentation improvements
   - Code refactoring
   - UI/UX enhancements

2. **Quality Standards**:

   - PRs must be meaningful contributions
   - No spam or low-effort changes
   - Must follow the project's coding standards
   - Must be approved by maintainers

3. **Getting Started for Hacktoberfest**:
   - Look for issues labeled `hacktoberfest` or `good first issue`
   - Read this contributing guide thoroughly
   - Set up your development environment
   - Ask questions in discussions if needed

### Good First Issues

Look for issues with these labels:

- `good first issue`: Perfect for beginners
- `hacktoberfest`: Specifically for Hacktoberfest participants
- `help wanted`: Areas where we need help

### Hacktoberfest Tips

1. **Start Small**: Begin with documentation or small bug fixes
2. **Ask Questions**: Don't hesitate to ask questions in discussions
3. **Be Patient**: Maintainers are volunteers, please be patient
4. **Follow Guidelines**: Ensure your PRs follow all guidelines
5. **Quality over Quantity**: Focus on meaningful contributions

## Getting Help

### Resources

- **Documentation**: Check the README.md and code comments
- **Issues**: Search existing issues for similar problems
- **Discussions**: Use GitHub Discussions for questions
- **Discord/Slack**: Check if there's a community chat (if available)

### Contact

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Maintainers**: Tag maintainers in relevant issues/PRs

## Recognition

Contributors will be recognized in:

- Project README
- Release notes
- Contributor acknowledgments

Thank you for contributing to Refocus! 🎉

---

_This contributing guide is a living document. Please suggest improvements by opening an issue or pull request._
