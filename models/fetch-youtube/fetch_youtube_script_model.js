const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const axios = require("axios");
const uploadManager = require('../../config/upload_manager');
const { v4: uuidv4 } = require('uuid');
const ffprobe = require('ffprobe');
const crypto = require("crypto");
const mime = require('mime-types');
const https = require('https');

exports.fetchVideos = async () => {
  const fetchVideos = await db.query("SELECT f.*, u.username FROM fetch_links f JOIN users u ON f.user_id = u.id WHERE type = 2 ORDER BY f.id DESC;");
  return fetchVideos;
};

exports.fetchMusic = async () => {
  const fetchVideos = await db.query("SELECT f.*, u.username FROM fetch_links f LEFT JOIN users u ON f.user_id = u.id WHERE type = 3 ORDER BY f.id DESC;");
  return fetchVideos;
};

exports.fetchLinks = async (userId, link) => {
  const checkLink = await db.execute(`SELECT link FROM fetch_links WHERE user_id = ? AND link = ?`, [userId, link]);
  if(checkLink.length > 0){
    return true;
  }
};

exports.getVideos = async (userId, username, link) => {
  try {
    const checkLink = await db.execute(`SELECT link FROM fetch_links WHERE user_id = ? AND link = ?`, [userId, link]);
    if (!userId) {
      console.log("User not found!");
    }
    else{
      // const info = await ytdl.getInfo(link);
      const info = await ytdl.getInfo(link);
      // Find the desired format using the itag value
      const desiredFormat = info.formats.find(format => format.itag === 18);

      if (desiredFormat) {
        console.log(info);
        const response = await ytdl.downloadFromInfo(info, { format: desiredFormat });
        // const response = ydl.download(desiredFormat);
  
        const uuid = uuidv4();
  
        const videoName = `${uuid}.mp4`;
        const thumbnailName = `${uuid}.jpeg`;
        const gifName = `${uuid}.gif`;
        const soundName = `${uuid}.mp3`;
  
        const videosDir = path.join(process.cwd(), 'uploads', 'videos'); // Define your directory
        const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails'); // Define your directory
        const gifDir = path.join(process.cwd(), 'uploads', 'gifs'); // Define your directory
        const soundsDir = path.join(process.cwd(), "uploads", "sounds");

        const videoPath1 = path.join(videosDir, videoName);
        const writeStream = fs.createWriteStream(videoPath1);
  
        // Pipe the response stream to the write stream
        response.pipe(writeStream);
  
        // When the write stream is finished, continue with other tasks
        writeStream.on("finish", async () => {
          await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, link]);
          const videoReference = videoPath1;

          var soundId = 0;
          var thumbnailPath = await generateThumbnail(videoReference, thumbnailName);
          var gifPath = await generateGif(videoReference, gifName);
          var videoDimension = await getVideoDimensions(videoReference);
          const thumbnailsDir = path.join(process.cwd(), "uploads", "thumbnails");
          const gifDir = path.join(process.cwd(), "uploads", "gifs");
          const thumbnailCompletePath = path.join(thumbnailsDir, thumbnailName);
          const soundCompletePath = path.join(soundsDir, soundName);
          const gifCompletePath = path.join(gifDir, gifName);
          const height = videoDimension.height;
          const width = videoDimension.width;
          var soundPath;
          if (soundId === 0) {
              try {
                  soundPath = await extractAudio(videoReference, soundName);
              } catch (error) {
                  console.log("Error extracting Audio");
              }
              soundPath = path.join(soundsDir, soundName);
          }
          try {
            const videoResponse = await uploadManager.upload({ key: `videos`, fileReference: videoPath1, contentType: 'video/mp4', fileName: videoName });

            const thumbnailResponse = await uploadManager.upload({ key: `thumbnails`, fileReference: thumbnailCompletePath, contentType: 'image/jpeg', fileName: thumbnailName });

            const gifResponse = await uploadManager.upload({ key: `gifs`, fileReference: gifCompletePath, contentType: 'image/gif', fileName: gifName });
            const getTime = Math.floor(new Date().getTime() / 1000);

            if (soundPath) {
              const duration = await getDuration(soundPath);
              const soundResponse = await uploadManager.upload({
                key: `sounds`,
                fileReference: soundCompletePath,
                contentType: 'audio/mp3',
                fileName: soundName,
              });
              if (soundResponse.Location) {
                  // insert sound details
                  const dbMusic = await db.execute('INSERT INTO sounds (user_id, title, soundUrl, soundPath, albumPhotoUrl, duration, artist) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                    userId, 
                    `Original Sound - ${username}`,
                    soundResponse.Location, 
                    soundCompletePath, 
                    "", 
                    duration, 
                    username]);
                  if (dbMusic) {
                      soundId = dbMusic.insertId;
                  }
              }
          }

            const title = info.videoDetails.title;
            const webVideoId = crypto.randomBytes(6).readUInt32LE(0).toString();
            let newTags = [];
            const hashtags = title.match(/#[\w\u0590-\u05ff]+/g) || [];
            const tags = (title.match(/#\w+/g) || []).map(tag => tag.slice(1));
            const cleanTags = hashtags.join(', ');
            newTags.push(tags);
            const cleanTitle = title.replace(/#[\w\u0590-\u05ff]+/g, '').trim();
            const result = await db.execute(
            'INSERT INTO videos (user_id, title, tags, videoUrl, thumbnailUrl, blurredThumbnailUrl, videoGifUrl, videoGifPath, videoTime, soundId, allowComments, allowSharing, allowDuet, isPrivate, receiveGifts, isExclusive, exclusiveAmount, height, width, web_share_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, cleanTitle, cleanTags, videoResponse.Location, thumbnailResponse.Location, thumbnailResponse.Location, gifResponse.Location, gifPath, getTime, soundId, 1, 1, 1, 0, 1, 0, 0,height, width, webVideoId]);
            if (result.affectedRows > 0) {
              await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, link]);
              const videoId = result.insertId;
               for (const tag of tags) {
                console.log("Tag", tag)
                   const [rows, fields] = await db.query("SELECT id, priority FROM tags WHERE tag = ?", [tag]);
                   console.log("Rows", rows)
                   if (!rows) {
                    console.log("Rows", tag)
                     const [result] = await db.query("INSERT INTO tags (tag, priority) VALUES (?, 1)", [tag]);
                     const tagId = result.insertId;
                     await db.query("INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)", [videoId, tagId]);
                   } else {
                     const tagId = rows[0].id;
                     const priority = rows.priority + 1;
                     const totalVideos = rows[0].totalVideos + 1;
                     await db.query("UPDATE tags SET totalVideos = ?, priority = ? WHERE id = ?", [totalVideos, priority, tagId]);
                     const [rows2, fields2] = await db.query("SELECT * FROM video_tags WHERE video_id = ? AND tag_id = ?", [videoId, tagId]);
                     if (!rows2 || rows2.length === 0) {
                       await db.query("INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)", [videoId, tagId]);
                     }
                   }
                }
            }

          } catch (err) {
            console.error("[ERROR] " + err);
          }
          return;
        });
      }
      else{

      }
    }
  } catch (error) {
    console.error('[ERROR] ' + error);
  }
};

