import { h, render } from "preact";
import Toast from "../components/Toast/Toast";

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration: number;
}

class ToastService {
  static container: HTMLDivElement | null = null;
  static toasts: ToastItem[] = [];
  static nextId: number = 1;

  static init(): void {
    // Toast container'ı oluştur
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
      this.render();
    }
  }

  static show(message: string, type: 'info' | 'success' | 'error' | 'warning' = "info", duration: number = 3000): number {
    this.init();
    
    const id = this.nextId++;
    this.toasts.push({ id, message, type, duration });
    this.render();
    
    return id;
  }

  static success(message: string, duration: number = 3000): number {
    return this.show(message, "success", duration);
  }

  static error(message: string, duration: number = 3000): number {
    return this.show(message, "error", duration);
  }

  static warning(message: string, duration: number = 3000): number {
    return this.show(message, "warning", duration);
  }

  static info(message: string, duration: number = 3000): number {
    return this.show(message, "info", duration);
  }

  static dismiss(id: number): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.render();
  }

  static render(): void {
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

