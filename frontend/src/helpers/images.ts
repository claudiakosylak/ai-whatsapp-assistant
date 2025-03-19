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
