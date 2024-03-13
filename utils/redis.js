import { promisify } from 'util';
import { createClient } from 'redis';


class RedisClient {
  /**
   * create new clint
   * any error of the redis client
   * will be displayed in the console
   */
  constructor() {
    this.client = createClient();
    this.client.on('error', (error) => {
      console.log(`Redis client not connected to server: ${error.toString()}`);
    });
  }

  /**
   * check if clint connected
   */
  isAlive() {
    if (this.client.connected) {
      return true;
    }
    return false;
  }

  /**
   * Set key and value
   */
  async set(redisKey, redisValue, time) {
    const redisSet = promisify(this.client.set).bind(this.client);
    await redisSet(redisKey, redisValue);
    await this.client.expire(redisKey, time);
  }

  /**
   * Get value by key
   */
  async get(redisKey) {
    const redisGet = promisify(this.client.get).bind(this.client);
    const redisValue = await redisGet(redisKey);
    return redisValue;
  }

  /**
   * delete key and value from redis
   */
  async del(redisKey) {
    const redisDel = promisify(this.client.del).bind(this.client);
    await redisDel(redisKey);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
