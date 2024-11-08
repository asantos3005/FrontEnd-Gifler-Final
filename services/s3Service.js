const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const https = require('https');
const fs = require('fs');
SSM = require("@aws-sdk/client-ssm");
const parameter_name = "/n11628472/s3bucketname";
const client = new SSM.SSMClient({ region: "ap-southeast-2" });


const s3 = new S3Client({ region: 'ap-southeast-2' });


// Function to get the S3 bucket name from AWS Parameter Store
async function getS3Parameter() {
  try {
    const parameterResponse = await client.send(
      new SSM.GetParameterCommand({
        Name: parameter_name,
        WithDecryption: true // if your parameter is encrypted
      })
    );
    return parameterResponse.Parameter.Value;
  } catch (error) {
    console.error('Error retrieving parameter:', error);
    throw error; // Propagate error for handling in calling function
  }
}


// Function to upload a file to S3
async function uploadFileToS3(filePath, s3Key) {
  const fileStream = fs.createReadStream(filePath);
  // Retrieve the bucket name
  const bucketName = await getS3Parameter(); // Add `await` to ensure bucket name is fetched

  const uploadParams = {
    Bucket: bucketName,
    Key: s3Key,
    Body: fileStream
  };

  try {
    const data = await s3.send(new PutObjectCommand(uploadParams));
    console.log(`File uploaded successfully at ${data.Location}`);
    return `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
  } catch (err) {
    console.error('Error uploading file:', err);
    throw err;
  }
}


// Function to get GIF from S3 by ID and generate a signed URL TRYINGOUT
async function getGifFromID(gifId, userId) {
   
     // Reconstruct S3 key from metadata - keep it stateless
     const gifS3Key = `${userId}/gifs/${gifId}.gif`;
     console.log(`Reconstructed S3 Key: ${gifS3Key}`);
 
     const bucketName = await getS3Parameter();
 
     // Generate the signed URL for the GIF
     const signedUrl = await generateSignedUrl(bucketName, gifS3Key);
 

    // Make an HTTPS request to the pre-signed URL to check the file content
    const isGif = await checkIfGif(signedUrl);

    if (isGif) {
      console.log("File is a valid GIF.");
      return signedUrl;  // Return the pre-signed URL if it's a valid GIF
    } else {
      console.log('Throwing Error: File not valid Gif')
      throw new Error('File is not a valid GIF.');
    }
  }


// Create a signed url to access protected S3 objects (gifs)
async function generateSignedUrl(bucketName, key) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry
    //console.log(url)
    return url;
  }


// Function to check if the file at the pre-signed URL is a valid GIF
function checkIfGif(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = [];
      
      // Collect the data from the response
      response.on('data', chunk => {
        data.push(chunk);
      });

      // Once all data is received, check the first few bytes for the GIF signature
      response.on('end', () => {
        const buffer = Buffer.concat(data);
        const gifSignature = buffer.toString('ascii', 0, 6);
        if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
          resolve(true);  // File is a valid GIF
        } else {
          resolve(false);  // File is not a GIF
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Error checking file content: ${err.message}`));
    });
  });
}

// A3 Code //
// Uploads the raw images onto S3 so the gifencoder microservice can accesss them for processing - instead of sending the images directly to microservice (not optimal)
async function uploadRawImages(files, s3FolderPath) {
  // Loop through each file and upload it to S3 using the modular function
  for (const file of files) {
    const s3Key = `${s3FolderPath}${file.originalname}`; // Define the S3 key for each file
    await uploadFileToS3(file.path, s3Key);
    console.log(`File uploaded successfully at ${s3Key}`);

    // Clean up the local file after uploading
    fs.unlinkSync(file.path);  // Deletes the file from local storage
  }
  
}

module.exports = { getGifFromID, generateSignedUrl, uploadFileToS3, uploadRawImages };