const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const app = express();
const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');
const cookieParser = require('cookie-parser'); // Require cookie-parser
const jwt = require('jsonwebtoken');
require('dotenv').config(); // This should be in your main application file, not in each service file



// Set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layouts/layout'); // Specify the layout file

// Middleware to parse POST request body
app.use(express.urlencoded({ extended: false }));  // Insert this line here

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser()); // Use cookie-parser middleware

// Serve static files from /uploads (This is the new line you need to add)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to decode JWT and add username to res.locals for all views
app.use((req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      // Decode the JWT token to extract the username
      const decodedToken = jwt.decode(token);
      const username = decodedToken['cognito:username']; // Extract the username

      // Add username to res.locals, which makes it available in all templates
      res.locals.username = username;
    } catch (error) {
      console.error('Error decoding token:', error);
      res.locals.username = null; // If error occurs, ensure username is null
    }
  } else {
    res.locals.username = null; // No token, set username to null
  }

  next(); // Continue to the next middleware or route
});

// Use routers
app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/auth', authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

