const User = require("../models/user");
const Movie = require("../models/movie");
const moment = require("moment");
module.exports = (app, passport) => {
	// =====================================
	// LOGIN ===============================
	// =====================================

	// process the login form
	app.post("/login", passport.authenticate("local-login"), (req, res) => {
		console.log("asdfasdfasdf", req.session);
		res.redirect("/profile");
	});

	// =====================================
	// SIGNUP ==============================
	// =====================================

	// process the signup form
	app.post("/signup", passport.authenticate("local-signup"), (req, res) => {
		res.redirect("/profile");
	});

	// =====================================
	// PROFILE SECTION =====================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get("/profile", isLoggedIn, (req, res) => {
		User.findOne({ "local.email": req.user.local.email })
			.populate("movies")
			.then(user =>
				res.json({
					movies: user.movies,
					user: user.local.email,
					session: req.session,
				})
			)
			.catch(err => res.json(err));
	});

	// =====================================
	// FACEBOOK ROUTES =====================
	// =====================================
	// route for facebook authentication and login
	app.get(
		"/auth/facebook",
		passport.authenticate("facebook", {
			scope: ["public_profile", "email"],
		})
	);

	// handle the callback after facebook has authenticated the user
	app.get(
		"/auth/facebook/callback",
		passport.authenticate("facebook", {
			successRedirect: "/profile",
			failureRedirect: "/",
		})
	);

	// =============================================================================
	// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
	// =============================================================================

	app.post(
		"/connect/local",
		passport.authenticate("local-signup", {
			successRedirect: "/profile", // redirect to the secure profile section
			failureRedirect: "/connect/local", // redirect back to the signup page if there is an error
			failureFlash: true, // allow flash messages
		})
	);

	// facebook -------------------------------

	// send to facebook to do the authentication
	app.get(
		"/connect/facebook",
		passport.authorize("facebook", {
			scope: ["public_profile", "email"],
		})
	);

	// handle the callback after facebook has authorized the user
	app.get(
		"/connect/facebook/callback",
		passport.authorize("facebook", {
			successRedirect: "/profile",
			failureRedirect: "/",
		})
	);

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get("/logout", (req, res) => {
		req.logout();
		req.session.destroy(err => {
			if (!err) {
				res.clearCookie("connect.sid", { path: "/" }).json({
					status: 200,
					logout: true,
				});
			} else {
				res.json(err);
			}
		});
	});

	//==================================================================
	// Movie Routes ====================================================
	//==================================================================
	//post api route inserts movie in to database
	app.post("/api/movie", (req, res) => {
		const { movie_name } = req.body;
		const newMovie = new Movie({
			movie_name,
			addedAt: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
			watchedAt: "",
		});
		Movie.create(newMovie)
			.then(result => {
				User.findOneAndUpdate(
					{ "local.email": req.user.local.email },
					{ $push: { movies: result._id } }
				)
					.then(response =>
						res.json({
							status: 200,
							movie_name,
							result,
						})
					)
					.catch(err => res.json(err));
			})
			.catch(err => res.json(err));
	});

	//put api route modifies watched boolean of selected movie
	app.put("/api/:movie", (req, res) => {
		const id = req.params.movie,
			watchedAt = moment(new Date()).format("MM-DD-YYYY, h:mm a");
		Movie.update({ _id: id }, { watchedAt: watchedAt, watched: true })
			.then(result =>
				res
					.json({
						status: 200,
						result,
					})
					.end()
			)
			.catch(err => res.json(err));
	});
};

// route middleware to make sure a user is logged in
const isLoggedIn = (req, res, next) => {
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated()) return next();

	res.json({ status: 404, isAuthenticated: req.isAuthenticated() });
};
