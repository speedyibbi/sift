/** Options page: LLM provider/key, prefilter rules, and profile. */

import { browser } from '#imports';
import type { Settings, TestResponse } from '@/core';
import { getSettings, setSettings, clearVerdictCache } from '@/storage';
import { PRESETS, presetById } from '@/llm';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const fields = {
  preset: byId<HTMLSelectElement>('preset'),
  model: byId<HTMLInputElement>('model'),
  baseURL: byId<HTMLInputElement>('baseURL'),
  apiKey: byId<HTMLInputElement>('apiKey'),
  test: byId<HTMLButtonElement>('test'),
  testResult: byId<HTMLSpanElement>('testResult'),
  requirePaymentVerified: byId<HTMLInputElement>('requirePaymentVerified'),
  allowFixed: byId<HTMLInputElement>('allowFixed'),
  allowHourly: byId<HTMLInputElement>('allowHourly'),
  minFixedBudget: byId<HTMLInputElement>('minFixedBudget'),
  minHourlyRate: byId<HTMLInputElement>('minHourlyRate'),
  minClientSpend: byId<HTMLInputElement>('minClientSpend'),
  minClientRating: byId<HTMLInputElement>('minClientRating'),
  maxProposals: byId<HTMLInputElement>('maxProposals'),
  requiredKeywords: byId<HTMLTextAreaElement>('requiredKeywords'),
  bannedKeywords: byId<HTMLTextAreaElement>('bannedKeywords'),
  skills: byId<HTMLTextAreaElement>('skills'),
  resume: byId<HTMLTextAreaElement>('resume'),
  resumeFile: byId<HTMLInputElement>('resumeFile'),
  resumeFileHint: byId<HTMLSpanElement>('resumeFileHint'),
  idealJob: byId<HTMLTextAreaElement>('idealJob'),
  cacheTtlHours: byId<HTMLInputElement>('cacheTtlHours'),
  save: byId<HTMLButtonElement>('save'),
  saveResult: byId<HTMLSpanElement>('saveResult'),
};

const toList = (s: string): string[] =>
  s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
