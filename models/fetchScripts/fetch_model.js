const fetch = require("node-fetch");
const chalk = require("chalk");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { exit } = require("process");
const { resolve } = require("path");
const axios = require("axios");
const { reject } = require("lodash");
const {Headers} = require('node-fetch');
const readline = require('readline');
const crypto = require("crypto");
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('ffprobe');
const uploadManager = require('../../config/upload_manager');
const db = require('../../config/db_wrapper');
const app = express();
const http = require('http');
const server = http.createServer(app);
app.use(express.json());
app.use(express.static(__dirname, { dotfiles: 'allow' }));
app.use(express.static(__dirname + '/public'));
app.use('/uploads', express.static('uploads'));
//adding useragent to avoid ip bans
const headers = new Headers();
headers.append('User-Agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet');
const headersWm = new Headers();
headersWm.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36');

const { v4: uuidv4 } = require("uuid");
app.set('trust proxy', true);
app.use(express.json());
const path = require('path');
// const uploadsDir = path.join(__dirname, "../../uploads");
// const videosDir = path.join(uploadsDir, "videos");
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir);
// }
// if (!fs.existsSync(videosDir)) {
//   fs.mkdirSync(videosDir);
// }
// const hostAddress = 'http://192.168.0.114:3000';

const getVideoNoWM = async (url, userId, userName) => {
  const idVideo = await getIdVideo(url);
  const API_URL = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}`;
  const request = await fetch(API_URL, {
    method: "GET",
    headers: headers,
  });
  const body = await request.text();
  try {
    var res = JSON.parse(body);
  } catch (err) {
    console.error("Error:", err);
    console.error("Response body:", body);
  }
  const urlMedia = res.aweme_list[0].video.play_addr.url_list[0];
  const caption = res.aweme_list[0].desc;
  const hashtags = caption.match(/#[\w\u0590-\u05ff\uD800-\uDBFF\uDC00-\uDFFF]+/gu) || [];
  const tags = hashtags.map(tag => tag.slice(1));
  const cleanTags = hashtags.join(', ');
  const cleanTitle = caption.replace(/#[\w\u0590-\u05ff\uD800-\uDBFF\uDC00-\uDFFF]+/gu, '').trim();
  const uniqueTags = [...new Set(tags)];
  for (const tag of uniqueTags) {
    console.log(tag);
  }
  const data = {
    url: urlMedia,
    id: idVideo,
    videoData: res.aweme_list[0]
  };

 const videoData = await fetch(urlMedia);
axios.get(urlMedia, { responseType: "stream" }).then((response) => {

    // Create the directories if they don't exist
    const uploadsDir = path.join(__dirname, "uploads");
    const videosDir = path.join(process.cwd(), "uploads", "videos");
    const soundsDir = path.join(process.cwd(), "uploads", "sounds");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir);
    }

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
      await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, url]);
      // const videoFileName = path.basename(videoPath1);
      // var videoPath = uploadAddress + 'videos/' + videoFileName;
      const videoReference = videoPath1;

      var soundId = 0;
      const webVideoId = crypto.randomBytes(6).readUInt32LE(0).toString();
      var thumbnailPath = await generateThumbnail(videoReference, thumbnailName);
      var gifPath = await generateGif(videoReference, gifName);
      var soundPath;
      if (soundId === 0) {
          try {
              soundPath = await extractAudio(videoReference, soundName);
          } catch (error) {
              console.log("Error extracting Audio");
          }
          soundPath = path.join(soundsDir, soundName);
      }
      var videoDimension = await getVideoDimensions(videoReference);
      const thumbnailsDir = path.join(process.cwd(), "uploads", "thumbnails");
      const gifDir = path.join(process.cwd(), "uploads", "gifs");
      const thumbnailCompletePath = path.join(thumbnailsDir, thumbnailName);
      const gifCompletePath = path.join(gifDir, gifName);
      const soundCompletePath = path.join(soundsDir, soundName);
      const height = videoDimension.height;
      const width = videoDimension.width;
      try {


        const videoResponse = await uploadManager.upload({
          key: `videos`,
          fileReference: videoPath1,
          contentType: 'video/mp4',
          fileName: videoName
        });
      
        const thumbnailResponse = await uploadManager.upload({
          key: `thumbnails`,
          fileReference: thumbnailCompletePath,
          contentType: 'image/jpeg',
          fileName: thumbnailName
        });
      
        const gifResponse = await uploadManager.upload({
          key: `gifs`,
          fileReference: gifCompletePath,
          contentType: 'image/gif',
          fileName: gifName
        });

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
                `Original Sound - ${userName}`,
                soundResponse.Location, 
                soundCompletePath, 
                "", 
                duration, 
                userName]);
              if (dbMusic) {
                  soundId = dbMusic.insertId;
              }
          }
      }
      
        const getTime = Math.floor(new Date().getTime() / 1000);
      
        const result = await db.execute(
          'INSERT INTO videos (user_id, title, tags, videoUrl, thumbnailUrl, videoGifUrl, videoGifPath, videoTime, soundId, allowComments, allowSharing, allowDuet, isPrivate, receiveGifts, isExclusive, exclusiveAmount, height, width, web_share_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            cleanTitle,
            cleanTags,
            videoResponse.Location,
            thumbnailResponse.Location,
            gifResponse.Location,
            videoResponse.Key,
            getTime,
            soundId,
            1,
            1,
            1,
            0,
            1,
            0,
            0,
            height,
            width,
            webVideoId
          ]
        );
      
        if (result && result.affectedRows > 0) {
          await db.execute(`UPDATE fetch_links SET status = 1 WHERE user_id = ? AND link = ?`, [userId, url]);
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
      } catch (error) {
        // Handle the outer try-catch error appropriately
        console.error(error);
      }
      

      return;
    });
  });
  // console.log(videoPath1, data);
  // Wait for the write stream to finish writing the video file
//   await new Promise((resolve, reject) => {
//     writeStream.on("finish", resolve);
//     writeStream.on("error", reject);
//   });
  return data;
};

const getRedirectUrl = async (url) => {
    if(url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")) {
        url = await fetch(url, {
            redirect: "follow",
            follow: 10,
        });
        url = url.url;
        console.log(chalk.green("[*] Redirecting to: " + url));
    }
    return url;
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

const getIdVideo = (url) => {
    const matching = url.includes("/video/")
    if(!matching){
        console.log(chalk.red("[X] Error: URL not found"));
        exit();
    }
    const idVideo = url.substring(url.indexOf("/video/") + 7, url.length);
    return (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;
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
  const { async } = require("rxjs");
  
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
  
  async function generateThumbnail(input, filename) {
    const outputPath = `thumbnails/${filename}`;
    const output = `uploads/thumbnails/${filename}`;
  
    return new Promise((resolve, reject) => {
      exec(`ffmpeg -i ${input} -ss 00:00:03 -vframes 1 -vf "scale=250:-1" ${output}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }
        resolve(outputPath);
      });
    });
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

  module.exports = {
    getVideoNoWM,
    getRedirectUrl,
    getIdVideo,
  };
  