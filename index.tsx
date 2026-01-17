import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Set document metadata (title + favicon)
const faviconHref = new URL('./components/icons/dealer.svg', import.meta.url).href;
document.title = 'BJAP';
const existingFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
const favicon = existingFavicon ?? Object.assign(document.createElement('link'), { rel: 'icon' });
favicon.href = faviconHref;
if (!existingFavicon) {
	document.head.appendChild(favicon);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
