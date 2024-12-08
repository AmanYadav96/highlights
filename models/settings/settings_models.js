const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');
const config = require('../../config/config');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

class Settings {
    constructor() {}

    async getSettingsData() {
        const results = await db.query(`SELECT * FROM config`);
        return utils.mapConfig(results);
      }


      async saveAdmobSettings(admobEnabled, admobAppId, admobNativeId) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('admobEnabled', ?), ('admobAppId', ?), ('admobNativeId', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [admobEnabled, admobAppId, admobNativeId]);
      }

      async saveGoogleSettings(googleAdEnabled, bannerAdnabled, admobBannerId, admobInterId, adMobInterval, admobBannerIdIos, admobInterIdIos, admobRewardAdId, admobRewardAdIdiOS) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('googleAdEnabled', ?), ('bannerAdnabled', ?), ('admobBannerId', ?), ('admobInterId', ?), ('adMobInterval', ?), ('admobBannerIdIos', ?), ('admobInterIdIos', ?), ('admobRewardId', ?), ('admobRewardIdIos', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [googleAdEnabled, bannerAdnabled, admobBannerId, admobInterId, adMobInterval, admobBannerIdIos, admobInterIdIos, admobRewardAdId,  admobRewardAdIdiOS]);
      }

      async saveAgoraSettings(agoraId, agoraSecret) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('agora_id', ?), ('agora_certificate', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [agoraId, agoraSecret]);
      }

      async saveStripeSettings(pubKey, licenseKey) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('stripe_publish_key', ?), ('stripe_license_key', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [pubKey, licenseKey]);
      }

      async saveContentSettings(settings, threshold) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('adult_content_setting', ?), ('adult_content_threshold', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [settings, threshold]);
      }

      async saveRabbitMQProducerSettings(settings) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('rabbit_mq_producer_setting', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [settings]);
      }

      async saveRabbitMQConsumerSettings(settings, producerSetting) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('rabbit_mq_consumer_setting', ?), ('rabbit_mq_producer_setting', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [settings, producerSetting]);
      }

      async saveRewardSettings(settings, count, reward_percentage) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('reward_setting', ?), ('videos_count', ?), ('reward_percentage', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [settings, count, reward_percentage]);
      }

      async saveAlgorithm(conversionRate, minWithdraw, videoPerDay, adAlgo, reffReward, boostPerView, commision, conversionRateCoins) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('boost_video', ?),  ('boost_per_day', ?), ('conversion_rate', ?), ('conversion_rate_per_coin', ?), ('minimum_withdrawal', ?), ('refferal_reward', ?), ('boost_per_view', ?), ('commision', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [adAlgo, videoPerDay, conversionRate, conversionRateCoins, minWithdraw, reffReward, boostPerView, commision]);
      }

      async saveCdnSettings(cdnBucket, cdnEndpoint, cdnKey, cdnRegion, cdnSecret, cdnType) {
        const cdnSettings = await db.execute(`INSERT INTO config (name, value) VALUES ('cdn_bucket_name', ?), ('cdn_endpoint', ?), ('cdn_key', ?), ('cdn_region', ?), ('cdn_secret', ?), ('cdn_type', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [cdnBucket, cdnEndpoint, cdnKey, cdnRegion, cdnSecret, cdnType]);
    }

    async savePassword(password, id) {
        const savePassword = await db.execute(`UPDATE admins set  password = ? WHERE id = ?`, [password, id]);
    }

    async saveAppSettings(appSecret, file, streamAddress, accAddress, domain, streamAddressPort, accAddressPort, loginAddress, loginPort) {
        let iconUrl = "";
        if (file) {
          const iconUpload = await upload_manager.upload({ key: 'appIcon', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
          iconUrl = iconUpload.Location;
        }
        if (iconUrl == "") {
          await db.execute(`INSERT INTO config (name, value) VALUES ('accessible_address', ?), ('app_id', ?),  ('service_url', ?), ('stream_address', ?), ('accessible_address_port', ?), ('stream_address_port', ?), ('login_address', ?), ('login_address_port', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [accAddress, appSecret, domain, streamAddress, accAddressPort, streamAddressPort, loginAddress, loginPort]);
        } else {
          await db.execute(`INSERT INTO config (name, value) VALUES ('accessible_address', ?), ('app_id', ?), ('app_logo', ?), ('service_url', ?), ('stream_address', ?), ('accessible_address_port', ?), ('stream_address_port', ?), ('login_address', ?), ('login_address_port', ?)  ON DUPLICATE KEY UPDATE value = VALUES(value);`, [accAddress, appSecret, iconUrl, domain, streamAddress, accAddressPort, streamAddressPort, loginAddress, loginPort]);
        }
      }

      async saveAppSetting(appName, faqLink, pvcLink, termsLink, file, androidPkg, iosPkg) {
        let coinPicture = "";
        if (file) {
          const iconUpload = await upload_manager.upload({ key: 'appIcon', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
          coinPicture = iconUpload.Location;
        }
        if (coinPicture == "") {
          await db.execute(`INSERT INTO config (name, value) VALUES ('app_name', ?), ('faq_link', ?), ('privacy_policy_link', ?), ('terms_link', ?), ('package_name_android', ?), ('package_name_ios', ?)  ON DUPLICATE KEY UPDATE value = VALUES(value);`, [appName, faqLink, pvcLink, termsLink, androidPkg, iosPkg]);
        } else {
          await db.execute(`INSERT INTO config (name, value) VALUES ('app_name', ?), ('coin_picture', ?), ('faq_link', ?), ('privacy_policy_link', ?), ('terms_link', ?), ('package_name_android', ?), ('package_name_ios', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [appName, coinPicture, faqLink, pvcLink, termsLink, androidPkg, iosPkg]);
        }
      }

      async saveAppRemoteSetting(defaultLang, darkTheme, primaryColor) {

          await db.execute(`INSERT INTO config (name, value) VALUES ('default_language', ?), ('isDarkTheme', ?), ('primary_color', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [defaultLang, darkTheme, primaryColor]);
      }

      async saveWebAppSetting(webAddress) {

        await db.execute(`INSERT INTO config (name, value) VALUES ('web_address', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [webAddress]);
    }

    async saveServiceAccountSetting(data) {
      console.log(data)
      await db.execute(`INSERT INTO config (name, value) VALUES ('service_account_details', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [data]);
    }
      
  }

  module.exports = Settings;