const db = require('../../config/db_wrapper');
const { v1, v2 } = require("node-tiklydown");
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const axios = require("axios");
const uploadManager = require('../../config/upload_manager');
const { v4: uuidv4 } = require('uuid');
const ffprobe = require('ffprobe');
const crypto = require("crypto");

exports.fetchVideos = async () => {
  const fetchVideos = await db.query("SELECT f.*, u.username FROM fetch_links f JOIN users u ON f.user_id = u.id WHERE type = 1 ORDER BY f.id DESC LIMIT 20;");
  return fetchVideos;
};

exports.fetchMoreVideos = async (from) => {
  const fetchVideos = await db.query("SELECT f.*, u.username FROM fetch_links f JOIN users u ON f.user_id = u.id WHERE type = 1 ORDER BY f.id DESC LIMIT ?, 50;", [parseInt(from)]);
  return fetchVideos;
};

exports.fetchMusic = async () => {
  const fetchVideos = await db.query("SELECT f.*, u.username FROM fetch_links f LEFT JOIN users u ON f.user_id = u.id WHERE type = 4 ORDER BY f.id DESC;");
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
    console.log(userId)
    const checkLink = await db.execute(`SELECT link FROM fetch_links WHERE user_id = ? AND link = ?`, [userId, link]);
    if (!userId) {
      console.log("User not found!");
    }
    else {
      console.log("Fetching Videos", link)
      v1(link).then(async (data) => {
        // Extract the URL of the video
        const videoUrl = data.video.noWatermark;
        const videosDir = path.join(process.cwd(), "uploads", "videos");
        const soundsDir = path.join(process.cwd(), "uploads", "sounds");
        // Download the video using axios
        axios.get(videoUrl, { responseType: "stream" }).then((response) => {

          // Create a write stream to save the video to disk
          const uuid = uuidv4();

          const videoName = `${uuid}.mp4`;
          const thumbnailName = `${uuid}.jpeg`;
          const gifName = `${uuid}.gif`;
          const soundName = `${uuid}.mp3`;

          const videoPath1 = path.join(videosDir, videoName);
          const writeStream = fs.createWriteStream(videoPath1);

          // Pipe the response stream to the write stream
          response.data.pipe(writeStream);

          // When the write stream is finished, upload the video to your database
          writeStream.on("finish", async () => {
            await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, link]);
            const videoReference = videoPath1;

            var soundId = 0;
            var thumbnailPath = await generateThumbnail(videoReference, thumbnailName);
            var gifPath = await generateGif(videoReference, gifName);
            var videoDimension = await getVideoDimensions(videoReference);
            const thumbnailsDir = path.join(process.cwd(), "uploads", "thumbnails");
            const gifDir = path.join(process.cwd(), "uploads", "gifs");
            const soundsDir = path.join(process.cwd(), "uploads", "sounds");
            const thumbnailCompletePath = path.join(thumbnailsDir, thumbnailName);
            const soundCompletePath = path.join(soundsDir, soundName);
            const gifCompletePath = path.join(gifDir, gifName);
            const height = videoDimension.height;
            const width = videoDimension.width;
            const webVideoId = crypto.randomBytes(6).readUInt32LE(0).toString();
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

              let title;
              if (data.title === 'Downloaded from TiklyDown API') {
                title = data.author.signature ?? '';
              }
              else {
                title = data.title;
              }
              let newTags = [];
              const hashtags = title.match(/#[\w\u0590-\u05ff\uD800-\uDBFF\uDC00-\uDFFF]+/gu) || [];
              const tags = hashtags.map(tag => tag.slice(1));
              const cleanTags = hashtags.join(', ');
              const cleanTitle = title.replace(/#[\w\u0590-\u05ff\uD800-\uDBFF\uDC00-\uDFFF]+/gu, '').trim();
              const uniqueTags = [...new Set(tags)];
              newTags.push(tags);
              // console.log("Tags", tags)
              const result = await db.execute(
              'INSERT INTO videos (user_id, title, tags, videoUrl, thumbnailUrl, videoGifUrl, videoGifPath, videoTime, soundId, allowComments, allowSharing, allowDuet, isPrivate, receiveGifts, isExclusive, exclusiveAmount, height, width, web_share_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [userId, cleanTitle, cleanTags, videoResponse.Location, thumbnailResponse.Location, gifResponse.Location, videoResponse.Key, getTime, soundId, 1, 1, 1, 0, 1, 0, 0,height, width, webVideoId]);
              if (result && result.affectedRows > 0) {
                await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, link]);
                const videoId = result.insertId;
            
                for (const tag of uniqueTags) {
                  try {
                    const rows = await db.query("SELECT * FROM tags WHERE tag = ?", [tag]);
                    let tagId;
                    if (rows && rows.length > 0) {
                      await db.execute("UPDATE tags SET totalVideos = totalVideos + 1, priority = priority + 1 WHERE tag = ?", [tag]);
                      tagId = rows[0].id;
                    } else {
                      const insertResult = await db.execute("INSERT INTO tags (tag, totalVideos, priority) VALUES (?, 1, 1)", [tag]);
                      tagId = insertResult.insertId;
                    }
            
                    try {
                      await db.execute("INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)", [videoId, tagId]);
                    } catch (error) {
                      if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`Duplicate entry for tag: ${tag} and videoId: ${videoId}`);
                      } else {
                        // Handle other errors appropriately
                        console.error(error);
                      }
                    }
                  } catch (error) {
                    // Handle tag selection error appropriately
                    console.error('[ERROR]', error);
                  }
                }
              }

            } catch (err) {
              console.error("[ERROR] " + err);
            }

            return;
          });
        });
      });
    }
  } catch (error) {
    console.error(error);
  }
};

