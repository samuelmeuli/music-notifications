const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('winston');

const database = require('../database');
const mailController = require('./mail-controller');
const jwtConfig = require('../../config.json').jwt;


/**
 * CREATE USER ACCOUNT
 * if no user with the entered email address exists, the address and hash of the entered password
 * are stored in a new user document in the database; a userId (_id) is automatically generated by
 * MongoDB
 */
exports.createUser = async (email, password) => {

	// connect to database
	const db = await database.connect();

	// create password hash
	const passwordHash = await bcrypt.hash(password, 10);

	// create new user document with entered email and hashed password in the database
	let newUser;
	try {
		newUser = await new db.User({
			email,
			passwordHash,
			dateCreated: Date.now()
		}).save();
		logger.info(`Created user ${newUser._id}`);
	}
	catch (err) {
		db.connection.close();
		// error: email address is already used for another account
		if (err.code === 11000) {
			logger.warn('Could not create user: email address is already taken');
			const newErr = new Error('Email address is already taken');
			newErr.name = 'emailTaken';
			throw newErr;
		}
		// other error
		else {
			logger.error('Error saving new user to database: ', err);
			throw err;
		}
	}

	db.connection.close();

	// send email with activation URL
	try {
		// generate activation JWT
		const activationToken = jwt.sign(
			{	userId: newUser._id, type: 'activation' }, // token claims
			jwtConfig.secret, // secret
			{ expiresIn: '1h' } // expiration time
		);
		// send URL with token via email
		await mailController.sendActivationLink(email, activationToken);
		logger.info(`Sent activation email to user ${newUser._id}`);
	}
	catch (err) {
		logger.error(`Error trying to send activation email to user ${newUser._id}: `, err);
		throw err;
	}
};


/**
 * ACTIVATE USER ACCOUNT
 * set attribute isActivated in user document to true
 */
exports.activateUser = async (userId) => {

	// connect to database
	const db = await database.connect();

	// find user account by userId and activate it
	let activatedUser;
	try {
		activatedUser = await db.User.findByIdAndUpdate(userId, { isActivated: true });
	}
	catch (err) {
		logger.error(`Error activating user ${userId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!activatedUser) {
		// error: user not found
		logger.error(`Error activating user: no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}
	else {
		// activation successful
		logger.info(`Activated user ${userId}`);
	}
};


/**
 * UPDATE USER ACCOUNT
 * change user's email address or password (and update lastSignOutTime in order to force user to
 * sign in again)
 */
exports.updateUser = async (userId, newEmail, newPassword) => {

	// connect to database
	const db = await database.connect();

	// update email/password
	let updatedUser;
	try {
		// get current time (will be set as new lastSignOutTime)
		const currentTime = Math.floor(Date.now() / 1000);

		// change email
		if (newEmail) {
			// find user with given userId and update their email address
			updatedUser = await db.User.findByIdAndUpdate(
				userId,
				{ email: newEmail, lastSignOutTime: currentTime }
			);
		}
		// change password
		else {
			// create password hash
			const newHash = await bcrypt.hash(newPassword, 10);
			// find user with given userId and update their password
			updatedUser = await db.User.findByIdAndUpdate(
				userId,
				{ passwordHash: newHash, lastSignOutTime: currentTime }
			);
		}
	}
	catch (err) {
		db.connection.close();
		// error: email address is already used for another account
		if (err.code === 11000) {
			logger.warn(`Could not update user ${userId}: email address is already taken`);
			const newErr = new Error('Email address is already taken');
			newErr.name = 'emailTaken';
			throw newErr;
		}
		// other error
		else {
			logger.error(`Error updating user ${userId}: `, err);
			throw err;
		}
	}

	db.connection.close();

	if (!updatedUser) {
		// error: user not found
		logger.error(`Error updating user: no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}
	else {
		// update successful
		logger.info(`Updated user ${userId}`);
	}
};


/**
 * DELETE USER ACCOUNT
 * delete user document from the database
 */
exports.deleteUser = async (userId) => {

	// connect to database
	const db = await database.connect();

	// remove user account with given userId
	let removedUser;
	try {
		removedUser = await db.User.findByIdAndRemove(userId);
	}
	catch (err) {
		logger.error(`Error deleting user ${userId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!removedUser) {
		// error: user not found
		logger.error(`Error deleting user: no user found with userId ${userId}`);
		const err = new Error('No user found with this userId');
		err.name = 'userNotFound';
		throw err;
	}
	else {
		// deletion successful
		logger.info(`Deleted user ${userId}`);
	}
};