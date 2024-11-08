const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid'); 
const { S3Client } = require("@aws-sdk/client-s3");
const jwt = require('jsonwebtoken'); 
const { getGifFromID, uploadFileToS3, uploadRawImages } = require('../services/s3Service'); // Import s3 interaction functions
const { isAuthenticated, getQueueParameter } = require('../services/middleware');
const { storeGifMetadataInDB, getOwnerUserByGifId, getAllUserOwnedGifs } = require('../services/dynamoService');
const s3 = new S3Client({ region: 'ap-southeast-2' });
const SQS = require("@aws-sdk/client-sqs");
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { GetCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const ddbClient = new DynamoDBClient({ region: 'ap-southeast-2' });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Create new SQS Client
const client = new SQS.SQSClient({
  region: "ap-southeast-2",
});

// Set up multer for file uploads
const upload = multer({
  dest: 'uploads/', // Temporary storage for uploaded files
});


// Route to render the GIF creation page - AUTH PROTECTED
router.get('/createGif', (req, res) => {
  const token = req.cookies.token;
  // Generate callback url
  const callbackUrl = `${req.protocol}://${req.get('host')}/api/webhook-handler`;

  if (!token) {
    // If no token, redirect to login page
    return res.redirect('/auth');
  }

  try {
    // Decode the JWT token to extract the username
    const decodedToken = jwt.decode(token);
    const username = decodedToken['cognito:username']; 
    //console.log("Decoded username:", username);

    if (!username) {
      console.error("No username found in the token");
      return res.redirect('/auth');
    }


    // Render the indexauthenticated.ejs with the extracted username
    res.render('gifCreation', { title: 'Create Your GIF', username: username, callbackUrl});
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.redirect('/auth');
  }
});



// A3 Upload Version - Uploads the files uploaded by the user to S3 and adds the task to the queue
router.post('/upload', upload.array('images'), async (req, res) => {
  const files = req.files;
  const token = req.cookies.token;

  // Extract the unique user ID from the token
  const decodedToken = jwt.decode(token);
  const useruniqueid = decodedToken['sub']; // Substitute with the actual key if different

  // Create a unique process ID and S3 folder path
  const uniqueGifId = uuidv4();
  const s3FolderPath = `${useruniqueid}/${uniqueGifId}/`; // Folder path in S3

  try {
  const gifName = req.body.gifName;
     // Extract the callback URL from the request body
  const callbackUrl = req.body.callbackUrl;

  // Verify that callbackUrl is being accessed correctly
  console.log('Extracted callbackUrl:', callbackUrl);

    // Store the processId and callback URL in DynamoDB
    await storeGifMetadataInDB(uniqueGifId, callbackUrl, useruniqueid, gifName);
    await uploadRawImages(files, s3FolderPath);

    // Prepare the message for the SQS queue with only the user ID and process ID
    const queueMessage = {
      useruniqueid,
      gifId: uniqueGifId,
    };

    const queueURL = await getQueueParameter();

    // Send the message to the SQS queue
    const sqsParams = new SQS.SendMessageCommand({
      QueueUrl: queueURL,
      MessageBody: JSON.stringify(queueMessage),
    });

    const response = await client.send(sqsParams);
    console.log('Message sent to SQS queue successfully');

    // Redirect the client to the loading screen
    res.redirect(`${req.baseUrl}/loading?gifId=${uniqueGifId}`);
  } catch (error) {
    console.error('Error in upload process:', error);
    res.status(500).send('Error uploading files or adding task to the queue');
  }
});




// Display Route - used for displaying whole page view of a gif
router.get('/displayGif/:id', async (req, res) => {
  const token = req.cookies.token;
  const decodedToken = jwt.decode(token);
  const useruniqueid = decodedToken['sub']; // Extract sub attribute to authenticate the user requesting the gif is the owner
  const username = decodedToken['cognito:username']; // Extract the username from the token

  const gifId = req.params.id; // Get the gifId from the route parameter

  try {
    // Declare gifMetadata with let since it will be assigned a value later
    let gifMetadata = await getOwnerUserByGifId(gifId);

    // Ensure the requesting user is the owner of the GIF
    if (useruniqueid === gifMetadata.ownerUserId) {
      // Get the signed URL to access the gif
      const signedUrl = await getGifFromID(gifId, useruniqueid);

      // Render the page using the metadata, including the signed URL for the GIF
      res.render('displayGif', {
        gifName: gifMetadata.gif_name,
        gifPath: signedUrl, // Use the signed URL for the GIF
        username: username, // Username or other metadata
        createdAt: gifMetadata.created_at,
      });
    } else {
      return res.status(403).send('You do not have permission to view this GIF.');
    }
  } catch (error) {
    console.error('Error fetching GIF metadata:', error);
    res.status(500).send('An error occurred while fetching GIF metadata.');
  }
});


router.get('/mygifs', isAuthenticated, async (req, res) => {
  try {
    const token = req.cookies.token;
    const decodedToken = jwt.decode(token);
    const useruniqueid = decodedToken['sub']; // Extract sub attribute to authenticate the user requesting the gif is the owner

    console.log('Decoded token:', decodedToken); // Log the entire token to check the structure
    console.log('Extracted useruniqueid:', useruniqueid); // Log the extracted user ID

    // Fetch all GIFs owned by the user
    const gifItems = await getAllUserOwnedGifs(useruniqueid);

    // If no GIFs are found, render an empty page
    if (gifItems.length === 0) {
      return res.render('myGifs', { gifs: [] });
    }

    // Array to hold the fetched GIF metadata and S3 URLs
    const gifsData = [];

    // Fetch the GIF metadata and S3 URLs for each GIF
    for (const gifItem of gifItems) {
      const gifId = gifItem.gifId;

      // Fetch the GIF file from S3 using its ID and user ID (presigned URL or actual file)
      const gifFileUrl = await getGifFromID(gifId, useruniqueid);

      // Combine metadata and the file URL into a single object and store it
      gifsData.push({
        ...gifItem, // Add all metadata fields, including createdAt
        gifFileUrl // Add the S3 URL or actual file path to the object
      });
    }

    // Render the My GIFs page with the GIFs data (both metadata and file URLs)
    res.render('myGifs', {
      gifs: gifsData, // Pass the array of GIFs (with metadata and URLs) to the template
    });
  } catch (error) {
    console.error('Error fetching user GIFs:', error);
    res.status(500).send('An error occurred while fetching your GIFs.');
  }
});

// In routes/index.js or a similar routes file
router.get('/loading', (req, res) => {
  const gifId = req.query.gifId; // Extract the gifId from query parameters if needed
  console.log('Arrived at loading route');
  res.render('loading', { title: 'Processing Your GIF', gifId });
});

// Webhook handler route to receive the Lambda notification
router.post('/webhook-handler', (req, res) => {
  const { gifId, gifUrl } = req.body; // Data sent by the Lambda function
  console.log(`Received webhook for gifId: ${gifId}`);

  // Logic to store or handle the received data
  // Optionally, send a response to acknowledge receipt
  res.status(200).send('Notification received');
});

router.get('/checkStatus', async (req, res) => {
  const gifId = req.query.gifId;
  const username = 'n11628472@qut.edu.au'; // Replace this with dynamic user retrieval logic or extract from session/auth
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  const partitionKeyName = 'qut-username';  // Your partition key
  const sortKeyName = 'gifId';          // Your sort key

  // Set up the parameters for querying DynamoDB with the partition key and sort key
  const params = {
    TableName: tableName,
    Key: {
      [partitionKeyName]: username,  // Partition key
      [sortKeyName]: gifId       // Sort key
    }
  };

  try {
    // Query DynamoDB to get the item
    const response = await ddbDocClient.send(new GetCommand(params));

    if (response.Item && response.Item.isReady) { // Check if the isReady field is true
      res.json({ isReady: true, gifId: response.Item.gifId });
    } else {
      res.json({ isReady: false });
    }
  } catch (error) {
    console.error('Error checking GIF status:', error);
    res.status(500).json({ isReady: false });
  }
});

module.exports = router;