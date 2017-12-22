const nodemailer = require('nodemailer');

const mailConfig = require('../../config.json').email;


// mail configuration
const transporter = nodemailer.createTransport({
	auth: {
		user: mailConfig.address,
		pass: mailConfig.password
	},
	host: mailConfig.host,
	port: 587, // port for secure SMTP
	secureConnection: false, // TLS requires secureConnection to be false
	tls: {
		ciphers: 'SSLv3'
	}
});


/**
 * SEND ACCOUNT ACTIVATION EMAIL
 * send email with URL (containing activation JWT) for activating the user's account
 */
exports.sendActivationLink = (email, activationToken) => {

	// subject
	const subject = 'Account activation';

	// body
	const activationUrl = `http://localhost:${process.env.PORT}/api/auth/activation/${activationToken}`;
	const mailBody = `
		<h1>MusicNotifications</h1>
		<p>You have successfully created your MusicNotifications account!</p>
		<p>Please open the following URL by clicking on it or copying it into your web browser:</p>
		<a>${activationUrl}</a>
		<p>The link is valid for the next hour.</p>
	`;

	// mail settings
	const mailOptions = {
		from: `MusicNotifications <${mailConfig.address}>`,
		to: email,
		subject,
		html: mailBody
	};

	// send mail (returns promise)
	return transporter.sendMail(mailOptions);
};


/**
 * SEND NOTIFICATION EMAIL
 * send email containing a list of new releases by artists the user has subscribed to
 */
exports.sendNotification = (email, artists) => {

	// subject
	let subject = '';
	if (artists.length === 1) {
		subject = `New music by ${artists[0].artistName}!`;
	}
	else if (artists.length === 2) {
		subject = `New music by ${artists[0].artistName} and ${artists[1].artistName}!`;
	}
	else {
		subject = `New music by ${artists[0].artistName}, ${artists[1].artistName}, and others!`;
	}

	// mail title
	let mailBody = '<h1>MusicNotifications</h1>';

	// introduction
	if (artists.length === 1) {
		mailBody += '<p>One of your favorite artists has just released new music:</p>';
	}
	else {
		mailBody += '<p>Some of your favorite artists have just released new music:</p>';
	}

	// list of new releases
	for (let i = 0; i < artists.length; i += 1) {
		mailBody += `
			<li>${artists[i].latestAlbum.albumType} <a href="${artists[i].latestAlbum.albumUrl}">"${artists[i].latestAlbum.albumName}"</a> by ${artists[i].artistName}</li>
		`;
	}

	// mail settings
	const mailOptions = {
		from: `MusicNotifications <${mailConfig.address}>`,
		to: email,
		subject,
		html: mailBody
	};

	// send mail (returns promise)
	return transporter.sendMail(mailOptions);
};