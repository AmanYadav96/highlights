const express = require('express');
const router = express.Router();

router.get('/videos/:id', async (req, res) => {
    const shareId = req.params.id;
    const userAgent = req.headers['user-agent'];

    // Define app package name and custom scheme
    const packageName = "com.kodeshtiktok.app";
    const customScheme = `bigboss://videos/${shareId}`;
    // Define app store links
    const appStoreLink = `https://play.google.com/store/apps/details?id=${packageName}`;
    const appStoreiOSLink = "https://apps.apple.com/app/bigboss-kodesh-short-videos/id6504600405";
    const webLink = "https://bigBoss.wiki/refer";

    // Function to create the HTML response for mobile devices
    const createMobileRedirectHTML = (schemeLink, storeLink, title, description) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <meta name="description" content="${description}">
                <meta http-equiv="refresh" content="0;url=${schemeLink}">
                <meta name="image" content="https://lh3.googleusercontent.com/0RehJuElkZ6EqwuIiQFps9Nbbdje-TB4PVEBxj7K1Vdkboms8FHiwdzzkHVyew3Ejfg">
                <script type="text/javascript">
                    setTimeout(function() {
                        window.location.href = "${storeLink}";
                    }, 1000);
                </script>
            </head>
            <body>
                If you are not redirected, <a href="${storeLink}">click here</a>.
            </body>
            </html>
        `;
    };

    // Function to create the HTML response for desktop browsers
    const createBrowserRedirectHTML = (storeLink, title, description) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <meta name="description" content="${description}">
                <meta http-equiv="refresh" content="0;url=${storeLink}">
                <meta name="image" content="https://lh3.googleusercontent.com/0RehJuElkZ6EqwuIiQFps9Nbbdje-TB4PVEBxj7K1Vdkboms8FHiwdzzkHVyew3Ejfg">
                <script type="text/javascript">
                    setTimeout(function() {
                        window.location.href = "${storeLink}";
                    }, 1000);
                </script>
            </head>
            <body>
                Redirecting to the app store. If you are not redirected, <a href="${storeLink}">click here</a>.
            </body>
            </html>
        `;
    };

    // Metadata for the title and description
    const title = "YidTok";
    const description = "";
    const image ="";

    // Check if the request is from a mobile device
    if (userAgent && /Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        // If the user agent indicates an Android or other mobile device, construct the appropriate response
        res.send(createMobileRedirectHTML(customScheme, appStoreLink, title, description));
    } else if (userAgent && /(iPhone|iPad)/i.test(userAgent)) {
        // If the user agent indicates an iOS device, construct the appropriate response
        res.send(createMobileRedirectHTML(customScheme, appStoreiOSLink, title, description));
    } else if (userAgent && /Macintosh|Mac OS/i.test(userAgent)) {
        // If the user agent indicates a macOS device, redirect to the iOS App Store in the browser
        res.send(createBrowserRedirectHTML(appStoreiOSLink, title, description));
    } else {
        // If the request is not from a mobile device or macOS, redirect to the Play Store in the browser
        res.send(createBrowserRedirectHTML(appStoreLink, title, description));
    }
});


router.get('/profile/:id', async (req, res) => {

    const shareId = req.params.id;
    const userAgent = req.headers['user-agent'];

    // Define app package name and custom scheme
    const packageName = "com.kodeshtiktok.app";
    const customScheme = `bigboss://profile/${shareId}`;
    // Define app store links
    const appStoreLink = `https://play.google.com/store/apps/details?id=${packageName}`;
    const appStoreiOSLink = "https://apps.apple.com/app/bigboss-kodesh-short-videos/id6504600405";
    const webLink = "https://bigBoss.wiki";

    // Function to create the HTML response for mobile devices
    const createMobileRedirectHTML = (schemeLink, storeLink, title, description) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <meta name="description" content="${description}">
                <meta http-equiv="refresh" content="0;url=${schemeLink}">
                <script type="text/javascript">
                    setTimeout(function() {
                        window.location.href = "${storeLink}";
                    }, 25);
                </script>
            </head>
            <body>
                If you are not redirected, <a href="${storeLink}">click here</a>.
            </body>
            </html>
        `;
    };

    // Metadata for the title and description
    const title = "YidTok";
    const description = "";

    // Check if the request is from a mobile device
    if (userAgent && /Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        // If the user agent indicates an Android or other mobile device, construct the appropriate response
        res.send(createMobileRedirectHTML(customScheme, appStoreLink, title, description));
    } else if (userAgent && /(iPhone|iPad)/i.test(userAgent)) {
        // If the user agent indicates an iOS device, construct the appropriate response
        res.send(createMobileRedirectHTML(customScheme, appStoreiOSLink, title, description));
    } else {
        // If the request is not from a mobile device, redirect to web link
        res.redirect(webLink);
    }
});

module.exports = router;

