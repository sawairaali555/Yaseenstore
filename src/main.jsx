import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<React.StrictMode><App accountUrl="http://localhost:5173/account" checkoutUrl="http://localhost:5173/checkout"/></React.StrictMode>);
