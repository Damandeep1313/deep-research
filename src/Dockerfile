# Use a lightweight Node.js base image
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# --- Dependency Installation Stage ---
# Access package.json/lock file from the PARENT directory (../)
# The context root is 'src', so '..' refers to the project root.
COPY ../package.json .
COPY ../package-lock.json .

# Install production dependencies
RUN npm ci --only=production

# --- Application Code Stage ---

# Copy the source code (everything in the current context, which is 'src')
# The contents of 'src' are copied to /usr/src/app in the container
# NOTE: This line assumes Render's Root Directory is set to 'src'.
COPY . .

# Expose the port the Express server listens on
EXPOSE 3051

# The command to start the server
# Since the server file 'api.ts' is now at the root of the container WORKDIR,
# we reference it directly.
CMD ["npx", "tsx", "server.ts"]
