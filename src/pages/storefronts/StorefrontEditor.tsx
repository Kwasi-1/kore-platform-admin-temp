import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, History, ImagePlus, Monitor, Smartphone, Trash2, X } from 'lucide-react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  discardStorefrontDraft,
  getStorefrontEditor,
  publishStorefrontDraft,
  restoreStorefrontVersion,
  saveStorefrontDraft,
  uploadStorefrontImage,
  type StorefrontEditorData,
} from '@/api/platform';
import {
  FONT_PAIRS,
  TEMPLATE_NAMES,
  TEMPLATE_SECTIONS,
  getAt,
  luminance,
  setAt,
  type EditorField,
} from '@/config/storefrontEditor';
import { cn } from '@/lib/utils';

type SaveState = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error';
const AUTOSAVE_MS = 1200;
const errorMessage = (e: any) => e?.response?.data?.error?.message || 'Something went wrong';

/**
 * Visual editor for one store: colours, fonts, images and section text, with the real storefront
 * previewing the draft live. Changes autosave as a draft and go live only on Publish.
 */
export default function StorefrontEditor() {
  const { deploymentId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['storefront-editor', deploymentId],
    queryFn: () => getStorefrontEditor(deploymentId),
  });

  const [content, setContent] = useState<any>(null);
  const [templateId, setTemplateId] = useState('vetshore-retail');
  const [section, setSection] = useState('theme');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [hasDraft, setHasDraft] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const frame = useRef<HTMLIFrameElement>(null);

  const load = useCallback((d: StorefrontEditorData) => {
    setContent(d.draft || {});
    setTemplateId(d.template_id);
    setHasDraft(d.has_draft);
    version.current = d.version;
    setSaveState('saved');
  }, []);

  useEffect(() => {
    if (data) load(data);
  }, [data, load]);

  const previewOrigin = useMemo(() => {
    try {
      return data?.preview_url ? new URL(data.preview_url).origin : null;
    } catch {
      return null;
    }
  }, [data?.preview_url]);

  // Send the draft to the preview iframe as it changes (no save needed to see it)
  const pushToPreview = useCallback(() => {
    if (!previewOrigin || !frame.current?.contentWindow || !content) return;
    frame.current.contentWindow.postMessage({ type: 'kore:editor-content', content, templateId }, previewOrigin);
  }, [content, templateId, previewOrigin]);
  useEffect(pushToPreview, [pushToPreview]);
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin === previewOrigin && e.data?.type === 'kore:preview-ready') pushToPreview();
    };
    window.addEventListener('message', onReady);
    return () => window.removeEventListener('message', onReady);
  }, [previewOrigin, pushToPreview]);

  const save = useCallback(
    async (next: any, nextTemplate: string) => {
      setSaveState('saving');
      try {
        const res = await saveStorefrontDraft(deploymentId, { content: next, template_id: nextTemplate, version: version.current });
        version.current = res.version;
        setHasDraft(true);
        setSaveState('saved');
      } catch (e: any) {
        if (e?.response?.status === 409) {
          setSaveState('conflict');
        } else {
          setSaveState('error');
          toast.error(errorMessage(e));
        }
      }
    },
    [deploymentId],
  );

  const update = (next: any, nextTemplate = templateId) => {
    setContent(next);
    setTemplateId(nextTemplate);
    if (saveState === 'conflict') return;
    setSaveState('unsaved');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next, nextTemplate), AUTOSAVE_MS);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Leaving with an autosave still pending
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === 'unsaved' || saveState === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  const sections = TEMPLATE_SECTIONS[templateId] ?? TEMPLATE_SECTIONS['vetshore-retail'];
  const active = sections.find((s) => s.key === section) ?? sections[0];
  const missing = sections.flatMap((s) => s.fields).filter((f) => f.required && !String(getAt(content, f.path) ?? '').trim());

  const switchTemplate = (next: string) => {
    if (next === templateId) return;
    const lost = TEMPLATE_SECTIONS[templateId]
      .filter((s) => !TEMPLATE_SECTIONS[next].some((n) => n.key === s.key))
      .map((s) => s.label);
    if (lost.length) toast(`${TEMPLATE_NAMES[next]} doesn't show: ${lost.join(', ')}. That content is kept.`, { icon: 'ℹ️' });
    update(content, next);
  };

  const run = async (label: string, fn: () => Promise<StorefrontEditorData>, success: string) => {
    clearTimeout(timer.current);
    setBusy(label);
    try {
      const d = await fn();
      queryClient.setQueryData(['storefront-editor', deploymentId], d);
      load(d);
      toast.success(success);
      frame.current?.contentWindow?.location.reload();
    } catch (e: any) {
      if (e?.response?.status === 409) setSaveState('conflict');
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (missing.length) {
      toast.error(`Fill in ${missing.map((f) => f.label.toLowerCase()).join(', ')} first`);
      return;
    }
    if (saveState === 'unsaved' || saveState === 'saving') await save(content, templateId);
    await run('publish', () => publishStorefrontDraft(deploymentId, version.current), 'Published: shoppers see the changes now');
  };

  if (isLoading || !data || !content) {
    return <div className="p-8"><div className="h-64 rounded-2xl bg-muted/40 animate-pulse" /></div>;
  }

  const statusText: Record<SaveState, string> = {
    saved: hasDraft ? 'Draft saved · not live yet' : 'No changes',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    conflict: 'Someone else edited this store',
    error: "Couldn't save",
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-1rem)] min-h-0">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <button type="button" onClick={() => navigate('/storefronts')} className="p-2 rounded-lg hover:bg-muted" aria-label="Back to storefronts">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 mr-auto">
          <p className="text-sm font-semibold truncate">{data.tenant_name}</p>
          <p className={cn('text-xs', saveState === 'conflict' || saveState === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
            {statusText[saveState]}
          </p>
        </div>
        <select
          value={templateId}
          onChange={(e) => switchTemplate(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          aria-label="Template"
        >
          {Object.entries(TEMPLATE_NAMES).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setHistoryOpen(true)}>
          <History className="h-4 w-4" /> History
        </Button>
        {hasDraft && (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!busy}
            onClick={() => window.confirm('Discard all unpublished changes?') && run('discard', () => discardStorefrontDraft(deploymentId), 'Draft discarded')}
          >
            Discard draft
          </Button>
        )}
        <Button size="sm" disabled={!!busy || saveState === 'conflict' || (!hasDraft && saveState === 'saved')} onClick={publish}>
          {busy === 'publish' ? 'Publishing…' : 'Publish'}
        </Button>
      </header>

      {saveState === 'conflict' && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 text-sm">
          <span>Someone else changed this store while you were editing. Reload to get their version (your unsaved edits here will be lost).</span>
          <Button size="sm" variant="outline" onClick={() => refetch().then((r) => r.data && load(r.data))}>Reload</Button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sections and fields */}
        <aside className="w-[380px] shrink-0 border-r border-border flex flex-col min-h-0">
          <nav className="flex flex-wrap gap-1 p-3 border-b border-border">
            {sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn('px-3 h-8 rounded-full text-xs font-medium', s.key === active.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {active.fields.map((f) => (
              <FieldEditor
                key={f.path}
                field={f}
                value={getAt(content, f.path)}
                onChange={(v) => update(setAt(content, f.path, v))}
                deploymentId={deploymentId}
              />
            ))}
          </div>
        </aside>

        {/* Live preview */}
        <section className="flex-1 min-w-0 flex flex-col bg-muted/30">
          <div className="flex items-center justify-center gap-1 py-2">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={cn('p-2 rounded-lg', device === d ? 'bg-background shadow-sm' : 'text-muted-foreground')}
                aria-label={d === 'desktop' ? 'Desktop preview' : 'Phone preview'}
              >
                {d === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 flex justify-center px-4 pb-4">
            {data.preview_url ? (
              <iframe
                ref={frame}
                src={data.preview_url}
                title="Store preview"
                className={cn('h-full bg-background rounded-xl border border-border shadow-sm', device === 'desktop' ? 'w-full' : 'w-[390px]')}
              />
            ) : (
              <p className="self-center text-sm text-muted-foreground">No preview available</p>
            )}
          </div>
        </section>
      </div>

      <CustomModal
        isOpen={historyOpen}
        onOpenChange={() => setHistoryOpen(false)}
        size="md"
        header={<h3 className="text-base font-bold">Published versions</h3>}
        body={
          <div className="pb-4 space-y-2">
            {data.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing published from the editor yet.</p>
            ) : (
              data.versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium">Version {v.number} · {TEMPLATE_NAMES[v.template_id || ''] ?? v.template_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.published_at ? new Date(v.published_at).toLocaleString() : ''}{v.published_by ? ` · ${v.published_by}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => {
                      setHistoryOpen(false);
                      run('restore', () => restoreStorefrontVersion(deploymentId, v.id), `Version ${v.number} loaded as a draft; publish to make it live`);
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        }
      />
    </div>
  );
}

/** One editable field, by type */
function FieldEditor({ field, value, onChange, deploymentId }: { field: EditorField; value: any; onChange: (v: any) => void; deploymentId: string }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const label = (
    <p className="text-xs font-semibold text-foreground mb-1.5">
      {field.label}
      {field.required && <span className="text-destructive"> *</span>}
    </p>
  );
  const help = field.help && <p className="text-[11px] text-muted-foreground mt-1">{field.help}</p>;

  const upload = async (file: File, onUrl: (url: string) => void) => {
    setUploading(true);
    try {
      onUrl(await uploadStorefrontImage(deploymentId, file));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (field.type === 'text' || field.type === 'textarea') {
    const text = String(value ?? '');
    const over = field.max != null && text.length > field.max;
    return (
      <div>
        {label}
        {field.type === 'text' ? (
          <Input value={text} onChange={(e) => onChange(e.target.value)} className={cn('h-9 text-sm', over && 'border-destructive')} />
        ) : (
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm', over && 'border-destructive')}
          />
        )}
        {field.max != null && (
          <p className={cn('text-[11px] mt-1 text-right', over ? 'text-destructive' : 'text-muted-foreground')}>{text.length}/{field.max}</p>
        )}
        {help}
      </div>
    );
  }

  if (field.type === 'color') {
    const color = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#111111';
    const lum = luminance(color) ?? 0;
    return (
      <div>
        {label}
        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-border bg-background" aria-label={field.label} />
          <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm font-mono w-32" placeholder="#111111" />
        </div>
        {lum > 0.85 && <p className="text-[11px] text-amber-600 mt-1">Very light: buttons may be hard to see on a white page.</p>}
        {help}
      </div>
    );
  }

  if (field.type === 'font') {
    return (
      <div>
        {label}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className={cn('rounded-xl border px-3 py-2 text-left text-xs', !value ? 'border-foreground bg-muted/40' : 'border-border')}
          >
            <span className="block font-medium">Template default</span>
          </button>
          {FONT_PAIRS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.key)}
              className={cn('rounded-xl border px-3 py-2 text-left text-xs', value === p.key ? 'border-foreground bg-muted/40' : 'border-border')}
            >
              <span className="block font-medium">{p.label}</span>
              <span className="block text-muted-foreground truncate">{p.heading} / {p.body}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'image' || field.type === 'images') {
    const list: string[] = field.type === 'image' ? (value ? [value] : []) : Array.isArray(value) ? value : [];
    const max = field.type === 'image' ? 1 : field.max ?? 1;
    const setList = (next: string[]) => onChange(field.type === 'image' ? next[0] || undefined : next);
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-2">
          {list.map((url, i) => (
            <div key={url + i} className="relative h-20 w-28 rounded-lg overflow-hidden border border-border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setList(list.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 flex items-center justify-center"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {list.length < max && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="h-20 w-28 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:border-foreground/40"
            >
              <ImagePlus className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Add image'}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file, (url) => setList([...list, url].slice(0, max)));
          }}
        />
        {help ?? <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG or WebP, up to 5 MB. Leave empty for the template's own image.</p>}
      </div>
    );
  }

  // values: up to `max` title + description pairs
  const values: { title: string; description: string }[] = (Array.isArray(value) ? value : []).map((v: any) =>
    typeof v === 'string' ? { title: v, description: '' } : { title: v?.title ?? '', description: v?.description ?? '' },
  );
  const setValue = (i: number, key: 'title' | 'description', text: string) =>
    onChange(values.map((v, j) => (j === i ? { ...v, [key]: text } : v)));
  return (
    <div>
      {label}
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="rounded-lg border border-border p-2 space-y-1.5">
            <div className="flex gap-1.5">
              <Input value={v.title} onChange={(e) => setValue(i, 'title', e.target.value)} placeholder="Value" className="h-8 text-sm" />
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove value">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input value={v.description} onChange={(e) => setValue(i, 'description', e.target.value)} placeholder="One line about it" className="h-8 text-sm" />
          </div>
        ))}
        {values.length < (field.max ?? 4) && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...values, { title: '', description: '' }])}>
            Add value
          </Button>
        )}
      </div>
    </div>
  );
}
