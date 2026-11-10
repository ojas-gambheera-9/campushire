const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const config = require('../config');

// Credentials come from the EC2 instance role (IMDS) — nothing is hard-coded.
const s3 = new S3Client({ region: config.region });
const ses = new SESClient({ region: config.region });

const presignUpload = (key, contentType) =>
  getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: config.s3Bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  );

const presignDownload = (key) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }), { expiresIn: 300 });

const getObjectStream = async (key) => (await s3.send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }))).Body;

async function sendEmail({ to, subject, text }) {
  await ses.send(
    new SendEmailCommand({
      Source: config.sesFrom,
      Destination: { ToAddresses: [to] },
      Message: { Subject: { Data: subject }, Body: { Text: { Data: text } } },
    })
  );
}

module.exports = { presignUpload, presignDownload, getObjectStream, sendEmail };
