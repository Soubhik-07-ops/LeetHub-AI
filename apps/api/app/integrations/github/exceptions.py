class GitHubIntegrationError(Exception):
    """Base exception for GitHub integration errors."""
    pass

class GitHubAuthenticationError(GitHubIntegrationError):
    """Raised when GitHub token is invalid or missing."""
    pass

class GitHubNotFoundError(GitHubIntegrationError):
    """Raised when a repository or file is not found."""
    pass

class GitHubRateLimitError(GitHubIntegrationError):
    """Raised when GitHub API rate limit is exceeded."""
    pass

class GitHubConflictError(GitHubIntegrationError):
    """Raised when there is a conflict (e.g., outdated SHA during update)."""
    pass
