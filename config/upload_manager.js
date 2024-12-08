const AWS = require('aws-sdk');
const db = require('./db_handler');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class UploadManager {
    constructor() {
        if (!UploadManager.instance) {
            UploadManager.instance = this;
        }
        return UploadManager.instance;
    }

    async upload({ key, fileReference, contentType = 'application/octet-stream', acl = 'public-read', fileName }) {
        const uploadAddress = global.hostAddress + "uploads/";
        return new Promise(async (resolve, reject) => {
            const config = await db.getConfigs();
            const uuid = uuidv4();
            const fileExtension = path.extname(fileReference);
            const uploadKey = key ? `${key}/${uuid}${fileExtension}` : `${uuid}${fileExtension}`;
            const uploadParams = {
                Bucket: config.cdn_bucket_name,
                Key: uploadKey,
                Body: fs.createReadStream(fileReference),
                ContentType: contentType,
                ACL: acl
            };
            var s3;
            var isEnabled = true;
            if (config.cdn_type === 'digitalocean') {
                s3 = new AWS.S3({
                    endpoint: new AWS.Endpoint(config.cdn_endpoint),
                    accessKeyId: config.cdn_key,
                    secretAccessKey: config.cdn_secret,
                    region: config.cdn_region
                });
            } else if (config.cdn_type === 'aws_s3' || config.cdn_type === 'aws') {
                s3 = new AWS.S3({
                    endpoint: new AWS.Endpoint(config.cdn_endpoint),
                    accessKeyId: config.cdn_key,
                    secretAccessKey: config.cdn_secret,
                    region: config.cdn_region,
                    s3ForcePathStyle: config.aws_s3_force_path_style || false
                });
            } else if (config.cdn_type === 'wasabi') {
                s3 = new AWS.S3({
                    endpoint: new AWS.Endpoint(config.cdn_endpoint),
                    accessKeyId: config.cdn_key,
                    secretAccessKey: config.cdn_secret,
                    region: config.cdn_region,
                    s3ForcePathStyle: true
                });
            } else {
                isEnabled = false;
                resolve({
                    Key: key,
                    Location: `${uploadAddress}${key}/${fileName}`,
                });
            }
            if (isEnabled) {
                try {
                    const response = await s3.upload(uploadParams).promise();
                    await fs.promises.unlink(fileReference);

                    if (response.Location && !response.Location.startsWith('https')) {
                    response.Location = 'https://' + response.Location;
                    }

                    resolve(response);

                } catch (err) {
                    console.error('Error uploading file:', err);
                    reject(false);
                }
            }
        });
    }

    async testCDN() {
        return new Promise(async (resolve, reject) => {
            const config = await db.getConfigs();
            console.log(config);
            if (!config.cdn_type || config.cdn_type == "none") {
                reject("CDN is not enabled. Test aborted");
                return;
            }
            console.log("Please wait while your CDN test is completed");
            let s3;
            if (config.cdn_type === 'digitalocean') {
                s3 = new AWS.S3({
                    endpoint: config.cdn_endpoint,
                    accessKeyId: config.cdn_key,
                    secretAccessKey: config.cdn_secret,
                    region: config.cdn_region
                });
            } else if (config.cdn_type === 'aws') {
                s3 = new AWS.S3({
                    endpoint: new AWS.Endpoint(config.cdn_endpoint),
                    accessKeyId: config.cdn_key,
                    secretAccessKey: config.cdn_secret,
                    region: config.cdn_region,
                    s3ForcePathStyle: config.aws_s3_force_path_style || false
                });
            } else if (config.cdn_type === 'wasabi') {
                s3 = new AWS.S3({
                    endpoint: new AWS.Endpoint(config.cdn_endpoint),
                    accessKeyId: config.cdn_key,
                    secretAccessKey: config.cdn_secret,
                    region: config.cdn_region,
                    s3ForcePathStyle: true
                });
            }
            const uuid = uuidv4();
            const fileExtension = '.txt';
            const uploadKey = `${uuid}${fileExtension}`;
            const uploadParams = {
                Bucket: config.cdn_bucket_name,
                Key: uploadKey,
                Body: '',
                ContentType: 'text/plain',
                ACL: 'public-read'
            };
            s3.upload(uploadParams, (err, data) => {
                if (err) {
                    reject(`CDN Test failed: ${err.code}`);
                } else {
                    s3.deleteObject({ Bucket: config.cdn_bucket_name, Key: uploadKey }, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                cdn_bucket_name: config.cdn_bucket_name,
                                cdn_type: config.cdn_type,
                            });
                        }
                    });
                }
            });
        });
    }
}

module.exports = new UploadManager();