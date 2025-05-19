const dotenv = require('dotenv')
dotenv.config()

const Redis = require('ioredis')

const redis =  new Redis(process.env.REDIS_DB)

redis.on("connect", () => console.log("✅ Connected to Cloud Redis"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

module.exports = redis