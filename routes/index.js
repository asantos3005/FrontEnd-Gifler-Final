const express = require('express');
const jwt = require('jsonwebtoken'); // Import jwt if not already
const router = express.Router();


// Route for the default index page
router.get('/', (req, res) => {
  const token = req.cookies.token; // Get token from cookies

  if (token) {
    // If the user has a valid token, redirect to the authenticated page
    return res.redirect('/indexauthenticated');
  } else {
    // Render the default index page for non-logged-in users, don't pass username
    return res.render('index', { title: 'Welcome to GIFler', username: null });
  }
});


router.get('/indexauthenticated', async (req, res) => {
  const token = req.cookies.token;
  let errorMessage = null;  // This will hold the error message if any

  if (!token) {
    // If no token, redirect to login page
    return res.redirect('/auth');
  }

  try {
    // Decode the JWT token to extract the username
    const decodedToken = jwt.decode(token);
    const username = decodedToken['cognito:username']; // Extract the username from the token

    console.log("Decoded username:", username);

    if (!username) {
      console.error("No username found in the token");
      return res.redirect('/auth');
    }

    // Render the authenticated index page with the extracted username and any error message
    res.render('indexauthenticated', { username: username, errorMessage: errorMessage });

  } catch (error) {
    console.error('Error verifying token:', error);
    return res.redirect('/auth');
  }
});


module.exports = router;
