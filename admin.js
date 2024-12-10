const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const configPath = './config/config.js';
const { v4: uuidv4 } = require('uuid');

// Check if the config file exists
if (!fs.existsSync(configPath)) {
  console.log(chalk.yellow('The config file does not exist. Please make sure you have configured the files before running this script.'));
  console.log(chalk.green('Closing service...'));
  process.exit();
}

const express = require('express')
// const app = express()
const router = express.Router();
var bodyParser = require('body-parser');
// require('express');
const session = require('express-session');
const multer = require('multer');
var urlencodedParser = bodyParser.urlencoded({ extended: false })
const db = require('./config/db_wrapper');
 
const { getDashboardData } = require('./controller/index/index_controller');
const { getUsersData, getFetchUserData, getEditUserData, postAddUser, postDeleteUser, postUpdateUser } = require('./controller/users/users_controller');
const { getAdminData, postAddAdmin, postDeleteAdmin, postRemoveAdmin } = require('./controller/administrators/administrator_controller');
const { getVideoData, getFetchVideoData, getVideoDetails, postUpdateVideoDetails, postDeleteVideo} = require('./controller/videos/video_controller');
const { getCommentData, getFetchCommentData, getEditCommentVideo, postDeleteComment} = require('./controller/comments/comments_controller');
const { getReportData, postDeleteReport, getReportDataDetails, postUpdateReportDetails, postDeleteReportVideo} = require('./controller/reports/reports_controller');
const { getReportReasonData, addReportReason, postDeleteReason} = require('./controller/reportCategories/report_categories_controller');
const { getReportDataUser, postDeleteReportUser} = require('./controller/reports_users/reports_user_controller');
const { getLiveStreamData, getFetchLiveStreamData,  postDeleteLiveStream } = require('./controller/livestreams/livestream_controller');
const { getTransactionsData, getFetchTransactionsData, postDeleteTransaction } = require('./controller/transactions/transactions_controller');
const { getPackageData, postDeletePackage, postAddCoins } = require('./controller/packages/packages_controller');
const { getGiftCategoryData, postAddGiftCategory, postDeleteGiftCategory } = require('./controller/giftCategories/gift_categories_controller');
const { getBanksData, postAddBank, postDeleteBank } = require('./controller/banks/banks_controller');
const { getGiftsData, postAddGift, postDeleteGift, postEditGift} = require('./controller/gifts/gifts_controller');
const { getLevelsData, postAddLevel, postDeleteLevel, postEditLevel} = require('./controller/levels/level_controller');
const { getLevelXpData, postAddXPLevel, postDeleteXPLevel } = require('./controller/levelXp/xp_controller');
const { getFeaturedUserData, postDeleteFeaturedUserData, postAddFeaturedUserData, postDeleteFeaturedUser } = require('./controller/featuredUsers/featured_users_controller');
const { getVerificationRequestData, getFetchVerificationRequestData, getVerificationRequestDetails, postUpdateVerificationReqDetails } = require('./controller/verificationRequests/verification_request_controller');
const { getWithdrawalRequestData, getFetchWithdrawalRequestData, getWithdrawalRequestDetails, postUpdateWithdrawalReqDetails } = require('./controller/withdrawalRequests/withdrawal_request_controller');
const { getTagsData, getFetchTagsData, postAddTag, postUpPriority, postDownPriority, postDeleteTag, postDefault } = require('./controller/tags/tags_controller');
const { getNotificationsData, postSaveNotifications } = require('./controller/notifications/notification_controller');
const { getSettingsData, getAgoraSettingsData, getCDNSettingsData, getStripeSettingsData, getServerSettingsData, getAppSettingsData, getAlgorithmSettingsData, postSaveAgora, postSaveStripe, postSaveAlgorithm, postCdn, postSavePassword, postSaveApp, postSaveAppSettings, postGenerateToken } = require('./controller/settings/settings_controller');
const { getBannersData, deleteBanner, addBanner } = require('./controller/ads/banners_controller');
const {getSoundCategoryData , postAddSoundCategory , postDeleteSoundCategory} = require('./controller/soundCategories/sound_categories_controller.js')
const {getSoundsData}= require('./controller/sounds/sounds_controller.js')

// router.set('view engine', 'ejs');
router.use(urlencodedParser);
router.use(express.static("public"));
router.use(express.static("config"));
router.use('/uploads', express.static('uploads'))


const oneDay = 1000 * 60 * 60 * 24;
router.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

router.get('/login', function (req, res) {
    if (req.session.user) {
        res.redirect('/admin');
        return;
    }
    res.render('pages/login');
});

