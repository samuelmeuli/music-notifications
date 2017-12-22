const logger = require('winston');

const database = require('../database');


/**
 * GET SUBSCRIPTIONS
 * find the user's database entry, get the list of subscriptions (artistIds), and fetch the full
 * artist documents belonging to these artistIds from the artist database
 */
exports.getSubscriptions = async (userId) => {

	// connect to database
	const db = await database.connect();

	// retrieve list of user's subscriptions (artistIds)
	let user;
	try {
		// map subscriptions' artistIds to artist documents
		user = await db.User.findById(userId)
			.populate('artists');
	}
	catch (err) {
		logger.error(`Error getting subscriptions for user ${userId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!user) {
		// error: user not found
		logger.error(`Error retrieving subscriptions: no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}
	else {
		logger.debug(`Retrieved subscriptions for user ${userId}`);
		return user.artists;
	}
};


/**
 * ADD SUBSCRIPTION
 * add artistId to user's subscription list
 */
exports.addSubscription = async (userId, artistId) => {

	// connect to database
	const db = await database.connect();

	// add artistId to user's subscriptions
	let user;
	try {
		user = await db.User.findByIdAndUpdate(userId, { $addToSet: { subscriptions: artistId }});
	}
	catch (err) {
		logger.error(`Error adding subscription to user ${userId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!user) {
		// error: user not found
		logger.error(`Error adding subscription to user: no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}
	else {
		logger.info(`Added subscription ${artistId} to user ${userId}`);
	}
};


/**
 * REMOVE SUBSCRIPTION
 * remove artistIds from user's subscription list
 */
exports.deleteSubscriptions = async (userId, artistIds) => {

	// connect to database
	const db = await database.connect();

	// find user and remove artistIds from subscriptions array
	let user;
	try {
		user = await db.User.findByIdAndUpdate(userId, { $pull: { subscriptions: { $in: artistIds }}});
	}
	catch (err) {
		logger.error(`Error deleting subscription(s) ${artistIds} from user ${userId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!user) {
		// error: user not found
		logger.error(`Error deleting subscription(s): no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}
	else {
		logger.info(`Deleted subscription(s) ${artistIds} from user ${userId}`);
	}
};