/**
 * What the storefront visual editor can change, per template. A field appears only where the
 * template actually shows it, so nothing is edited that shoppers never see.
 * FONT_PAIRS must match templates/kore-unified-storefront/src/core/fonts.ts.
 */

export const FONT_PAIRS: { key: string; label: string; heading: string; body: string }[] = [
  { key: 'classic', label: 'Classic', heading: 'Playfair Display', body: 'Inter' },
  { key: 'elegant', label: 'Elegant', heading: 'Cormorant Garamond', body: 'Lato' },
  { key: 'editorial', label: 'Editorial', heading: 'DM Serif Display', body: 'DM Sans' },
  { key: 'warm', label: 'Warm', heading: 'Fraunces', body: 'Work Sans' },
  { key: 'modern', label: 'Modern', heading: 'Poppins', body: 'Inter' },
  { key: 'bold', label: 'Bold', heading: 'Montserrat', body: 'Open Sans' },
  { key: 'clean', label: 'Clean', heading: 'Manrope', body: 'Manrope' },
  { key: 'friendly', label: 'Friendly', heading: 'Nunito', body: 'Nunito' },
];

export type FieldType = 'text' | 'textarea' | 'color' | 'font' | 'image' | 'images' | 'values';

export interface EditorField {
  /** Path in the content, e.g. "hero.headline" */
  path: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Character limit (text) or image count (images) */
  max?: number;
  help?: string;
}

export interface EditorSection {
  key: 'theme' | 'hero' | 'about' | 'contact' | 'seo';
  label: string;
  fields: EditorField[];
}

const THEME: EditorSection = {
  key: 'theme',
  label: 'Colours & fonts',
  fields: [
    { path: 'theme.primary_color', label: 'Brand colour', type: 'color', help: 'Buttons, links and highlights. Text on top switches between dark and white automatically.' },
    { path: 'theme.font_pair', label: 'Fonts', type: 'font' },
  ],
};

const ABOUT: EditorSection = {
  key: 'about',
  label: 'About / Our story',
  fields: [
    { path: 'about.title', label: 'Title', type: 'text', max: 80 },
    { path: 'about.subtitle', label: 'Subtitle', type: 'text', max: 140 },
    { path: 'about.story', label: 'Story', type: 'textarea', max: 1200 },
    { path: 'about.founder_story', label: 'Founder story', type: 'textarea', max: 1200 },
    { path: 'about.heritage_title', label: 'Heritage title', type: 'text', max: 80 },
    { path: 'about.heritage_text', label: 'Heritage text', type: 'textarea', max: 800 },
    { path: 'about.commitment_text', label: 'Commitment', type: 'textarea', max: 600 },
    { path: 'about.values', label: 'Values', type: 'values', max: 4 },
    { path: 'about.image_url', label: 'Story image', type: 'image', help: 'Square works best (about 1200 × 1200).' },
  ],
};

const SEO: EditorSection = {
  key: 'seo',
  label: 'Search & sharing',
  fields: [
    { path: 'seo.meta_title', label: 'Page title', type: 'text', max: 70, help: 'Shown in Google results and the browser tab.' },
    { path: 'seo.meta_description', label: 'Description', type: 'textarea', max: 160 },
    { path: 'seo.share_image_url', label: 'Share image', type: 'image', help: 'Shown when the store link is shared (1200 × 630).' },
  ],
};

export const TEMPLATE_SECTIONS: Record<string, EditorSection[]> = {
  'linea-luxury': [
    THEME,
    {
      key: 'hero',
      label: 'Hero',
      fields: [
        { path: 'hero.headline', label: 'Headline', type: 'text', required: true, max: 80 },
        { path: 'hero.subheadline', label: 'Subheadline', type: 'text', max: 160 },
        { path: 'hero.images', label: 'Hero image', type: 'images', max: 1, help: 'Wide works best (16:9, about 1920 × 1080).' },
      ],
    },
    ABOUT,
    {
      key: 'contact',
      label: 'Contact',
      fields: [
        { path: 'contact.phone', label: 'Phone', type: 'text', max: 30 },
        { path: 'contact.whatsapp', label: 'WhatsApp', type: 'text', max: 30 },
        { path: 'contact.email', label: 'Email', type: 'text', max: 120 },
        { path: 'contact.instagram', label: 'Instagram', type: 'text', max: 60 },
        { path: 'contact.address', label: 'Address', type: 'textarea', max: 240 },
      ],
    },
    SEO,
  ],
  'vetshore-retail': [
    THEME,
    {
      key: 'hero',
      label: 'Hero',
      fields: [
        { path: 'hero.headline', label: 'Headline', type: 'text', required: true, max: 80 },
        { path: 'hero.subheadline', label: 'Subheadline', type: 'text', max: 160 },
        { path: 'hero.cta_text', label: 'Button text', type: 'text', max: 30 },
        { path: 'hero.images', label: 'Hero images', type: 'images', max: 3, help: 'Up to 3; they rotate. Wide works best (about 1920 × 1080).' },
      ],
    },
    ABOUT,
    SEO,
  ],
};

export const TEMPLATE_NAMES: Record<string, string> = {
  'linea-luxury': 'Linea Luxe',
  'vetshore-retail': 'Vetshore Flow',
};

/** Read a value at "a.b.c" */
export const getAt = (obj: any, path: string) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/** A copy of obj with "a.b.c" set to value */
export const setAt = (obj: any, path: string, value: any): any => {
  const [head, ...rest] = path.split('.');
  const base = obj && typeof obj === 'object' ? obj : {};
  return { ...base, [head]: rest.length ? setAt(base[head], rest.join('.'), value) : value };
};

/** WCAG relative luminance of a #rrggbb colour (0 black, 1 white), or null */
export const luminance = (hex?: string): number | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
