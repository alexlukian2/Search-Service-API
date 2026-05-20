import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // Redis
  REDIS_URL: Joi.string().uri().optional().allow(''),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // CORS
  CORS_ORIGINS: Joi.string().optional().default('http://localhost:3000'),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().positive().default(30),
});
