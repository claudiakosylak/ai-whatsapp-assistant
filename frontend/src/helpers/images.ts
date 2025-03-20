export const readImageFile = (file: File): Promise<{ mimeType: string; base64String: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          const result = event.target.result as string;
          const base64String = result.split(',')[1];
          const mimeType = result.split(';')[0].split(':')[1];

          resolve({ mimeType, base64String });
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));

      reader.readAsDataURL(file);
    });
  };

  export function base64ToBlobUrl(base64: string, mimeType: string): string {
    // Decode base64 string to binary data
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    // Create a Blob from the byteArray
    const blob = new Blob([byteArray], { type: mimeType });

    // Generate a temporary URL for the Blob
    return URL.createObjectURL(blob);
  }
