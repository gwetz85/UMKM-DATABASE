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

export const generateQRCodeBase64 = async (value: string): Promise<string> => {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(value)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
};
