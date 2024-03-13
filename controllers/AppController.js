import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AppController = {
  async getStatus(req, res) {
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.isAlive();

    return res.status(200).json({
        redis: redisStatus,
        db: dbStatus,
      });
  },

  async getStats(req, res) {
    const usersCount = await dbClient.nbUsers();
    const filesCount = await dbClient.nbFiles();

    return res.status(200).json(
      {
        users: usersCount,
        files: filesCount
      }
    );
  },
};

export default AppController;
