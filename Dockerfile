# Stage 1: Build the application artifacts
# Use a specific, slim version of Node for better security and smaller image size
FROM node:20-slim AS builder

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker layer caching
# This assumes the Dockerfile is in the project root.
COPY package*.json ./

# Install dependencies (using npm ci for consistent builds)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Compile TypeScript to JavaScript (if necessary, though tsx runs directly)
# RUN npx tsc --project tsconfig.json

# --- End of Build Stage ---

# Stage 2: Final minimal runtime image
FROM node:20-slim

# Set the working directory again
WORKDIR /usr/src/app

# Copy only the necessary files from the builder stage
# This includes the node_modules and the entire source code (since we use tsx)
COPY --from=builder /usr/src/app ./

# Expose the port the Express server listens on (default in api.ts is 3051)
EXPOSE 3051

# Define the command to run the non-interactive API server
# We use tsx to execute the TypeScript server file (src/api.ts) directly.
CMD [ "npx", "tsx", "src/server.ts" ]
