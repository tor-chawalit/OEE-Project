/**
 * Navigation Component Manager
 * Handles loading and managing the navigation bar across all pages
 */
class NavigationManager {
  constructor() {
    this.initialized = false;
    this.currentPage = this.getCurrentPage();
  }

  /**
   * Initialize navigation component
   */
  async init() {
    if (this.initialized) return;

    try {
      await this.loadNavbar();
      this.setupEventListeners();
      this.setActivePage();
      this.checkSession();
      this.initialized = true;
      console.log('Navigation Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Navigation Manager:', error);
    }
  }

  /**
   * Load navbar component from separate file
   */
  async loadNavbar() {
    try {
      const response = await fetch('components/navbar.html');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const navbarHTML = await response.text();
      
      // Insert navbar at the beginning of body
      document.body.insertAdjacentHTML('afterbegin', navbarHTML);
      
      // Execute any scripts in the loaded HTML
      this.executeScripts();
      
    } catch (error) {
      console.error('Error loading navbar:', error);
      // Fallback to basic navbar if component fails to load
      this.createFallbackNavbar();
    }
  }

  /**
   * Execute scripts from loaded navbar component
   */
  executeScripts() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.innerHTML.includes('DOMContentLoaded')) {
        // Execute the script content
        eval(script.innerHTML);
      }
    });
  }

  /**
   * Create fallback navbar if component fails to load
   */
  createFallbackNavbar() {
    const fallbackNav = `
      <nav class="navbar navbar-dark bg-primary">
        <div class="container-fluid">
          <a class="navbar-brand" href="index.html">
            <i class="bi bi-gear-fill me-2"></i>ระบบควบคุมเครื่องจักร
          </a>
          <div class="d-flex gap-2">
            <a href="index.html" class="btn btn-outline-light btn-sm">ปฏิทิน</a>
            <a href="dashboard.html" class="btn btn-outline-light btn-sm">แดชบอร์ด</a>
            <a href="history.html" class="btn btn-outline-light btn-sm">ประวัติ</a>
            <button class="btn btn-danger btn-sm" onclick="logout()">ออกจากระบบ</button>
          </div>
        </div>
      </nav>
    `;
    document.body.insertAdjacentHTML('afterbegin', fallbackNav);
  }

  /**
   * Get current page name
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'index';
    return page;
  }

  /**
   * Set active navigation link
   */
  setActivePage() {
    setTimeout(() => {
      const navLinks = document.querySelectorAll('.nav-link-enhanced[data-page]');
      navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === this.currentPage) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }, 100);
  }

  /**
   * Setup event listeners for navigation
   */
  setupEventListeners() {
    // Page visibility change handler
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshUserInfo();
      }
    });

    // Handle navigation link clicks with loading states
    setTimeout(() => {
      const navLinks = document.querySelectorAll('.nav-link-enhanced');
      navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          // Only add loading for actual page navigation
          if (link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
            this.showNavigationLoading();
          }
        });
      });
    }, 100);
  }

  /**
   * Show loading animation during navigation
   */
  showNavigationLoading() {
    const brandIcon = document.querySelector('.brand-icon');
    if (brandIcon) {
      brandIcon.classList.add('loading');
    }
  }

  /**
   * Check user session status
   */
  async checkSession() {
    try {
      const response = await fetch('login.php?action=check', { 
        credentials: 'same-origin' 
      });
      const data = await response.json();
      
      if (!data.loggedIn) {
        window.location.href = 'login.html';
        return;
      }

      // Update user info if available
      if (data.user) {
        this.updateUserDisplay(data.user);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // Redirect to login on session check failure
      window.location.href = 'login.html';
    }
  }

  /**
   * Update user display information
   */
  updateUserDisplay(user) {
    setTimeout(() => {
      const userIdElement = document.getElementById('currentUserId');
      if (userIdElement && user.id) {
        userIdElement.textContent = user.id;
      }

      // Update user name if available
      const userNameElements = document.querySelectorAll('.user-name');
      userNameElements.forEach(element => {
        if (user.name) {
          element.textContent = user.name;
        }
      });
    }, 100);
  }

  /**
   * Refresh user information
   */
  async refreshUserInfo() {
    try {
      const response = await fetch('login.php?action=user_info', { 
        credentials: 'same-origin' 
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        this.updateUserDisplay(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user info:', error);
    }
  }

  /**
   * Handle logout functionality
   */
  async logout() {
    if (!confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      return;
    }

    // Show loading animation
    this.showNavigationLoading();

    try {
      await fetch('logout.php', {
        method: 'POST',
        credentials: 'same-origin'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always redirect to login, even if logout request fails
      window.location.href = 'login.html';
    }
  }

  /**
   * Show notification in navbar
   */
  showNavNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 70px; right: 20px; z-index: 1060; max-width: 350px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Update page title with navigation context
   */
  updatePageTitle(title) {
    const baseTitle = 'ระบบควบคุมเครื่องจักร';
    document.title = title ? `${title} - ${baseTitle}` : baseTitle;
  }

  /**
   * Get navigation instance (singleton pattern)
   */
  static getInstance() {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }
}

// Global navigation instance
const navManager = NavigationManager.getInstance();

// Global functions for backward compatibility
window.logout = () => navManager.logout();
window.showNavNotification = (msg, type) => navManager.showNavNotification(msg, type);

// Auto-initialize navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => navManager.init());
} else {
  navManager.init();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationManager;
}
