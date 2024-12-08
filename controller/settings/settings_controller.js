const config = require("../../config/config");
const crypto = require("crypto");
const Settings = require("../../models/settings/settings_models");

exports.getSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      agora_id: settings.agora_id ?? "",
      agora_certificate: settings.agora_certificate ?? "",
      cdn_key: settings.cdn_key ?? "",
      cdn_endpoint: settings.cdn_endpoint ?? "",
      cdn_region: settings.cdn_region ?? "",
      cdn_type: settings.cdn_type ?? "",
      minimum_withdrawal: settings.minimum_withdrawal ?? "",
      refferal_reward: settings.refferal_reward ?? "",
      boost_per_day: settings.boost_per_day ?? "",
      stripe_license_key: settings.stripe_license_key ?? "",
      conversion_rate: settings.conversion_rate ?? "",
      conversion_rate_per_coin: settings.conversion_rate_per_coin ?? "",
      stripe_publish_key: settings.stripe_publish_key ?? "",
      boost_video: settings.boost_video ?? "",
      cdn_bucket_name: settings.cdn_bucket_name ?? "",
      cdn_secret: settings.cdn_secret ?? "",
      app_icon: settings.app_icon ?? "",
      app_name: settings.app_name ?? "",
      app_id: settings.app_id ?? "",
      accessible_address: settings.accessible_address ?? "",
      socket_url: settings.socket_url ?? "",
      faq_link: settings.faq_link ?? "",
      privacy_policy_link: settings.privacy_policy_link ?? "",
      terms_link: settings.terms_link ?? "",
      boost_per_view: settings.boost_per_view ?? "",
      service_url: settings.service_url ?? "",
      stream_address: settings.stream_address ?? "",
      accessible_address_port: settings.accessible_address_port ?? "",
      stream_address_port: settings.stream_address_port ?? "",
      package_name_android: settings.package_name_android ?? "",
      package_name_ios: settings.package_name_ios ?? "",
      login_address: settings.login_address ?? "",
      login_address_port: settings.login_address_port ?? "",
      commision: settings.commision ?? "",
      reward_setting: settings.reward_setting ?? "",
      videos_count: settings.videos_count ?? "",
      adult_content_setting: settings.adult_content_setting ?? "",
      rabbit_mq_consumer_setting: settings.rabbit_mq_consumer_setting ?? "",
      rabbit_mq_producer_setting: settings.rabbit_mq_producer_setting ?? "",
      adult_content_threshold: settings.adult_content_threshold ?? "4.0",

    },
  };
  res.render("pages/password_settings", data);
};

exports.getAgoraSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      agora_id: settings.agora_id ?? "",
      agora_certificate: settings.agora_certificate ?? "",
    },
  };
  res.render("pages/agora_settings", data);
};

exports.getAppRemoteSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();

  const data = {
    config: {
      default_language: settings.default_language ?? "",
      isDarkTheme: settings.isDarkTheme ?? "",
      primary_color: settings.primary_color ?? "",
    },
  };
  res.render("pages/app_remote_settings", data);
};

exports.getCDNSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      cdn_key: settings.cdn_key ?? "",
      cdn_endpoint: settings.cdn_endpoint ?? "",
      cdn_region: settings.cdn_region ?? "",
      cdn_type: settings.cdn_type ?? "",
      cdn_bucket_name: settings.cdn_bucket_name ?? "",
      cdn_secret: settings.cdn_secret ?? "",
    },
  };
  res.render("pages/cdn_settings", data);
};

exports.getStripeSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      stripe_license_key: settings.stripe_license_key ?? "",
      stripe_publish_key: settings.stripe_publish_key ?? "",
    },
  };
  res.render("pages/stripe_settings", data);
};

exports.getContentSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      adult_content_setting: settings.adult_content_setting ?? "",
      adult_content_threshold: settings.adult_content_threshold ?? "4.0",
    },
  };
  res.render("pages/content_settings", data);
};

exports.getRabbitMqSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      rabbit_mq_consumer_setting: settings.rabbit_mq_consumer_setting ?? "",
      rabbit_mq_producer_setting: settings.rabbit_mq_producer_setting ?? "",
    },
  };
  res.render("pages/rabbitmq_settings", data);
};

exports.getRewardSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      reward_setting: settings.reward_setting ?? "",
      videos_count: settings.videos_count ?? "",
      reward_percentage: settings.reward_percentage ?? "",
    },
  };
  res.render("pages/rewards_settings", data);
};

exports.getWebAppSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      web_address: settings.web_address ?? "",
    },
  };
  res.render("pages/web_app_settings", data);
};

exports.getServiceAccountData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      service_account_details: JSON.stringify(settings.service_account_details) ?? "",
    },
  };
  res.render("pages/service_account_settings", data);
};

