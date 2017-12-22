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
 * ADD SUBSCRIPTION(S)
 * POST /api/subscriptions
 */
router.post('/', authMiddleware, async (request, response) => {

	const userId = response.locals.userId;
	const searchKeys = request.body.artists;

	// check whether searchKeys exists and if it is an array
	if (!searchKeys || !(searchKeys instanceof Array)) {
		return response.status(422).end();
	}

	// look up artist(s) on iTunes (fetch artistId, artistName, artistUrl)
	const artistsFound = [];
	const artistsFoundIds = [];
	const artistsNotFound = [];
	await Promise.all(
		searchKeys.map(async (searchKey) => {
			try {
				const iTunesArtist = await iTunesController.searchArtist(searchKey);
				artistsFound.push(iTunesArtist);
				artistsFoundIds.push(iTunesArtist.artistId)
			}
			catch (err) {
				// error: artist not found on iTunes
				if (err.name === 'artistNotFound') {
					artistsNotFound.push(searchKey);
				}
				// other error
				else {
					return response.status(500).end();
				}
			}
		})
	);

	// add artistIds to user's subscription list
	try {
		await subscriptionController.addSubscriptions(userId, artistsFoundIds);
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

	// get artist information from database or create artist document(s)
	try {
		const artists = await Promise.all(
			artistsFound.map(artist =>
				artistController.getOrCreateArtist(
					artist.artistId,
					artist.artistName,
					artist.artistUrl
				)
			)
		);
		// send database entries of artists that were found and search keys of artists that were not
		// found to client
		const resObj = {
			artistsFound: artists,
			artistsNotFound
		};
		return response.status(200).send(resObj);
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