exports.getMusic = async (userId, username, link, soundCategory) => {
  try {

    const checkLink = await db.execute(`SELECT link FROM fetch_links WHERE user_id = ? AND link = ?`, [userId, link]);
      try {
        const info = await ytdl.getInfo(link);
        const thumbnail = info.videoDetails.thumbnails[0].url;
      
        // Find the desired format using the itag value
        const desiredFormat = info.formats.find(format => format.mimeType.includes('audio'));
      
        if (desiredFormat) {
          const audioResponse = await ytdl.downloadFromInfo(info, { format: desiredFormat });
      
          const uuid = uuidv4();
          const fileName = `${uuid}.mp3`;
          const fileAlbumName = `${uuid}.jpeg`;
      
          const soundsDir = path.join(process.cwd(), 'uploads', 'sounds');
          const filePath = path.join(soundsDir, fileName);
          const fileAlbumPath = path.join(soundsDir, fileAlbumName);
      
          const audioWriteStream = fs.createWriteStream(filePath);
      
          // Promisify the audio stream events for better error handling
          const audioStreamPromise = new Promise((resolve, reject) => {
            audioResponse.pipe(audioWriteStream);
            audioWriteStream.on("finish", resolve);
            audioWriteStream.on("error", reject);
          });
      
          await audioStreamPromise;
      
          // Fetch the album photo using https.get
          const albumWriteStream = fs.createWriteStream(fileAlbumPath);
      
          const albumStreamPromise = new Promise((resolve, reject) => {
            https.get(thumbnail, response => {
              response.pipe(albumWriteStream);
              albumWriteStream.on("finish", resolve);
              albumWriteStream.on("error", reject);
            });
          });
      
          await albumStreamPromise;
      
          // Update status in the database
          await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, link]);
      
          const fileReference = filePath;
          const soundCompletePath = filePath;
          const albumReference = fileAlbumPath;
      
          const soundResponse = await uploadManager.upload({
            key: `sounds`,
            fileReference: fileReference,
            contentType: mime.lookup(soundCompletePath),
            fileName: fileName
          });
      
          const soundAlbumResponse = await uploadManager.upload({
            key: `sounds`,
            fileReference: albumReference,
            contentType: mime.lookup(albumReference),
            fileName: fileAlbumName
          });
      
          const title = info.videoDetails.title;
      
          if (!username) {
            username = info.videoDetails.author.name;
          }
      
          const result = await db.execute(
            'INSERT INTO sounds (user_id, title, soundUrl, soundPath, albumPhotoUrl, duration, artist) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, title, soundResponse.Location, soundCompletePath, soundAlbumResponse.Location, info.videoDetails.lengthSeconds, username]
          );
      
          if (result.affectedRows > 0) {
            await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, link]);
          }
        } else {
          // Handle case when no suitable audio format is found
        }
      } catch (err) {
        console.error("[ERROR] " + err);
        // Handle the error appropriately
      }
  } catch (error) {
    console.error('[ERROR] ' + error);
  }
};