exports.getServerSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      app_icon: settings.app_icon ?? "",
      app_id: settings.app_id ?? "",
      accessible_address: settings.accessible_address ?? "",
      socket_url: settings.socket_url ?? "",
      service_url: settings.service_url ?? "",
      stream_address: settings.stream_address ?? "",
      accessible_address_port: settings.accessible_address_port ?? "",
      stream_address_port: settings.stream_address_port ?? "",
      login_address: settings.login_address ?? "",
      login_address_port: settings.login_address_port ?? "",
    },
  };
  res.render("pages/server_settings", data);
};

exports.getAlgorithmSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      minimum_withdrawal: settings.minimum_withdrawal ?? "",
      refferal_reward: settings.refferal_reward ?? "",
      boost_per_day: settings.boost_per_day ?? "",
      conversion_rate: settings.conversion_rate ?? "",
      conversion_rate_per_coin: settings.conversion_rate_per_coin ?? "",
      boost_video: settings.boost_video ?? "",
      boost_per_view: settings.boost_per_view ?? "",
      commision: settings.commision ?? "",
    },
  };
  res.render("pages/algorithm_settings", data);
};

exports.getAppSettingsData = async (req, res) => {
  const settingsModel = new Settings();
  const settings = await settingsModel.getSettingsData();
  const data = {
    config: {
      agora_id: settings.agora_id ?? "",
      agora_certificate: settings.agora_certificate ?? "",
      cdn_key: settings.cdn_key ?? "",
      cdn_endpoint: settings.cdn_endpoint ?? "",
      cdn_region: settings.cdn_region ?? "",
      cdn_type: settings.cdn_type ?? "",
      minimum_withdrawal: settings.minimum_withdrawal ?? "",
      refferal_reward: settings.refferal_reward ?? "",
      boost_per_day: settings.boost_per_day ?? "",
      stripe_license_key: settings.stripe_license_key ?? "",
      conversion_rate: settings.conversion_rate ?? "",
      conversion_rate_per_coin: settings.conversion_rate_per_coin ?? "",
      stripe_publish_key: settings.stripe_publish_key ?? "",
      boost_video: settings.boost_video ?? "",
      cdn_bucket_name: settings.cdn_bucket_name ?? "",
      cdn_secret: settings.cdn_secret ?? "",
      app_icon: settings.app_icon ?? "",
      app_name: settings.app_name ?? "",
      app_id: settings.app_id ?? "",
      accessible_address: settings.accessible_address ?? "",
      socket_url: settings.socket_url ?? "",
      faq_link: settings.faq_link ?? "",
      privacy_policy_link: settings.privacy_policy_link ?? "",
      terms_link: settings.terms_link ?? "",
      boost_per_view: settings.boost_per_view ?? "",
      service_url: settings.service_url ?? "",
      stream_address: settings.stream_address ?? "",
      accessible_address_port: settings.accessible_address_port ?? "",
      stream_address_port: settings.stream_address_port ?? "",
      package_name_android: settings.package_name_android ?? "",
      package_name_ios: settings.package_name_ios ?? "",
      login_address: settings.login_address ?? "",
      login_address_port: settings.login_address_port ?? "",
      commision: settings.commision ?? "",
      reward_setting: settings.reward_setting ?? "",
      videos_count: settings.videos_count ?? "",
      adult_content_setting: settings.adult_content_setting ?? "",
      rabbit_mq_consumer_setting: settings.rabbit_mq_consumer_setting ?? "",
      rabbit_mq_producer_setting: settings.rabbit_mq_producer_setting ?? "",
      adult_content_threshold: settings.adult_content_threshold ?? "4.0",
    },
  };
  res.render("pages/app_settings", data);
};

exports.postSaveAgora = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;
  const agoraSettings = await settingsModel.saveAgoraSettings(
    userData.agoraId,
    userData.agoraSecret
  );

  res.send({
    status: "success",
    message: "Your Agora Settings updated successfully!",
  });
};

exports.postSaveStripe = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;

  const stripeSettings = await settingsModel.saveStripeSettings(
    userData.pubKey,
    userData.secretKey
  );

  res.send({
    status: "success",
    message: "Your Stripe keys Settings updated successfully!",
  });
};

exports.postSaveAlgorithm = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;
  const agoraSettings = await settingsModel.saveAlgorithm(
    userData.conversionRate,
    userData.minWithdraw,
    userData.videoPerDay,
    userData.adAlgo,
    userData.reffReward,
    userData.boostPerView,
    userData.commision,
    userData.conversionRateCoin
  );

  res.send({
    status: "success",
    message: "Your Algorithms updated successfully!",
  });
};

