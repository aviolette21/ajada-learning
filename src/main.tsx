import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/tokens.css';
import './ui/ui.css';
import { App } from './app/App';
import { content } from './content';
import { AppDb } from './storage/db';

const root = createRoot(document.getElementById('root')!);

void navigator.storage?.persist?.();

AppDb.open()
  .then((db) =>
    root.render(
      <StrictMode>
        <App db={db} content={content} />
      </StrictMode>,
    ),
  )
  .catch((err: unknown) => {
    root.render(<pre className="fatal">Ajada could not open its storage on this device.{'\n'}{String(err)}</pre>);
  });
