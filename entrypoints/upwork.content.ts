import { defineContentScript, browser } from '#imports';
import type { Message, ScoreResponse } from '@/core';
import { startAnnotator } from '@/content';
import { upwork } from '@/platforms';

export default defineContentScript({
  matches: ['*://*.upwork.com/*'],
  runAt: 'document_idle',
  main: () =>
    startAnnotator(upwork, (msg: Message) =>
      browser.runtime.sendMessage(msg) as Promise<ScoreResponse>,
    ),
});