async function getDuration(filePath) {
  return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) return reject(err);
          const duration = Math.floor(metadata.format.duration);
          resolve(duration);
      });
  });
}

function generateThumbnail(input, filename) {
  console.log(`Generating thumbnail for ${input} with filename ${filename}`);
  return new Promise((resolve, reject) => {
    ffmpeg(input).screenshots({
      count: 1,
      filename: filename,
      folder: './uploads/thumbnails',
    }).on('end', () => {
      console.log('Thumbnail generation completed');
      resolve(`thumbnails/${filename}`);
    }).on('error', (err) => {
      console.error(err);
      reject(err);
    });
  });
}


ffprobeStatic = require('ffprobe-static');

async function getVideoDimensions(input) {
    try {
        const metadata = await ffprobe(input, { path: ffprobeStatic.path });
        const { width, height } = metadata.streams[0];
        return { width, height };
    } catch (err) {
        console.error(err);
        throw new Error('Failed to get video dimensions');
    }
}

async function generateBlurredThumbnail(input) {
  try {
    console.log(`Generating thumbnail for ${input}`);
    const fullPath = path.resolve(input);

    console.log(input, fullPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Input file is missing: ${fullPath}`);
    }
    const output = fullPath.replace(/\.[^/.]+$/, "") + "_blurred.jpg"; // Generate a new output file with a different name
    await sharp(fullPath)
      .blur(30) // Apply a blur effect with a radius of 10
      .toFile(output); // Save the image to the output file
    console.log('Thumbnail generation completed');
    fs.unlinkSync(input); // Delete the original file
    return `thumbnails/${path.basename(output)}`;
  } catch (error) {
    console.error(error);
  }
}

function extractAudio(input, filename) {
  console.log(`Extracting audio from ${input} with filename ${filename}`);
  return new Promise((resolve, reject) => {
      ffmpeg(input)
          .audioCodec('libmp3lame')
          .save(`./uploads/sounds/${filename}`)
          .on('end', () => {
              console.log('Audio extraction completed');
              resolve(`sounds/${filename}`);
          })
          .on('error', (err) => {
              console.error(err);
              reject(err);
          });
  });
}


const { exec } = require('child_process');

async function generateGif(input, filename) {
  const outputPath = `gifs/${filename}`;
  const output = `uploads/gifs/${filename}`;

  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i ${input} -vf format=rgb8,format=rgb24,scale=-1:250,fps=10 -t 3 ${output}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      resolve(outputPath);
    });
  });
}