router.post('/login', async function (req, res) {

    const username = req.body.username;
    const password = req.body.password;

    const userResult = await db.query("SELECT a.*, u.name, u.profilePicture FROM admins a LEFT JOIN users u ON a.user_id = u.id WHERE a.username = ?;", [username]);
    if (userResult && userResult.length > 0) {
        const element = userResult[0];
        if (element.password == password) {
            req.session.user = element;
            res.send({"result": true});
            return;
        }
    }
    res.status(401).send({"error": "invalid_credentials"});
});

router.get('/logout',(req,res) => {
  req.session.destroy();
  res.redirect('login');
});

router.use(async (req, res, next) => {
    res.locals.user = req.session.user;
    // Retrieve appName from the config table
    const configs = await db.query("SELECT value FROM config WHERE name IN ('app_logo', 'app_name')");
    res.locals.appName = configs[1] ? configs[1].value : "vativeApps";
    res.locals.appLogo = configs[0] ? configs[0].value : "";
    if (req.session.user) {
      next();
    } else {
      // Not logged in
      res.render('pages/login');
    }
  });

const giftsFolder = './uploads/gifts';
const soundsFolder = './uploads/sounds';
const appIconFolder = './uploads/appIcon';
const levelsFolder = './uploads/levels';
const imageFolder = './uploads/images';
const soundAlbumFolder = './uploads/sound_album';
const giftCategoryFolder = './uploads/gift_category';
const storiesFolder = './uploads/stories';
if (!fs.existsSync(appIconFolder)) {
  fs.mkdirSync(appIconFolder);
}
if (!fs.existsSync(storiesFolder)) {
  fs.mkdirSync(storiesFolder);
}
if (!fs.existsSync(giftCategoryFolder)) {
  fs.mkdirSync(giftCategoryFolder);
}
if (!fs.existsSync(imageFolder)) {
  fs.mkdirSync(imageFolder);
}
if (!fs.existsSync(soundAlbumFolder)) {
  fs.mkdirSync(soundAlbumFolder);
}
if (!fs.existsSync(soundsFolder)) {
  fs.mkdirSync(soundsFolder);
}
if (!fs.existsSync(giftsFolder)) {
  fs.mkdirSync(giftsFolder);
}
if (!fs.existsSync(levelsFolder)) {
  fs.mkdirSync(levelsFolder);
}

router.get('/', getDashboardData);

router.get('/users', getUsersData);

router.get('/fetch/users', getFetchUserData);

router.get('/fetch/transactions', getFetchTransactionsData); 

router.get('/fetch/videos', getFetchVideoData); 

router.get('/fetch/videoComments', getFetchCommentData);  

router.get('/fetch/verifications', getFetchVerificationRequestData); 

router.get('/fetch/tags', getFetchTagsData);

router.get('/fetch/withdrawals', getFetchWithdrawalRequestData);  

router.get('/fetch/streams', getFetchLiveStreamData);

router.get('/edit_users', getEditUserData);

router.get('/sound_categories',getSoundCategoryData);

router.get('/sounds',getSoundsData);



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/images')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueSuffix)
    }
})

const uploadUserPicture = multer({ storage: storage} );
router.post('/addUser', uploadUserPicture.single('picture'), postAddUser);

const storageUser = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/images')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueSuffix)
    }
})
const updateUserPicture = multer({ storage: storageUser} );
router.post('/updateUser', updateUserPicture.single('picture'), postUpdateUser);

router.post('/deleteUser', postDeleteUser);

router.get('/administrators', getAdminData);

router.post('/addAdmin', postAddAdmin);

router.post('/deleteAdmin', postDeleteAdmin);

router.post('/removeAdmin', postRemoveAdmin);

router.get('/videos',  getVideoData);

router.get('/edit_videos', getVideoDetails);

router.post('/updateVideo', postUpdateVideoDetails);

router.post('/deleteVideo', postDeleteVideo);

router.get('/comments', getCommentData);

router.post('/deleteComment', postDeleteComment);

router.get('/comment_video_details', getEditCommentVideo);

router.get('/reports', getReportData);

router.get('/reports_users', getReportDataUser);

router.get('/report_reason', getReportReasonData);

router.post('/deleteReport', postDeleteReport); 


router.post('/deleteReason', postDeleteReason);

router.post('/deleteUserReport', postDeleteReportUser);

router.post('/addReport', addReportReason);

router.post('/editGift', postEditGift);  

router.post('/editLevel', postEditLevel); 

router.get('/livestreams', getLiveStreamData);

