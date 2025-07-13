import winston from 'winston';

const { combine, timestamp, errors, json, printf, colorize, metadata } =
  winston.format;

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const prettyFormat = printf(
  ({ level, message, timestamp, metadata, stack }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (metadata && Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  }
);

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  prettyFormat
);

const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  json()
);

const createLogger = (service?: string) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: isDevelopment ? developmentFormat : productionFormat,
    defaultMeta: service ? { service } : undefined,
    transports: [
      new winston.transports.Console({
        silent: isTest && !process.env.DEBUG_TESTS,
      }),
    ],
  });

  return logger;
};

export const logger = createLogger();

export const createChildLogger = (
  service: string,
  defaultMeta?: Record<string, any>
) => {
  return logger.child({ service, ...defaultMeta });
};

export const loggerMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    const level =
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${method} ${url}`, {
      method,
      url,
      statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  next();
};
