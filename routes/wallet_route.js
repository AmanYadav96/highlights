const express = require('express');
const router = express.Router();
const config = require('../config/config');
const db = require('../config/db_handler');

router.get('', async (req, res) => {
    const userId = req.user.id;
    var result = await db.getWallet(userId);
    res.send(result);
});

router.post('/purchaseContent', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const videoId = req.body['videoId'] ?? 0;
    const amount = req.body['amount'];
    const coins = req.user.coins;
    if (amount <= coins) {
        // Eligible
        const purchaseRes = await db.purchaseContent(req.user, videoId);
        if (purchaseRes) {
            res.send({
                error: false,
                "purchaseResult": purchaseRes.purchaseResult,
            });
            return;
        }
    }
    res.send({
        error: true,
    });
});

router.post('/sendGift', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userId = req.body['userId'] ?? 0;
    const giftId = req.body['giftId'] ?? 0;

    if (userId == 0 || giftId == 0) {
        res.status(400).send({
            error: "params_invalid",
        });
        return;
    }

    const giftInfo = await db.getGiftInformation(req.user, giftId);
    const myGems = req.user.coins;
    console.log("sendGift", giftInfo.eligible, giftInfo.giftCoin <= myGems, giftInfo.giftCoin, myGems)
    if (giftInfo.giftCoin <= myGems) {
        // Eligible to send
        const giftSentRes = await db.sendGift(req.user, userId, giftInfo, req.body);
        if (giftSentRes) {

            global.addNotification(req.user, userId, {
                type: "gift",
                giftInfo: giftInfo,
            });

            res.send({
                "gems": myGems - giftInfo.giftCoin,
                "giftCoin": giftInfo.giftCoin,
            });
        } else {
            res.status(400).send({
                error: "gift_not_eligible",
            });
        }
    } else {
        // Not eligible
        res.status(400).send({
            error: "gift_not_eligible",
        });
    }
});

router.get('/getCoins', async (req, res) => {
    const userId = req.user.id;
    var result = await db.getCoinPackages(userId);
    res.send(result);
});


router.get('/getTips', async (req, res) => {
    const userId = req.user.id;
    var result = await db.getTips();
    res.send(result);
});

router.get('/banks', async (req, res) => {
    if(!req.user){
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userId = req.user.id;
    var result = await db.getBanks(userId);
    res.send(result);
});

router.post('/withdraw', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const type = req.body['type'] ?? 0;
    const amount = req.body['amount'] ?? 0;
    const paypalUsername = req.body['paypalUsername'] ?? "";
    const paypalEmail = req.body['paypalEmail'] ?? "";
    const bankName = req.body['bankName'] ?? "";
    const accNo = req.body['accNo'] ?? "";
    const ibanNo = req.body['ibanNo'] ?? "";
    const accTitle = req.body['accTitle'] ?? "";
    if (amount) {
        // Eligible
        const reponse = await db.insertWithdrawDetails(req.user.id, amount, type, paypalUsername, paypalEmail, bankName, accNo, ibanNo, accTitle);
        if (reponse) {
            res.send({
                result: true
            });
            return;
        }
        else{
            res.send({
                result: false
            });
            return;
        }
    }
    res.send({
        result: false,
    });
});

router.get('/withdraw_history', async (req, res) => {
    if(!req.user){
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userId = req.user.id;
    var result = await db.getWithdrawHistory(userId);
    res.send(result);
});

router.post('/iap_verify', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const code = req.body.code ?? "";
    const id = req.user.id;
    const purchaseToken = "";
    const purchaseMillis = "";
    const productId = req.body.code;

    const getCoinDetails = await db.getCoinDetails(code);
    if(getCoinDetails){
    const coins = getCoinDetails.coins ?? 0;
    const price = getCoinDetails.price ?? 0;
        const response = await db.updateUserCoins(id, coins);
        if(response){
            const updateXp = await db.updateUserXP(id);
            const transactions = await db.insertTransactionHistory(id, coins, price, productId, purchaseToken, purchaseMillis);
            res.send({
                "coins": response,
            });
        }else{
            res.status(400).send({
                error: "not_found"
            });
        }
    }else{
        res.status(400).send({
            error: "not_found"
        });
    }
  });



// APIs for web version of the app

