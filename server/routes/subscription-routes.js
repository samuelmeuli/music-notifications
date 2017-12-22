const express = require('express');

const artistController = require('../controllers/artist-controller');
const authMiddleware = require('./auth-middleware');
const iTunesController = require('../controllers/itunes-controller');
const subscriptionController = require('../controllers/subscription-controller');

const router = express.Router();


/**
 * GET SUBSCRIPTIONS
 * GET /api/subscriptions
 */
router.get('/', authMiddleware, async (request, response) => {

	const userId = response.locals.userId;

	try {
		const artistList = await subscriptionController.getSubscriptions(userId);
		return response.status(200).send(artistList);
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
 * ADD SUBSCRIPTION
 * POST /api/subscriptions
 */
router.post('/', authMiddleware, async (request, response) => {

	const userId = response.locals.userId;
	const artistSearchKey = request.body.artist;

	// check for missing parameters
	if (!artistSearchKey) {
		return response.status(422).end();
	}

	// look up artist information (artistId, artistName, artistUrl)
	let iTunesArtist;
	try {
		iTunesArtist = await iTunesController.searchArtist(artistSearchKey);
	}
	catch (err) {
		// error: email address already used for another account
		if (err.name === 'artistNotFound') {
			return response.status(404).end();
		}
		// other error
		else {
			return response.status(500).end();
		}
	}

	// add artistId to user's subscription list
	try {
		await subscriptionController.addSubscription(userId, iTunesArtist.artistId);
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

	// get artist information from database or create artist document
	let artist;
	try {
		artist = await artistController.getOrCreateArtist(
			iTunesArtist.artistId,
			iTunesArtist.artistName,
			iTunesArtist.artistUrl
		);
		return response.status(200).send(artist);
	}
	catch (err) {
		return response.status(500).end();
	}
});


/**
 * DELETE SUBSCRIPTION(S)
 * DELETE /api/subscriptions
 */
router.delete('/', authMiddleware, async (request, response) => {

	const userId = response.locals.userId;
	const artistIds = request.body.artistIds;

	// check for missing parameters
	if (!artistIds) {
		return response.status(422).end();
	}

	// check if artistIds is array
	if (!(artistIds instanceof Array)) {
		return response.status(422).end();
	}

	// delete subscription(s)
	try {
		await subscriptionController.deleteSubscriptions(userId, artistIds);
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