exports.postCdn = async (req, res) => {
  const settingsModel = new Settings();
  userData = req.body;
  const cdnSettings = await settingsModel.saveCdnSettings(
    userData.cdnBucket,
    userData.cdnEndpoint,
    userData.cdnKey,
    userData.cdnRegion,
    userData.cdnSecret,
    userData.cdnType == 1
      ? "aws"
      : userData.cdnType == 2
      ? "digitalocean"
      : userData.cdnType == 3
      ? "wasabi"
      : "none"
  );

  res.send({
    status: "success",
    message: "Your CDN Settings updated successfully!",
  });
};

exports.postSavePassword = async (req, res) => {
  const settingsModel = new Settings();
  userData = req.body;
  const savePassword = await settingsModel.savePassword(
    userData.password,
    userData.id
  );

  res.send({
    status: "success",
    message: "Your Password updated successfully!",
  });
};

exports.postSaveApp = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;
  const saveApp = await settingsModel.saveAppSettings(
    userData.appSecret,
    req.file,
    userData.streamAddress,
    userData.accAddress,
    userData.domain,
    userData.streamAddressPort,
    userData.accAddressPort,
    userData.loginAddress,
    userData.loginPort
  );
  res.send({
    status: "success",
    message: "Your Server Settings updated successfully!",
  });
};

exports.postSaveWebAppSettings = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;
  const saveApp = await settingsModel.saveWebAppSetting(
    userData.webAdress
  );
  res.send({
    status: "success",
    message: "Your Web App Settings updated successfully!",
  });
};

exports.postSaveServiceAccountSettings = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;
  console.log(userData)
  const saveApp = await settingsModel.saveServiceAccountSetting(
    userData.data
  );
  res.send({
    status: "success",
    message: "Your service details updated successfully!",
  });
};

exports.postSaveAppSettings = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;
  const saveApp = await settingsModel.saveAppSetting(
    userData.appName,
    userData.faqLink,
    userData.pvcLink,
    userData.pvcLink,
    req.file,
    userData.androidPkg,
    userData.iosPkg
  );
  res.send({
    status: "success",
    message: "Your App Settings updated successfully!",
  });
};

exports.saveAppRemoteSettings = async (req, res) => {
  const settingsModel = new Settings();
  const userData = req.body;
  const saveApp = await settingsModel.saveAppRemoteSetting(
    userData.defaultLang,
    userData.darkTheme,
    userData.primaryColor
  );
  const remoteConfig = adminFirebase.remoteConfig();
  const remoteConfigTemplate = await remoteConfig.getTemplate();

  remoteConfigTemplate.parameters.defaultLanguage = {
    defaultValue: {
      value: userData.defaultLang,
    },
    valueType: 'STRING'
  };

  remoteConfigTemplate.parameters.isDarkTheme = {
    defaultValue: {
      value: userData.darkTheme,
    },
    valueType: 'BOOLEAN'
  };

  remoteConfigTemplate.parameters.primaryColor = {
    defaultValue: {
      value: userData.primaryColor,
    },
    valueType: 'STRING'
  };

  const newParam = await remoteConfig.publishTemplate(remoteConfigTemplate);
  
  res.send({
    status: "success",
    message: "Your App Remote Configs updated successfully in firebase!",
  });
};

exports.postGenerateToken = async (req, res) => {
  userData = req.body;
  const hash = crypto
    .createHash("sha256")
    .update(Date.now().toString())
    .digest("hex");
  res.send({ status: "success", hash: hash });
};

exports.postRewardSettings = async (req, res) => {
  const settingsModel = new Settings();
  userData = req.body;
  const cdnSettings = await settingsModel.saveRewardSettings(
    userData.settings,
    userData.count,
    userData.reward_percentage
  );

  res.send({
    status: "success",
    message: "Your Reward Settings updated successfully!",
  });
};

exports.postContentSettings = async (req, res) => {
  const settingsModel = new Settings();
  userData = req.body;
  console.log(userData);
  const cdnSettings = await settingsModel.saveContentSettings(
    userData.settings,
    userData.threshold
  );

  res.send({
    status: "success",
    message: "Your Adult Content Settings updated successfully!",
  });
};

exports.postRabbitMQConsumerSettings = async (req, res) => {
  const settingsModel = new Settings();
  const { consumerSetting, producerSetting } = req.body;
  await settingsModel.saveRabbitMQConsumerSettings(
    consumerSetting,
    producerSetting
  );
  res.send({
    status: "success",
    message: "Your RabbitMQ Consumer Settings updated successfully!",
  });
};

exports.postRabbitMQProducerSettings = async (req, res) => {
  const settingsModel = new Settings();
  const { producerSetting } = req.body;
  await settingsModel.saveRabbitMQProducerSettings(producerSetting);
  res.send({
    status: "success",
    message: "Your RabbitMQ Producer Settings updated successfully!",
  });
};
