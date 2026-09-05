import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import './app.css';
import App from './App.svelte';

registerSW({ immediate: true });

const target = document.getElementById('app');
if (!target) throw new Error('#app container not found');

const app = mount(App, { target });

export default app;