router.post('/purchase_coins', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    var stripe = require('stripe')(global.config.stripe_license_key);
    const price = parseInt(req.body.price);
    const coins = parseInt(req.body.coins);
    console.log(price);
    console.log(coins);
    const id = req.body.id;
    console.log(id);
    const conversion = await db.getConfigs();
    const getBuyerCoins = await db.getBuyerCoins(id);
    const conversionRate = parseInt(conversion.conversion_rate_coin);
    let convertedCoins;
    if(conversionRate){
       convertedCoins = coins * conversionRate;
    }
    else{
      convertedCoins = coins;
    }

    if(getBuyerCoins < coins){
      res.status(400).send({
          "result": "User don't have enough coins."
      });
      return;
    }

    if(convertedCoins != price){
      res.status(400).send({
        error: "Amount is not converted correctly.",
      });
      return;
    }

    // create a new product with a dynamic price
    const product = await stripe.products.create({
      name: `${coins} Coins for $${price}`,
      description: 'Coins to use in our app',
      metadata: {
        coins: 'virtual',
      },
    });

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: price * 100, // convert to cents
      currency: 'usd',
    });

    // create a new checkout session with the dynamic price ID
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${global.hostAddress}success_coins?session_id={CHECKOUT_SESSION_ID}&coins=${coins}&price=${price}&u=${id}`,
      cancel_url: `${global.hostAddress}cancel`,
    });
    console.log(session.url);
    res.send({
        url : session.url
    });
  });

router.get('/trading_history', async (req, res) => {
    if(!req.user){
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userId = req.user.id;
    var result = await db.getTradingHistory(userId);
    res.send(result);
});

router.get('/trading_gems', async (req, res) => {
    if(!req.user){
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userId = req.user.id;
    var result = await db.getTradingData(userId);
    res.send(result);
});

  router.get('/conversion_rate', async (req, res) => {
    if(!req.user){
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const conversionRate = await db.getConfigs();
    if(parseInt(conversionRate.conversion_rate_per_coin) && parseInt(conversionRate.conversion_rate_coin)){
        res.send({
            "conversion_rate_gems" : parseInt(conversionRate.conversion_rate_per_coin),
            "conversion_rate_dollars" :  parseInt(conversionRate.conversion_rate_coin),
        });
    }
    else{
        res.status(400).send({
            error: "not_found"
        });
    }
});

  router.post('/trading', async (req, res) => {
        if (!req.user) {
            res.status(401).send({
                error: "unauthorized"
            });
            return;
        }
      const tradeId = req.body.tradeId;
      const buyerId = req.body.buyerId;
      const sellerId = req.body.sellerId;
      const sellerGems = req.body.gems;
      const buyerCoins = req.body.coins;
      const conversion = await db.getConfigs();
      const conversionRate = parseInt(conversion.conversion_rate_per_coin);
      const convertedGems = buyerCoins * conversionRate;
      const getSellerGems = await db.getSellerGems(sellerId);
      const getBuyerCoins = await db.getBuyerCoins(buyerId);

      console.log("Trade API", tradeId, buyerId, sellerId, sellerGems, buyerCoins)
      if(getSellerGems < sellerGems){
        res.status(401).send({
            "result": "Seller don't have enough gems"
        });
        return;
      }

      if(getBuyerCoins < buyerCoins){
        res.status(401).send({
            "result": "Buyer don't have enough coins."
        });
        return;
      }

      if(convertedGems != sellerGems){
        res.status(401).send({
            "result": "Coins are not converted correctly."
        });
        return;
      }
      if (conversionRate) {
          const transactions = await db.insertTradingDetails(buyerId, sellerId, buyerCoins, sellerGems, conversionRate);
          if (transactions) {
            const updateSeller = await db.updateSeller(sellerId, buyerCoins, sellerGems);
            const updateBuyer = await db.updateBuyer(buyerId, buyerCoins, sellerGems);
            if(updateBuyer && updateSeller){
                const tradeStatus = await db.updateTradingStatus(tradeId);
                res.status(401).send({
                    "result": true
                });
            }
          } else {

          }
      }
      else {
        res.status(401).send({
            "error": "conversion_error"
        });
      }
  });

  router.post('/sell_coins', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
      const userId = req.user.id;
      const gems = req.body.gems;
      const coins = req.body.coins;
      const conversion = await db.getConfigs();
      const conversionRate = parseInt(conversion.conversion_rate_per_coin);
      const convertedGems = coins * conversionRate;
      const getBuyerCoins = await db.getBuyerCoins(userId);

      if(getBuyerCoins < coins){
        res.status(400).send({
            "result": "User don't have enough coins."
        });
        return;
      }

      if(convertedGems != gems){
        res.status(400).send({
            "result": "Coins are not converted correctly."
        });
        return;
      }

      if (conversionRate) {
          const transactions = await db.insertTrade(userId, coins, gems, conversionRate);
          if (transactions) {
                res.status(401).send({
                    "result": true
                });
          } else {
            res.status(400).send({
                "result": false
            });
          }
      }
      else {
        res.status(401).send({
            "error": "conversion_error"
        });
      }
  });

module.exports = router