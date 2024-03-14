
import Bull from 'bull';
import { dbClient } from './utils/db';
import { generateThumbnail } from 'image-thumbnail';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.client.db().collection('files').findOne({ _id: fileId, userId: userId });

  if (!file) {
    throw new Error('File not found');
  }

  const originalFilePath = path.join(process.env.FOLDER_PATH || '/tmp/files_manager', file.localPath);

  await Promise.all([
    generateThumbnail(originalFilePath, { width: 500 }).then(thumbnail => fs.promises.writeFile(`${originalFilePath}_500`, thumbnail)),
    generateThumbnail(originalFilePath, { width: 250 }).then(thumbnail => fs.promises.writeFile(`${originalFilePath}_250`, thumbnail)),
    generateThumbnail(originalFilePath, { width: 100 }).then(thumbnail => fs.promises.writeFile(`${originalFilePath}_100`, thumbnail))
  ]);

  return true;
});

export { fileQueue };
