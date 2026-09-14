import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import './app.css';
import App from './App.svelte';

registerSW({ immediate: true });

const target = document.getElementById('app');
if (!target) throw new Error('#app container not found');

const app = mount(App, { target });

export default app;

function notifyAppError(message: string): void {
  window.dispatchEvent(new CustomEvent<string>('app-error', { detail: message }));
}

window.addEventListener('error', (event) => {
  console.error('App error:', event.error);
  notifyAppError('Сталася помилка. Спробуйте оновити сторінку.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  notifyAppError('Сталася помилка. Спробуйте оновити сторінку.');
});
