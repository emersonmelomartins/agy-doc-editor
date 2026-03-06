declare module 'mammoth/mammoth.browser' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: MammothConvertOptions
  ): Promise<{ value: string }>;

  export const images: {
    imgElement: (handler: (image: MammothImage) => Promise<{ src: string }>) => (image: MammothImage) => Promise<{ src: string }>;
  };

  export interface MammothImage {
    read(encoding: 'base64'): Promise<string>;
    contentType: string;
  }

  export interface MammothConvertOptions {
    convertImage?: (image: MammothImage) => Promise<{ src: string }>;
    /** Style map: e.g. ["p[style-name='Title'] => h1"]. Preserves semantic and font when mapped. */
    styleMap?: string[];
  }
}

declare module 'mammoth/mammoth.browser.js' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: MammothConvertOptions
  ): Promise<{ value: string }>;

  export const images: {
    imgElement: (handler: (image: MammothImage) => Promise<{ src: string }>) => (image: MammothImage) => Promise<{ src: string }>;
  };

  export interface MammothImage {
    read(encoding: 'base64'): Promise<string>;
    contentType: string;
  }

  export interface MammothConvertOptions {
    convertImage?: (image: MammothImage) => Promise<{ src: string }>;
    styleMap?: string[];
  }
}
