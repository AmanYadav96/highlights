const db = require('../../config/db_wrapper');
const express = require('express')
const app = express()

const Dashboard = require('../../models/dashboard/index_model');

exports.getDashboardData = async (req, res) => {
    const dashboard = new Dashboard(db);

    const dashboardCounts = await dashboard.getDashboardCounts();
    const deviceCount = await dashboard.getDeviceCount();
    const users = await dashboard.getUsers();
    const notifications = await dashboard.getNotifications();
    const liveStreams = await dashboard.getLiveStreams();
    const giftExchanges = await dashboard.getGiftExchanges();
    const totalSales = await dashboard.getTotalSales();
    const getTotalSalesByMonth = await dashboard.getTotalSalesByMonth();
    
    const data = {
        deviceCount: {
            apple: parseInt(deviceCount[0].Apple ) ?? 0,
            android: parseInt(deviceCount[0].Android ) ?? 0,
            others: parseInt(deviceCount[0].Others ) ?? 0,
        },
        totalUsers:  parseInt(dashboardCounts[0].total_users) ?? 0,
        totalVideos:  parseInt(dashboardCounts[0].total_videos) ?? 0,
        totalPosts:  parseInt(dashboardCounts[0].total_posts) ?? 0,
        totalMessages:  parseInt(dashboardCounts[0].total_messages) ?? 0,
        users: users,
        notifications: notifications,
        liveStreams: liveStreams,
        giftExchanges: giftExchanges,
        totalSale: parseInt(totalSales[0].total_costing) ?? 0,
        totalIncome: parseInt(totalSales[0].total_coins_rewarded) ?? 0,
        comparePercentage: parseInt(totalSales[0].costing_pct_change) ?? 0,
        costByMonth: parseInt(getTotalSalesByMonth.totalCost) ?? 0,
        // salesMonth: parseInt(getTotalSalesByMonth[0].month) ?? 0,
        // coinsByMonth: parseInt(getTotalSalesByMonth[0].totalCoins) ?? 0,
        salesMonth: {
            January : parseInt(getTotalSalesByMonth[0].totalCost) ?? 0,
            February : parseInt(getTotalSalesByMonth[1].totalCost) ?? 0,
            March : parseInt(getTotalSalesByMonth[2].totalCost) ?? 0,
            April : parseInt(getTotalSalesByMonth[3].totalCost) ?? 0,
            May : parseInt(getTotalSalesByMonth[4].totalCost) ?? 0,
            June : parseInt(getTotalSalesByMonth[5].totalCost) ?? 0,
            July : parseInt(getTotalSalesByMonth[6].totalCost) ?? 0,
            August : parseInt(getTotalSalesByMonth[7].totalCost) ?? 0,
            September : parseInt(getTotalSalesByMonth[8].totalCost) ?? 0,
            October : parseInt(getTotalSalesByMonth[9].totalCost) ?? 0,
            November : parseInt(getTotalSalesByMonth[10].totalCost) ?? 0,
            December : parseInt(getTotalSalesByMonth[11].totalCost) ?? 0,
        },
        coinsByMonth: {
            January : parseInt(getTotalSalesByMonth[0].totalCoins) ?? 0,
            February : parseInt(getTotalSalesByMonth[1].totalCoins) ?? 0,
            March : parseInt(getTotalSalesByMonth[2].totalCoins) ?? 0,
            April : parseInt(getTotalSalesByMonth[3].totalCoins) ?? 0,
            May : parseInt(getTotalSalesByMonth[4].totalCoins) ?? 0,
            June : parseInt(getTotalSalesByMonth[5].totalCoins) ?? 0,
            July : parseInt(getTotalSalesByMonth[6].totalCoins) ?? 0,
            August : parseInt(getTotalSalesByMonth[7].totalCoins) ?? 0,
            September : parseInt(getTotalSalesByMonth[8].totalCoins) ?? 0,
            October : parseInt(getTotalSalesByMonth[9].totalCoins) ?? 0,
            November : parseInt(getTotalSalesByMonth[10].totalCoins) ?? 0,
            December : parseInt(getTotalSalesByMonth[11].totalCoins) ?? 0,
        },
    };
    res.render('pages/index', data);
}