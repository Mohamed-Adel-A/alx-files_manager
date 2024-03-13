import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { dbClient } from '../utils/db';
import { redisClient } from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload(req, res) {
    const {
      name, type, data, parentId = 0, isPublic = false
    } = req.body;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if ((type !== 'folder') && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.client.db().collection('files').findOne({ _id: parentId });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    let localPath = '';
    if (type !== 'folder') {
      const fileContent = Buffer.from(data, 'base64');
      const fileId = uuidv4();
      localPath = path.join(FOLDER_PATH, fileId);
      fs.writeFileSync(localPath, fileContent);
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: type !== 'folder' ? localPath : null,
    };

    const result = await dbClient.client.db().collection('files').insertOne(newFile);

    return res.status(201).json({
      id: result.insertedId,
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
    });
  },
};

export default FilesController;
