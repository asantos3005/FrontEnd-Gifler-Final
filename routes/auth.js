const express = require('express');
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const jwt = require("aws-jwt-verify");
const router = express.Router();
const { InitiateAuthCommand } = Cognito;
const parameter_name_client = "/n11628472/cognitoClientId";
const parameter_name_userpool = "/n11628472/userPoolId";
const client = new SSM.SSMClient({ region: "ap-southeast-2" });

const cognitoClient = new Cognito.CognitoIdentityProviderClient({
    region: 'ap-southeast-2'
  });

  //const clientId = '7o2mj6s64nfo0i5eq4h16c3bqr'; 

  async function getCognitoClientIdParameter() {
    try {
      parameterResponse = await client.send(
         new SSM.GetParameterCommand({
            Name: parameter_name_client
         })
      );
      console.log(parameterResponse.Parameter.Value);
      return parameterResponse.Parameter.Value;
   } catch (error) {
      console.log(error);
   }
  }

  async function getCognitoUserPoolIdParameter() {
    try {
      parameterResponse = await client.send(
         new SSM.GetParameterCommand({
            Name: parameter_name_userpool
         })
      );
      console.log(parameterResponse.Parameter.Value);
      return parameterResponse.Parameter.Value;
   } catch (error) {
      console.log(error);
   }
  }



// Render the login page
router.get('/', (req, res) => {
    const errorMessage = req.query.error || null;
    res.render('login', { title: 'Login', error: errorMessage });
  });

// Render the login page
router.get('/register', (req, res) => {
    res.render('registration', { title: 'Login', error: null }); // Pass error as null initially
});


// Handle login form submission
router.post('/loginsubmit', async (req, res) => {
    const { username, password } = req.body;
    const userPoolId = await getCognitoUserPoolIdParameter();
    const clientId = await getCognitoClientIdParameter();

    // Verifier for the ID token
    const idVerifier = jwt.CognitoJwtVerifier.create({
        userPoolId: userPoolId,
        tokenUse: "id",
        clientId: clientId,
    });

    // Parameters for authentication
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password
        }
    };

    // Create Cognito client
    const client = new Cognito.CognitoIdentityProviderClient({
        region: "ap-southeast-2",
    });

    try {
        console.log("Getting auth token");

        // Get authentication tokens from the Cognito API using username and password
        const command = new InitiateAuthCommand(params);
        const response = await client.send(command); // Execute command and get the response

        // Check if authentication succeeded
        if (!response.AuthenticationResult || !response.AuthenticationResult.IdToken) {
            throw new Error('Authentication failed, no ID token returned.');
        }

        // ID Tokens are used to authenticate users to your application
        const IdToken = response.AuthenticationResult.IdToken;
        
        // Verify the ID Token
        const IdTokenVerifyResult = await idVerifier.verify(IdToken);
        console.log("ID Token verified:", IdTokenVerifyResult);

        // Set a cookie with the JWT (ID token)
        res.cookie('token', IdToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' }); // Use `secure` in production

        // Redirect to authenticated home page
        res.redirect('/indexauthenticated');

    } catch (error) {
        console.error('Error logging in:', error);

        // Return to login page with error message
        return res.render('login', { title: 'Login', error: 'Invalid username or password' });
    }
});


// Sign-up route to submit sign up form
router.post('/registersubmit', async (req, res) => {
    const { username, email, password } = req.body;
    const clientId = await getCognitoClientIdParameter();
  
    try {
      const command = new Cognito.SignUpCommand({
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      });
  
      const response = await cognitoClient.send(command);
      console.log('User signed up:', response);
  
      // Redirect to confirmation page
      res.redirect('/');
    } catch (err) {
      console.error('Error during user sign-up:', err);
      res.status(500).send('Error during sign-up: ' + err.message);
    }
});


// Handle logout
router.get('/logout', (req, res) => {
// Clear the token cookie
res.clearCookie('token');
  
// Redirect the user to the login page (or home page)
res.redirect('/auth');
});
  module.exports = router;
