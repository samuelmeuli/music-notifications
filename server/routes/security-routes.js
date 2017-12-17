const logger = require('winston');
const express = require('express');
const jwt = require('jsonwebtoken');

const authMiddleware = require('./auth-middleware');
const securityController = require('../controllers/security-controller');
const serverConfig = require('../../config/server-config.json');
const userController = require('../controllers/user-controller');

const router = express.Router();


/**
 * SIGN IN
 * POST /api/auth/signin
 */
router.post('/signin', async (request, response) => {

	const email = request.body.email;
	const password = request.body.password;

	// check for missing parameters
	if (!email || !password) {
		return response.status(422).end();
	}

	// sign in
	try {
		const token = await securityController.signIn(email, password);
		return response.status(201).send(token); // login successful -> send JWT to client
	}
	catch (err) {
		// error: wrong email or password
		if (err.name === 'wrongEmail' || err.name === 'wrongPassword') {
			return response.status(401).end();
		}
		// error: account not activated yet
		else if (err.name === 'accountNotActivated') {
			return response.status(403).end();
		}
		// other error
		else {
			return response.status(500).end();
		}
	}
});


/**
 * SIGN OUT
 * POST /api/auth/signout
 */
router.post('/signout', authMiddleware, async (request, response) => {

	const userId = response.locals.userId;

	try {
		await securityController.signOut(userId);
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


/**
 * ACTIVATE ACCOUNT
 * GET /api/auth/activation/:token
 */
router.get('/activation/:token', async (request, response) => {

	// decode JWT
	const token = request.params.token;
	const jwtDecoded = jwt.verify(token, serverConfig.jwtSecret);

	// verify that JWT is of activation type
	if (jwtDecoded.type !== 'activation') {
		logger.warn('JWT is not of activation type');
		return response.status(403).end();
	}

	// check that account has not been modified / user has not logged out since token creation
	let tokenIsValid;
	try {
		tokenIsValid = await securityController.tokenExpiryCheck(jwtDecoded.userId, jwtDecoded.iat);
	}
	catch (err) {
		return response.status(500).end();
	}

	if (tokenIsValid) {
		try {
			// token is valid -> activate user
			await userController.activateUser(jwtDecoded.userId);
			return response.redirect('/signin/activation-successful');
		}
		catch (err) {
			return response.status(500).end();
		}
	}
	else {
		return response.status(401).end();
	}
});


module.exports = router;