exports.getMusic = async (userId, username, link) => {
  console.log("rec in modelll", link)
  try {
    const checkLink = await db.execute(`SELECT link FROM fetch_links WHERE user_id = ? AND link = ?`, [userId, link]);
      v1(link).then(async (data) => {
        // Extract the URL of the video
        const videoUrl = data.video.noWatermark;
        const videosDir = path.join(process.cwd(), "uploads", "videos");
        const soundsDir = path.join(process.cwd(), "uploads", "sounds");
        const thumbnailsDir = path.join(process.cwd(), "uploads", "thumbnails");
        // Download the video using axios
        axios.get(videoUrl, { responseType: "stream" }).then(async (response) => {

          // Create a write stream to save the video to disk
          const uuid = uuidv4();

          const videoName = `${uuid}.mp4`;
          const soundName = `${uuid}.mp3`;
          const thumbnailName = `${uuid}.jpeg`;

          const videoPath1 = path.join(videosDir, videoName);
          const writeStream = fs.createWriteStream(videoPath1);

          // Pipe the response stream to the write stream
          response.data.pipe(writeStream);

          // When the write stream is finished, upload the video to your database
          writeStream.on("finish", async () => {
            await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, link]);

            var soundId = 0;
            var soundPath;
            if (soundId === 0) {
                try {
                    soundPath = await extractAudio(videoPath1, soundName);
                } catch (error) {
                    console.log("Error extracting Audio");
                }
                soundPath = path.join(soundsDir, soundName);
            }
            const soundCompletePath = path.join(soundsDir, soundName);
            var thumbnailPath = await generateThumbnail(videoPath1, thumbnailName);
            console.log(thumbnailPath, "thumbnailPath")
            const thumbnailCompletePath = path.join(thumbnailsDir, thumbnailName);
            try {
              if (soundPath) {
                const duration = await getDuration(soundPath);
                const soundResponse = await uploadManager.upload({
                  key: `sounds`,
                  fileReference: soundCompletePath,
                  contentType: 'audio/mp3',
                  fileName: soundName,
                });

                const thumbnailResponse = await uploadManager.upload({
                  key: `thumbnails`,
                  fileReference: thumbnailCompletePath,
                  contentType: "image/jpeg",
                  fileName: thumbnailName,
                });

                console.log(soundResponse)

                if (soundResponse.Location) {
                  if(!username){
                    username = "Original"
                  }
                    // insert sound details
                    const dbMusic = await db.execute('INSERT INTO sounds (user_id, title, soundUrl, soundPath, albumPhotoUrl, duration, artist) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                      userId, 
                      `Original Sound - ${username}`,
                      soundResponse.Location, 
                      soundCompletePath, 
                      thumbnailResponse.Location, 
                      duration, 
                      username]);
                    if (dbMusic) {
                        soundId = dbMusic.insertId;
                        // Delete the video file after sound processing
                        fs.unlinkSync(videoPath1);
                    }
                }
            }

            } catch (err) {
              console.error("[ERROR] " + err);
            }

            return;
          });
        });
      });

  } catch (error) {
    console.error(error);
  }
};


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


const { exec } = require('child_process');

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

async function getDuration(filePath) {
  return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) return reject(err);
          const duration = Math.floor(metadata.format.duration);
          resolve(duration);
      });
  });
}

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