router.post('/deleteLivestream', postDeleteLiveStream);

router.get('/transactions', getTransactionsData);

router.get('deleteTrans', postDeleteTransaction);

router.get('/packages', getPackageData);

router.post('/deletePackage', postDeletePackage);

router.get('/gift_catogories', getGiftCategoryData);

router.get('/banks', getBanksData);

router.post('/addSoundCategory', postAddSoundCategory);

const giftStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/gifts')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueSuffix)
    }
});
const uploadMulter = multer({ storage: giftStorage} );
router.post('/addGiftCategory', uploadMulter.single('picture'), postAddGiftCategory);

router.post('/deleteGiftCategory', postDeleteGiftCategory);

router.post('/deleteBank', postDeleteBank);

const bankStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/images')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
});
const uploadBank = multer({ storage: bankStorage} );
router.post('/addBank', uploadBank.single('picture'), postAddBank);

router.get('/gifts', getGiftsData);
router.post('/uploadGifts', uploadMulter.fields([{ name: 'picture', maxCount: 1 }, { name: 'giftSVGA', maxCount: 1 }]), postAddGift);
router.post('/deleteGift', postDeleteGift);

const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/banners')
  },
  filename: function (req, file, cb) {
    const uuid = uuidv4();
    const uniqueSuffix = uuid + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
});
const bannerMulter = multer({ storage: bannerStorage} );
router.get('/banners', getBannersData);
router.post('/deleteBanner', deleteBanner);
router.post('/addBanner', bannerMulter.single('banner'), addBanner);

router.get('/levels', getLevelsData);

router.get('/levels_xp', getLevelXpData);

const levelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/levels')
  },
  filename: function (req, file, cb) {
    const uuid = uuidv4();
    const uniqueSuffix = uuid + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
})
const uploadLevel = multer({ storage: levelStorage} );
router.post('/addLevel', uploadLevel.fields([{ name: 'picture', maxCount: 1 }, { name: 'badge', maxCount: 1 }]), postAddLevel);

router.post('/deleteLevel', postDeleteLevel);

router.get('/featured_users', getFeaturedUserData);

router.post('/deleteFeaturedUser', postDeleteFeaturedUserData);

router.post('/addFeatured', postAddFeaturedUserData);

router.post('/deleteFeatured', postDeleteFeaturedUser);

router.get('/verification_requests', getVerificationRequestData);

router.get('/verification_details', getVerificationRequestDetails);

router.post('/updateRequest', postUpdateVerificationReqDetails); 

router.get('/withdrawal_requests', getWithdrawalRequestData);

router.get('/withdrawal_details', getWithdrawalRequestDetails);

router.post('/updateWithdrawalRequest', postUpdateWithdrawalReqDetails);

router.post('/updateReportRequest', postUpdateReportDetails);

router.post('/deleteReportVideo', postDeleteReportVideo);

router.get('/report_video_details', getReportDataDetails);

router.get('/tags', getTagsData);

router.post('/addTags', postAddTag);

router.post('/upPriority', postUpPriority);

router.post('/downPriority', postDownPriority);

router.post('/toggleDefault', postDefault)

router.post('/deleteTag', postDeleteTag);

router.get('/notifications', getNotificationsData);

router.post('/saveNotification', postSaveNotifications);

router.get('/settings', getSettingsData);
router.get('/agora_settings', getAgoraSettingsData);
router.get('/cdn_settings', getCDNSettingsData);
router.get('/stripe_settings', getStripeSettingsData);
router.get('/password_settings', getSettingsData);
router.get('/server_settings', getServerSettingsData);
router.get('/app_settings', getAppSettingsData);
router.get('/algorithm_settings', getAlgorithmSettingsData); 

router.post('/saveAgora', postSaveAgora);

router.post('/setXp', postAddXPLevel); 

router.post('/deleteXp', postDeleteXPLevel);

router.post('/saveStripe', postSaveStripe);

router.post('/saveAlgorithm', postSaveAlgorithm);

router.post('/saveCDN', postCdn);

router.post('/savePassword', postSavePassword);

const saveStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/appIcon')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueSuffix)
    }
})
const appIcon = multer({ storage: saveStorage} );
router.post('/saveApp', appIcon.single('appIcon'), postSaveApp);

const saveStorage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/appIcon')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
})
const coinIcon = multer({ storage: saveStorage1} );
router.post('/saveAppSettings', coinIcon.single('iconStripe'), postSaveAppSettings);

router.post('/addCoins', postAddCoins); 

router.post('/generateToken', postGenerateToken);

module.exports = router