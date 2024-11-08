require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand, GetCommand, QueryCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Create a DynamoDB client
const ddbClient = new DynamoDBClient({ region: 'ap-southeast-2' });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const tableName = process.env.DYNAMODB_TABLE_NAME;
const partitionKeyName = 'qut-username';  // Replace with your actual key name
const sortKeyName = 'gifId';          // If you have a sort key
const username = 'n11628472@qut.edu.au';


async function storeGifMetadataInDB(gifId, callbackUrl, ownerUserId, gifName) {
  const params = {
      TableName: tableName,
      Item: {
          [partitionKeyName]: username,   // Match your partition key
          [sortKeyName]: gifId,           // Match your sort key
          ownerUserId: ownerUserId,       // Add the owner user ID field
          isReady: false,                 // Add the field with an initial value
          callbackUrl: callbackUrl,
          gif_name: gifName,              // Store the GIF name
          createdAt: new Date().toISOString()
      }
  };

  try {
      const response = await ddbDocClient.send(new PutCommand(params));
      console.log('Item added successfully:', response);
  } catch (error) {
      console.error('Error inserting item into DynamoDB:', error);
  }
}


async function getOwnerUserByGifId(gifId) {
    const username = 'n11628472@qut.edu.au'; // Declare with const to avoid global variable issues
    const params = {
      TableName: tableName,
      Key: {
        'qut-username': username,
        'gifId': gifId // Match your sort key name in the DynamoDB schema
      },
      ProjectionExpression: 'ownerUserId, gif_name, createdAt' // Return specific fields needed
    };
  
    try {
      const response = await ddbDocClient.send(new GetCommand(params));
      if (response.Item) {
        console.log('Fetched metadata from DynamoDB:', response.Item);
        return response.Item; // Return the fetched metadata
      } else {
        throw new Error(`GIF with ID ${gifId} not found in DynamoDB.`);
      }
    } catch (error) {
      console.error('Error fetching owner user from DynamoDB:', error);
      throw error; // Re-throw the error for the calling function to handle
    }
}


async function getAllUserOwnedGifs(useruniqueid) {
  if (!useruniqueid) {
    console.error('Error: useruniqueid is not defined or is invalid');
    throw new Error('useruniqueid must be provided');
  }

  console.log('useruniqueid:', useruniqueid); // Debug log
  const qutUsername = 'n11628472@qut.edu.au'
  const userId = useruniqueid;

  const params = {
    TableName: tableName,
    KeyConditionExpression: '#pk = :pkValue',
    FilterExpression: 'ownerUserId = :ownerId',
    ExpressionAttributeNames: {
      '#pk': 'qut-username'
    },
    ExpressionAttributeValues: {
      ':pkValue': qutUsername,
      ':ownerId': userId, // Ensure this value is correctly set
    },
    ProjectionExpression: 'gifId, gif_name, createdAt' // Return specific fields
  };

  try {
    const response = await ddbDocClient.send(new QueryCommand(params));
    if (response.Items) {
      console.log('Fetched GIFs from DynamoDB:', response.Items);
      return response.Items; // Return all items (GIFs) owned by the user
    } else {
      return []; // Return an empty array if no items are found
    }
  } catch (error) {
    console.error('Error fetching GIFs from DynamoDB:', error);
    throw error; // Re-throw the error for the calling function to handle
  }
}

module.exports = { storeGifMetadataInDB, getOwnerUserByGifId, getAllUserOwnedGifs };