import JsBarcode from 'jsbarcode';

export const generateBarcodeBase64 = (value: string): string => {
  if (typeof document === 'undefined') return '';
  
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: "CODE128",
    width: 2,
    height: 40,
    displayValue: false,
    margin: 0
  });
  
  return canvas.toDataURL("image/png");
};
