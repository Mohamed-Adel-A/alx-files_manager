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

  async getIndex(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId) {
      const users = dbClient.db.collection('users');
      const idObject = new ObjectID(userId);
      const user = await users.findOne({ _id: idObject });
    }

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const {
      parentId,
      page,
    } = request.query;
    const pageNum = page || 0;
    const files = dbClient.db.collection('files');
    let query;
    if (!parentId) {
      query = { userId: user._id };
    } else {
      query = { userId: user._id, parentId: ObjectID(parentId) };
    }
    files.aggregate(
      [
        { $match: query },
        { $sort: { _id: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }, { $addFields: { page: parseInt(pageNum, 10) } }],
            data: [{ $skip: 20 * parseInt(pageNum, 10) }, { $limit: 20 }],
          },
        },
      ],
    ).toArray((err, result) => {
      if (result) {
        const final = result[0].data.map((file) => {
          const tmpFile = {
            ...file,
            id: file._id,
          };
          delete tmpFile._id;
          delete tmpFile.localPath;
          return tmpFile;
        });
        // console.log(final);
        return response.status(200).json(final);
      }
      console.log('Error occured');
      return response.status(404).json({ error: 'Not found' });
    });
    return null;
  },
};

export default FilesController;
