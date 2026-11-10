const required = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
};

module.exports = {
  port: Number(process.env.PORT || 8080),
  mongoUri: required('MONGODB_URI'),
  region: process.env.AWS_REGION || 'ap-south-1',
  cognito: {
    userPoolId: required('COGNITO_USER_POOL_ID'),
    clientId: required('COGNITO_CLIENT_ID'),
  },
  s3Bucket: required('S3_BUCKET'),
  sesFrom: required('SES_FROM_EMAIL'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxResumeBytes: 5 * 1024 * 1024,
};
