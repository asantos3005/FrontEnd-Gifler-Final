# Use the official Node.js 18 image
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

# Create and set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Run createBucket.js during the container startup
# RUN node createBucket.js

# Expose the port on which your app will run
EXPOSE 3000

# Command to run your Node.js app
CMD ["node", "GifApplicationIndex.js"]
