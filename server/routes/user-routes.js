const express = require('express');

const authMiddleware = require('./auth-middleware');
const userController = require('../controllers/user-controller');

const router = express.Router();


/**
 * CREATE USER ACCOUNT
 * POST /api/users
 */
router.post('/', async (request, response) => {

	const email = request.body.email;
	const password = request.body.password;

	// check for missing parameters
	if (!email || !password) {
		return response.status(422).end();
	}

	// create user account
	try {
		await userController.createUser(email, password);
		return response.status(201).end();
	}
	catch (err) {
		// error: email address already used for another account
		if (err.name === 'emailTaken') {
			return response.status(409).end();
		}
		// other error
		else {
			return response.status(500).end();
		}
	}
});


/**
 * EDIT USER ACCOUNT
 * PATCH /api/users
 * change user account information (email XOR password)
 */
router.patch('/', authMiddleware, async (request, response) => {

	const userId = response.locals.userId;
	const newEmail = request.body.newEmail;
	const newPassword = request.body.newPassword;

	// check for missing parameters
	if ((newEmail && newPassword) || (!newEmail && !newPassword)) {
		return response.status(422).end();
	}

	// update user account
	try {
		await userController.updateUser(userId, newEmail, newPassword);
		return response.status(200).end();
	}
	catch (err) {
		// error: user not found
		if (err.name === 'userNotFound') {
			return response.status(410).end();
		}
		// error: email address already used for another account
		if (err.name === 'emailTaken') {
			return response.status(409).end();
		}
		// other error
		else {
			return response.status(500).end();
		}
	}
});


/**
 * DELETE USER ACCOUNT
 * DELETE /api/users
 */
router.delete('/', authMiddleware, async (request, response) => {

	const userId = response.locals.userId;

	// delete user account
	try {
		await userController.deleteUser(userId);
		return response.status(200).end();
	}
	catch (err) {
		// error: user not found
		if (err.name === 'userNotFound') {
			return response.status(410).end();
		}
		// other error
		else {
			return response.status(500).end();
		}
	}
});


module.exports = router;