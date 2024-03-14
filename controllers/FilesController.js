import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ObjectID } from 'mongodb';
import { dbClient } from '../utils/db';
import { redisClient } from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload(req, res) {
    const { name } = req.body;
    const { type } = req.body;
    const { data } = req.body;
    const { parentId } = req.body;
    const { isPublic } = req.body || false;

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

    if (parentId) {
      const parentObjId = new ObjectID(parentId);
      const parentFile = await dbClient.client.db().collection('files').findOne({ _id: parentObjId });
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
      try {
        try {
          fs.mkdirSync(FOLDER_PATH);
        } catch (error) {
          // the dir is alerady exist
        }
        fs.writeFileSync(localPath, fileContent);
      } catch (error) {
        console.log(error);
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId || 0,
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

  async getShow(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjId = new ObjectID(userId);
    const file = await dbClient.client.db().collection('files').findOne({ _id: id, userObjId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  },

  async getIndex(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId } =  req.query;
    const { pageNum } =  req.query;
    const page = pageNum || 0;
    const skip = page * 20;
    const limit = 20;

    const userObjId = new ObjectID(userId);
    if (!parentId) {
      matchQuery = { userId: userObjId };
    } else {
      const parentObjId = new ObjectID(parentId);
      matchQuery = {parentId: parentObjId, userId: userObjId };
    }

    const files = await dbClient.client.db().collection('files').aggregate([
      { $match: matchQuery },
      { $skip: skip },
      { $limit: limit },
    ]).toArray();

    return res.json(files);
  },
};

export default FilesController;
