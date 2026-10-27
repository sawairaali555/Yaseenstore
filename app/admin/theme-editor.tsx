"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, Palette, Save, Type } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "@/lib/store-data";

type ThemeEditorProps = { config: Settings; onSave: (updated: Settings) => Promise<boolean> };

const defaults = {
  themePrimaryColor: "#203664",
  themeAccentColor: "#ff5000",
  themeBackgroundColor: "#ffffff",
  themeTextColor: "#1e293b",
  themeFooterColor: "#203664",
  themeFooterTextColor: "#ffffff",
  themeFontFamily: "Inter, Arial, sans-serif",
  themeButtonRadius: "12px",
  themeCardRadius: "16px",
};

export default function ThemeEditor({ config, onSave }: ThemeEditorProps) {
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [draft, setDraft] = useState<Settings>({
    ...defaults,
    ...config,
    themeFooterColor: config.themeFooterColor || config.themePrimaryColor || defaults.themeFooterColor,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft({
      ...defaults,
      ...config,
      themeFooterColor: config.themeFooterColor || config.themePrimaryColor || defaults.themeFooterColor,
    });
    setSaved(false);
  }, [config]);

  const update = (key: keyof typeof defaults, value: string) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (await onSave(draft)) {
        setSaved(true);
        toast.success("Theme changes are live on your storefront");
      }
    } finally {
      setSaving(false);
    }
  };

  const syncPreview = useCallback(() => {
    previewFrame.current?.contentWindow?.postMessage({
      type: "cartify-theme-preview",
      theme: {
        themePrimaryColor: draft.themePrimaryColor,
        themeAccentColor: draft.themeAccentColor,
        themeBackgroundColor: draft.themeBackgroundColor,
        themeTextColor: draft.themeTextColor,
        themeFooterColor: draft.themeFooterColor,
        themeFooterTextColor: draft.themeFooterTextColor,
        themeFontFamily: draft.themeFontFamily,
        themeButtonRadius: draft.themeButtonRadius,
        themeCardRadius: draft.themeCardRadius,
      },
    }, window.location.origin);
  }, [draft]);

  useEffect(() => { syncPreview(); }, [syncPreview]);

  return (
    <div className="theme-editor-shell">
      <div className="theme-editor-header">
        <div>
          <div className="theme-editor-eyebrow"><Palette size={14} /> Storefront design system</div>
          <h1>Frontend Theme Editor</h1>
          <p>Customize the visual language of your storefront and preview changes before publishing.</p>
        </div>
        <button type="button" className="admin-primary theme-editor-save" onClick={save} disabled={saving}>
          {saved && !saving ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? "Saving…" : saved ? "Published" : "Save & publish"}
        </button>
      </div>

      <div className="theme-editor-layout">
        <div className="theme-editor-controls">
          <section className="theme-editor-card">
            <div className="theme-editor-card-title"><Palette size={16} /><div><b>Colors</b><span>Customize your storefront background, text, header, accents, and footer independently.</span></div></div>
            <div className="theme-color-grid">
              {([
                ["themePrimaryColor", "Header & primary color"],
                ["themeAccentColor", "Accent color"],
                ["themeBackgroundColor", "Page background"],
                ["themeTextColor", "Body text color"],
                ["themeFooterColor", "Footer background"],
                ["themeFooterTextColor", "Footer text"],
              ] as [keyof typeof defaults, string][]).map(([key, label]) => (
                <label key={key} className="theme-color-field"><span>{label}</span><div><input type="color" value={String(draft[key])} onChange={(e) => update(key, e.target.value)} /><input value={String(draft[key])} onChange={(e) => update(key, e.target.value)} aria-label={`${label} hex value`} /></div></label>
              ))}
            </div>
          </section>

          <section className="theme-editor-card">
            <div className="theme-editor-card-title"><Type size={16} /><div><b>Typography & shape</b><span>Set the storefront personality and component rhythm</span></div></div>
            <label className="theme-editor-field">Font family<select value={draft.themeFontFamily} onChange={(e) => update("themeFontFamily", e.target.value)}><option value="Inter, Arial, sans-serif">Inter / Arial</option><option value="Georgia, serif">Georgia</option><option value="Verdana, sans-serif">Verdana</option><option value="system-ui, sans-serif">System UI</option></select></label>
            <div className="theme-editor-two-col">
              <label className="theme-editor-field">Button radius<select value={draft.themeButtonRadius} onChange={(e) => update("themeButtonRadius", e.target.value)}><option value="6px">Compact · 6px</option><option value="12px">Modern · 12px</option><option value="20px">Soft · 20px</option><option value="999px">Pill · 999px</option></select></label>
              <label className="theme-editor-field">Card radius<select value={draft.themeCardRadius} onChange={(e) => update("themeCardRadius", e.target.value)}><option value="8px">Compact · 8px</option><option value="16px">Modern · 16px</option><option value="24px">Soft · 24px</option></select></label>
            </div>
          </section>

        </div>

        <section className="theme-editor-preview">
          <div className="theme-editor-preview-label"><Eye size={14} /> Live storefront preview</div>
          <iframe
            ref={previewFrame}
            className="theme-editor-preview-frame"
            src="/?themePreview=1"
            title="Live storefront theme preview"
            onLoad={syncPreview}
          />
        </section>
      </div>
    </div>
  );
}
