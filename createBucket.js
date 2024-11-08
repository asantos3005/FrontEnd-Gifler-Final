// Import the S3 client from the AWS SDK
const { S3Client, CreateBucketCommand, PutBucketTaggingCommand } = require('@aws-sdk/client-s3');

// Define your bucket name, region, and tags
const bucketName = 'gifler-uploads-bucket';
const region = 'ap-southeast-2';
const qutUsername = 'n11628472@qut.edu.au'; 
const purpose = 'assessment-2';

async function createBucket() {
    // Initialize the S3 client
    const s3Client = new S3Client({ region: region });

    // Create the S3 bucket command
    const createBucketCommand = new CreateBucketCommand({
        Bucket: bucketName,
    });

    try {
        // Send the command to create the bucket
        const response = await s3Client.send(createBucketCommand);
        console.log(`Bucket created at location: ${response.Location}`);
    } catch (err) {
        if (err.name === 'BucketAlreadyOwnedByYou') {
            console.log('Bucket already exists and is owned by you.');
        } else {
            console.error('Error creating bucket:', err);
            return;
        }
    }

    // Tag the bucket with your QUT username and purpose
    const tagBucketCommand = new PutBucketTaggingCommand({
        Bucket: bucketName,
        Tagging: {
            TagSet: [
                { Key: 'qut-username', Value: qutUsername },
                { Key: 'purpose', Value: purpose }
            ]
        }
    });

    try {
        // Send the command to tag the bucket
        const response = await s3Client.send(tagBucketCommand);
        console.log('Bucket successfully tagged:', response);
    } catch (err) {
        console.error('Error tagging bucket:', err);
    }
}

// Call the function to create and tag the bucket
createBucket();
