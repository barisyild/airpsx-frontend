import { h, render } from "preact";
import Toast from "../components/Toast/Toast";

class ToastService {
  static container = null;
  static toasts = [];
  static nextId = 1;

  static init() {
    // Toast container'ı oluştur
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
      this.render();
    }
  }

  static show(message, type = "info", duration = 3000) {
    this.init();
    
    const id = this.nextId++;
    this.toasts.push({ id, message, type, duration });
    this.render();
    
    return id;
  }

  static success(message, duration = 3000) {
    return this.show(message, "success", duration);
  }

  static error(message, duration = 3000) {
    return this.show(message, "error", duration);
  }

  static warning(message, duration = 3000) {
    return this.show(message, "warning", duration);
  }

  static info(message, duration = 3000) {
    return this.show(message, "info", duration);
  }

  static dismiss(id) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.render();
  }

  static render() {
    if (!this.container) return;

    // Dark mode check
    const isDarkMode = document.body.classList.contains('dark') || 
                       document.documentElement.classList.contains('dark') ||
                       localStorage.getItem('theme') === 'dark';

    if (isDarkMode) {
      this.container.classList.add('dark');
    } else {
      this.container.classList.remove('dark');
    }
    
    render(
      <div>
        {this.toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => this.dismiss(toast.id)}
          />
        ))}
      </div>,
      this.container
    );
  }
}

export default ToastService; 