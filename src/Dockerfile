# Use a lightweight Node.js base image for stability
FROM node:20-slim

# Set the working directory inside the container
# This is where all files will be copied and commands executed
WORKDIR /usr/src/app

# --- Dependency Installation Stage ---

# Copy dependency files (package.json and lock file) from the BUILD CONTEXT (which is the project root)
# These files are needed to run npm ci
COPY package.json .
COPY package-lock.json .

# Install production dependencies only (for smaller image size)
RUN npm ci --only=production

# --- Application Code Stage ---

# Copy the entire 'src' directory from the build context (root) into the container's WORKDIR
COPY src ./src

# Expose the port the Express server listens on
EXPOSE 3051

# The command to start the server
# We use npx tsx to execute the TypeScript server file (api.ts)
CMD ["npx", "tsx", "src/server.ts"]
