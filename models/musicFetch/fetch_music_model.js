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

const { v4: uuidv4 } = require("uuid");
app.set('trust proxy', true);
app.use(express.json());
const path = require('path');


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
  