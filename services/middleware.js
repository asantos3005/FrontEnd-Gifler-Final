const jwt = require('jsonwebtoken');


const client = new SSM.SSMClient({ region: "ap-southeast-2" });
const queueParameter = "/n11628472/sqsQueueURL";




function isAuthenticated(req, res, next) {
    const token = req.cookies.token;
  
    if (!token) {
      // Render an error page instead of using flash messages and redirect
      return res.render('error', {
        message: 'You must be logged in to access this page.'
      });
    }
  
    try {
      const decodedToken = jwt.decode(token);
      req.user = decodedToken;
      next(); // Continue to the next middleware or route
    } catch (error) {
      console.error('Error decoding token:', error);
      return res.render('error', {
        message: 'Authentication error. Please log in again.'
      });
    }
  }

/*
  async function processJournalChecker(req, res) {
    let gifName = null;
    let gifTimestamp = null;
  
    
      // Check if token exists
      const token = req.cookies.token;
      if (!token) {
        console.log("No token found");
        return;
      }
  
      // Decode the JWT token to extract the unique sub attribute
      const decodedToken = jwt.decode(token);
      if (!decodedToken || !decodedToken['sub']) {
        console.log("Invalid token");
        return;
      }
  
      const useruniqueid = decodedToken['sub'];
  
      // Fetch the user's process attempts
      const userProcessAttempts = await getUserProcessJournal(useruniqueid);
  
      // Loop through the process journal entries
      for (const row of userProcessAttempts) {
        // Store gifName and gifTimestamp from the current row
        gifName = row.gif_name;
        gifTimestamp = row.process_initiated_timestamp;
        gifId = row.gif_id;
        processId = row.process_id;
  
        try {
          // Check if GIF was actually uploaded to S3
          const gif = await getGifFromID(row.gif_id, useruniqueid);

          // Check if the metadata exists (e.g., database record is missing or corrupted)
          const gifMetadata = await getGifMetadataById(row.gif_id); 
  

  
        } catch (error) {
          // Caught the error here
          console.log(error.message);
          // If the GIF is missing from S3, we roll back the process
          if (error.message === 'File is not a valid GIF.') {
            await deleteGifMetadata(row.gif_id);  // Delete the metadata
            await deleteProcessJournalEntry(row.process_id);  // Delete the journal entry
            // ROLLBACK PROCESS COMPLETED
            throw new Error(`Uh oh! It seems that the GIF you created called "${gifName}" created at "${gifTimestamp}" was not able to upload to S3. Please retry creating the Gif again!`);
          } 
          // ACTUALLY, gifmetadata upload is essentially instant so interrupt in this part is difficult to do - will not be considered anymore.
          else if (error.message === 'Gif metadata not found in database'){
            // If Gif is uploaded to S3 but metadata is missing, we can still roll forward
            throw new Error(`Uh oh! It seems that the GIF you created called "${gifName}" created at "${gifTimestamp}" was not able to save its metadata to the database, would you like to retry the uplaod or permanently delete this gif?`);
          }
        }
      }
}
*/

  // Function to get the S3 bucket name from AWS Parameter Store
async function getQueueParameter() {
  try {
    const parameterResponse = await client.send(
      new SSM.GetParameterCommand({
        Name: queueParameter,
        WithDecryption: true // if your parameter is encrypted
      })
    );
    console.log(parameterResponse.Parameter.Value);
    return parameterResponse.Parameter.Value;
  } catch (error) {
    console.error('Error retrieving parameter:', error);
    throw error; // Propagate error for handling in calling function
  }
}
  
  
module.exports = { isAuthenticated, getQueueParameter }; 
