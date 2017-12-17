const bodyParser = require('body-parser');
const CronJob = require('cron').CronJob;
const express = require('express');
const logger = require('winston');

// routes
const userRoutes = require('./routes/user-routes');
const securityRoutes = require('./routes/security-routes');
const subscriptionRoutes = require('./routes/subscription-routes');

// controllers
const mailController = require('./controllers/mail-controller');
const updateController = require('./controllers/update-controller');

const port = process.env.PORT || 3000;


/**
 * LOGGER SETUP
 * configure default Winston logger to make it available in all modules without additional imports
 */
logger.configure({
	transports: [
		new logger.transports.Console({
			level: 'info',
			colorize: true,
			timestamp: true
		}),
		new logger.transports.File({
			level: 'info',
			filename: 'server-log.log',
			json: false,
			maxsize: 1000 * 1000, // limit log file size to 1 MB (then start a new one)
			maxFiles: 3 // keep up to 3 log files
		})
	]
});


/**
 * SERVER INITIALIZATION
 */
const server = express();
server.use(bodyParser.urlencoded({ extended: false })); // extended: disallow nested objects
server.use(bodyParser.json());

// listen to port specified in process.env.PORT (or port 3000 if not defined)
server.listen(port, () => {
	logger.info(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);

	// set up routes
	server.use('/api/auth', securityRoutes);
	server.use('/api/subscriptions', subscriptionRoutes);
	server.use('/api/users', userRoutes);
});


/**
 * DATABASE UPDATE AND EMAIL NOTIFICATIONS
 * create CronJob for periodically fetching each artist's newest release and sending notifications
 * to subscribers
 */
new CronJob(
	'00 00 09 * * *', // run job every day at 9am
	async () => {
		// fetch newest albums for all artists in the database and create a list of all users who have
		// subscribed to artists with new releases
		let notificationList = [];
		try {
			const updatedArtists = await updateController.updateArtists();
			notificationList = await updateController.getNotificationList(updatedArtists);
		}
		catch (err) {
			logger.error('Error during database update: ', err);
		}

		// notify users via email about new releases by artists they have subscribed to
		try {
			await Promise.all(
				notificationList.map(notification =>
					mailController.sendNotification(notification.email, notification.updatedSubscriptions)
				)
			);
			logger.info(`Sent out ${notificationList.length} notification emails`);
		}
		catch (err) {
			logger.error('Error trying to send notification emails: ', err);
		}
	},
	true, // start job immediately
	'Europe/Amsterdam' // time zone
);