const logger = require('winston');
const jwt = require('jsonwebtoken');

const securityController = require('../controllers/security-controller');
const serverConfig = require('../../config/server-config.json');


/**
 * AUTHENTICATION MIDDLEWARE
 * check whether provided JWT is valid and has not expired yet, then extract userId and pass it on
 * to routes
 */
module.exports = async (request, response, next) => {

	logger.debug('New authentication request');

	// check for authorization header
	if (!request.headers.authorization) {
		logger.warn('Request missing authorization header');
		return response.status(401).end();
	}

	// check whether request uses Bearer authentication schema
	let token = request.headers.authorization;
	if (!token.startsWith('Bearer ')) {
		// wrong authentication schema
		logger.warn('Request header has wrong authentication schema (needs to be in Bearer schema)');
		return response.status(401).end();
	}

	// verify and decode JWT
	token = token.slice(7); // remove 'Bearer ' from authorization header
	let jwtDecoded;
	try {
		jwtDecoded = jwt.verify(token, serverConfig.jwtSecret);
	}
	catch (err) {
		// JWT has expired
		logger.warn('JWT has expired');
		return response.status(401).end();
	}

	// verify that JWT is of auth type
	if (jwtDecoded.type !== 'auth') {
		logger.warn(`JWT is not of auth type for user ${jwtDecoded.userId}`);
		return response.status(401).end();
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
		// token is valid -> save userId as local variable (to make it accessible from routes)
		logger.debug(`JWT is valid for user ${jwtDecoded.userId}`);
		response.locals.userId = jwtDecoded.userId;
		return next();
	}
	else {
		logger.warn(`JWT has been forced to expire for user ${jwtDecoded.userId}`);
		return response.status(401).end();
	}
};