const num = (el: HTMLInputElement): number => {
  const n = Number(el.value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function populatePresets(): void {
  for (const p of PRESETS) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    fields.preset.appendChild(opt);
  }
}

// Pick the preset that matches saved provider config, else "local".
function matchPreset(s: Settings): string {
  const found = PRESETS.find(
    (p) => p.kind === s.provider.kind && p.baseURL === s.provider.baseURL,
  );
  return found?.id ?? 'local';
}

function applyPreset(id: string): void {
  const p = presetById(id);
  if (!p) return;
  fields.baseURL.value = p.baseURL;
  fields.model.value = p.defaultModel;
}

let lastSaved: Settings | null = null;

function load(s: Settings): void {
  fields.preset.value = matchPreset(s);
  fields.model.value = s.provider.model;
  fields.baseURL.value = s.provider.baseURL;
  fields.apiKey.value = s.provider.apiKey;

  fields.requirePaymentVerified.checked = s.rules.requirePaymentVerified;
  fields.allowFixed.checked = s.rules.allowFixed;
  fields.allowHourly.checked = s.rules.allowHourly;
  fields.minFixedBudget.value = String(s.rules.minFixedBudget);
  fields.minHourlyRate.value = String(s.rules.minHourlyRate);
  fields.minClientSpend.value = String(s.rules.minClientSpend);
  fields.minClientRating.value = String(s.rules.minClientRating);
  fields.maxProposals.value = String(s.rules.maxProposals);
  fields.requiredKeywords.value = s.rules.requiredKeywords.join('\n');
  fields.bannedKeywords.value = s.rules.bannedKeywords.join('\n');

  fields.skills.value = s.profile.skills.join('\n');
  fields.resume.value = s.profile.resume;
  fields.idealJob.value = s.profile.idealJob;

  fields.cacheTtlHours.value = String(s.cacheTtlHours);
  lastSaved = s;
}

function gather(): Settings {
  const preset = presetById(fields.preset.value);
  return {
    provider: {
      kind: preset?.kind ?? 'openai-compat',
      baseURL: fields.baseURL.value.trim(),
      model: fields.model.value.trim(),
      apiKey: fields.apiKey.value.trim(),
    },
    rules: {
      requirePaymentVerified: fields.requirePaymentVerified.checked,
      allowFixed: fields.allowFixed.checked,
      allowHourly: fields.allowHourly.checked,
      minFixedBudget: num(fields.minFixedBudget),
      minHourlyRate: num(fields.minHourlyRate),
      minClientSpend: num(fields.minClientSpend),
      minClientRating: num(fields.minClientRating),
      maxProposals: num(fields.maxProposals),
      requiredKeywords: toList(fields.requiredKeywords.value),
      bannedKeywords: toList(fields.bannedKeywords.value),
    },
    profile: {
      skills: toList(fields.skills.value),
      resume: fields.resume.value.trim(),
      idealJob: fields.idealJob.value.trim(),
    },
    cacheTtlHours: num(fields.cacheTtlHours),
  };
}

async function save(): Promise<void> {
  const next = gather();
  // Profile/rules changes make every prior verdict stale -> drop the cache.
  const cacheStale =
    lastSaved !== null &&
    (JSON.stringify(next.profile) !== JSON.stringify(lastSaved.profile) ||
      JSON.stringify(next.rules) !== JSON.stringify(lastSaved.rules));
  await setSettings(next);
  if (cacheStale) await clearVerdictCache();
  lastSaved = next;
  fields.saveResult.textContent = cacheStale
    ? 'Saved ✓ — cached verdicts cleared'
    : 'Saved ✓';
  fields.saveResult.className = 'status ok';
  setTimeout(() => (fields.saveResult.textContent = ''), 2500);
}

fields.preset.addEventListener('change', () => applyPreset(fields.preset.value));
fields.save.addEventListener('click', () => void save());
fields.resumeFile.addEventListener('change', async () => {
  const file = fields.resumeFile.files?.[0];
  if (!file) return;
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  fields.resumeFileHint.textContent = `Reading "${file.name}"…`;
  try {
    let text: string;
    if (isPdf) {
      // pdf.js (via unpdf) is ~1MB, so pull it in only when a PDF is actually picked.
      const { getDocumentProxy, extractText } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      const res = await extractText(pdf, { mergePages: true });
      text = (Array.isArray(res.text) ? res.text.join('\n\n') : res.text).trim();
      if (!text) throw new Error('no selectable text found (scanned/image PDF?)');
    } else {
      text = await file.text();
    }
    fields.resume.value = text;
    fields.resumeFileHint.textContent = `Loaded "${file.name}" (${text.length.toLocaleString()} chars). Review above, then Save.`;
  } catch (e) {
    fields.resumeFileHint.textContent = `Could not read "${file.name}": ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    fields.resumeFile.value = ''; // let the same file be re-picked after edits
  }
});
fields.test.addEventListener('click', async () => {
  fields.testResult.textContent = 'Testing…';
  fields.testResult.className = 'status';
  try {
    await save(); // background reads the saved provider config
    const resp = (await browser.runtime.sendMessage({
      type: 'TEST_CONNECTION',
    })) as TestResponse | undefined;
    // No response = background worker asleep/reloaded (common after HMR); without
    // this guard the line below throws and the button stays stuck on "Testing…".
    if (!resp) throw new Error('No response from background worker — reload the extension, then retry.');
    fields.testResult.textContent = resp.ok ? 'Connection OK ✓' : `Failed: ${resp.error}`;
    fields.testResult.className = resp.ok ? 'status ok' : 'status err';
  } catch (e) {
    fields.testResult.textContent = `Failed: ${e instanceof Error ? e.message : String(e)}`;
    fields.testResult.className = 'status err';
  }
});

populatePresets();
void getSettings().then(load);
