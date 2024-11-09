# Use an official Node.js runtime as a parent image
FROM node:18

# Install necessary dependencies, including curl
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip ./aws

# Set the working directory
WORKDIR /app

# Install dependencies
RUN npm install

# Copy the application files
COPY . .

# Create the ~/.aws directory and set up AWS credentials and region
RUN mkdir -p /root/.aws && \
    echo '[default]' > /root/.aws/credentials && \
    echo 'aws_access_key_id=ASIA5DYSEEJ46R5RA5SF' >> /root/.aws/credentials && \
    echo 'aws_secret_access_key=t8mlbKGlhdTFhz6baPm7ATBqzoQIxzUhVH2yMeBv' >> /root/.aws/credentials && \
    echo 'aws_session_token=IQoJb3JpZ2luX2VjENP//////////wEaDmFwLXNvdXRoZWFzdC0yIkgwRgIhAIwYZn3ghMk9+DFc7U32NJKypst4oFzIMPNTiIz1xUhMAiEAuXf8/X6Ef1Q3GsnR0OBVx0xDzJjfKNkmhuYUbIaAydgqpQMIXBADGgw5MDE0NDQyODA5NTMiDLiCHHNT8UUvfcXobyqCA7kOFW6yhRKSvMF3QXxmd/zjCZlToOrtnIhClWuL7sdgBB0EejcSlWz4NHvwidcnQleJ2j2rFXVvcQeQ27qp9R3QUyAWPtjmhCFckx2VSGLKKbUr1jEx9iQStYKclin6PZ4vxNslh9PeXv6IzjUb6JS7T70Iy7bm5frJLy6hDSNjPWKipg3oZ5yGNfyG8ic4JFVqFQEzvhhcM3cTDKu8XhCehKU/LG5C/6gDJQXZDrqnhtDn3SqBQ1RTyNP2uQV/su3zdFt31KJnCMsvHrCHDTfvMgQih1CsxdmwraYl6a+QnladuJ7awji7d9TDkQ5q0YcMI9QbVfcc4Xvo73Xcwfp7onkoB+zUECEOljQ+igj/Rsi0N1lk8EknUXWhO37L76FEGPPenDG0FVBusEZAwbKcnC825O4r3mfLOFA211URqgh+Wy4WyuqmGuSIxjwuicGRerP5fAL4BSR+c09BaFCfsyu1qiJZY2unZPHZHyqbWAHvueX7DaCZbjXNnzSzMtbhMIvWt7kGOqUBOkWlCKmKCboj5ZfBDG3Y6ac7r0bIqUmYDZBjEIgos5sPlPCpHlM+wqcYg//YBTzRTms7JCsHQuSRchXw3rIz13b8Va5i10h61rXIXAW6uFlCOUjBqhjduD9fjnVAh4isIvbe2jvRAWVV5wQwJ5vg8BE4cN6nCNqE5vABQtuERUG3usEesd3vvSeT6ATCgiOrsYuxeEpIed6quG8Z4Uau9rIGB6lC' >> /root/.aws/credentials && \
    echo '[default]' > /root/.aws/config && \
    echo 'region=ap-southeast-2' >> /root/.aws/config

# Expose the port the app runs on
EXPOSE 3000

# Run the application
CMD ["node", "GifApplicationIndex.js"]