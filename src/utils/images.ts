import { IMAGE_DIR } from "../constants"
import path from 'path';
import fs from 'fs';

export const saveImageFile = (base64String: string, imageName: string) => {
    const fileBuffer = Buffer.from(base64String, "base64"); // Convert Base64 to Buffer
    const uniqueFileName = Date.now() + path.extname(imageName);
    const filePath = path.join(IMAGE_DIR, uniqueFileName)
    fs.writeFileSync(filePath, fileBuffer);
    return `/images/${uniqueFileName}`
}

export const deleteImageFiles = () => {
  // Read the contents of the images directory
  fs.readdir(IMAGE_DIR, (err, files) => {
    if (err) {
      console.error('Error reading images directory:', err);
      return;
    }

    // Iterate over each file and delete it
    files.forEach((file) => {
      const filePath = path.join(IMAGE_DIR, file);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file ${file}:`, err);
        } else {
          console.log(`Deleted file: ${file}`);
        }
      });
    });
  });
};
