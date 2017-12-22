const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('winston');

const database = require('../database');
const jwtConfig = require('../../config.json').jwt;


/**
 * SIGN IN
 * compare entered email and hash of entered password to user document in the database and return
 * JWT if they match and if the account is activated
 */
exports.signIn = async (email, password) => {

	// connect to database
	const db = await database.connect();

	// look up user by email in the database
	let user;
	try {
		user = await db.User.findOne({ email }).select('passwordHash isActivated');
	}
	catch (err) {
		logger.error('Error getting user for password comparison: ', err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!user) {
		// no user account for entered email access
		const err = new Error('There is no account with the entered email');
		err.name = 'wrongEmail';
		throw err;
	}
	else if (!user.isActivated) {
		// account has not been activated yet
		const err = new Error('The user account has not been activated yet');
		err.name = 'accountNotActivated';
		throw err;
	}

	// compare hash in database with hash of entered password
	const isCorrect = await bcrypt.compare(password, user.passwordHash);
	if (isCorrect) {
		// password is correct -> create JWT
		// construct JWT
		return jwt.sign(
			{ userId: user._id, type: 'auth' }, // token claims
			jwtConfig.secret, // secret
			{ expiresIn: '1h' } // expiration time
		);
	}
	else {
		// password is incorrect
		const err = new Error('The provided password is incorrect');
		err.name = 'wrongPassword';
		throw err;
	}
};


/**
 * SIGN OUT
 * invalidate all of the user's JWTs by setting lastSignOutTime to the current time
 */
exports.signOut = async (userId) => {

	// connect to database
	const db = await database.connect();

	// set lastSignOutTime in user document to the current time
	const currentTime = Math.floor(Date.now() / 1000);
	let user;
	try {
		user = await db.User.findByIdAndUpdate(userId, { lastSignOutTime: currentTime });
	}
	catch (err) {
		logger.error(`Error updating lastSignOutTime for user ${userId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!user) {
		// error: user not found
		logger.error(`Error updating lastSignOutTime: no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}
};


/**
 * TOKEN EXPIRY CHECK
 * check whether current time is larger than JWT's expiry time
 */
exports.tokenExpiryCheck = async (userId, tokenCreationTime) => {

	// connect to database
	const db = await database.connect();

	// find user account by userId and get lastSignOutTime
	let user;
	try {
		user = await db.User.findById(userId).select('lastSignOutTime');
	}
	catch (err) {
		logger.error(`Error getting lastSignOutTime for user ${userId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!user) {
		// error: user not found
		logger.error(`Error getting lastSignOutTime: no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}

	// check whether token has expired
	return tokenCreationTime > user.lastSignOutTime;
};