function getCurrentMinuteEpoch() {
  return Math.floor(Date.now() / 60000) * 60;
}

async function checkFixedWindowLimit({
  redisClient,
  key,
  limitPerMinute,
}) {
  try {
    const minuteEpoch = getCurrentMinuteEpoch();
    const bucketKey = `${key}:${minuteEpoch}`;
    const count = await redisClient.incr(bucketKey);

    if (count === 1) {
      await redisClient.expire(bucketKey, 60);
    }

    const allowed = count <= limitPerMinute;
    const remaining = Math.max(0, limitPerMinute - count);

    if (allowed) {
      return {
        allowed: true,
        remaining,
        retryAfterSec: 0,
      };
    }

    const ttl = await redisClient.ttl(bucketKey);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: ttl > 0 ? ttl : 60,
    };
  } catch (error) {
    return {
      allowed: true,
      remaining: null,
      retryAfterSec: 0,
      degraded: true,
    };
  }
}

function checkApiProjectLimit(redisClient, projectId, limitPerMinute) {
  return checkFixedWindowLimit({
    redisClient,
    key: `rl:api:project:${projectId}`,
    limitPerMinute,
  });
}

function checkApiIpLimit(redisClient, ip, limitPerMinute) {
  return checkFixedWindowLimit({
    redisClient,
    key: `rl:api:ip:${ip}`,
    limitPerMinute,
  });
}

function checkWsProjectLimit(redisClient, projectId, limitPerMinute) {
  return checkFixedWindowLimit({
    redisClient,
    key: `rl:ws:project:${projectId}`,
    limitPerMinute,
  });
}

function checkWsIpLimit(redisClient, ip, limitPerMinute) {
  return checkFixedWindowLimit({
    redisClient,
    key: `rl:ws:ip:${ip}`,
    limitPerMinute,
  });
}

module.exports = {
  checkFixedWindowLimit,
  checkApiProjectLimit,
  checkApiIpLimit,
  checkWsProjectLimit,
  checkWsIpLimit,
};
