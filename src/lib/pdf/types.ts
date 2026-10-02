/** A single positioned text run extracted from a PDF page. */
export type PdfItem = {
  /** Text content of the run. */
  s: string;
  /** Left edge, in PDF points. */
  x: number;
  /** Top edge, in PDF points, measured from the top of the page. */
  y: number;
  /** Width of the run, in PDF points. */
  w: number;
  /** Height of the run, in PDF points. */
  h: number;
};

export type PdfPage = {
  n: number;
  width: number;
  height: number;
  items: PdfItem[];
};
