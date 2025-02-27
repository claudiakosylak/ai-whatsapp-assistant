import fs from 'fs';
import { AUDIO_DIR } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { MessageMedia } from 'whatsapp-web.js';

export const deleteAudioFiles = () => {
    // Read the contents of the audio directory
    fs.readdir(AUDIO_DIR, (err, files) => {
        if (err) {
            console.error('Error reading audio directory:', err);
            return;
        }

        // Iterate over each file and delete it
        files.forEach(file => {
            const filePath = path.join(AUDIO_DIR, file);

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


export const saveAudioFile = (mediaContent: MessageMedia): string => {
    const { mimetype, data } = mediaContent;

    // Get file extension from mimetype (e.g., "audio/mp3" -> "mp3")
    const extension = mimetype.split('/')[1];
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(AUDIO_DIR, fileName);

    // Convert base64 data to buffer and write to file
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Return the accessible URL (assuming it's served statically)
    return `/audio/${fileName}`;
};
