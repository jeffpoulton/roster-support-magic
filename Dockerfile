# Use an official lightweight Node image
FROM node:18-bullseye

# Install any system deps that Playwright needs
# (most are already in 'bullseye', but you might need some extras)
RUN apt-get update && apt-get install -y \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    wget \
    # add any others if needed
    && rm -rf /var/lib/apt/lists/*

# Create a working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies
# (This will also download the Playwright browser binaries)
RUN npm install

# **This step is crucial** – download browser binaries
#  If you only need Chromium, do: "npx playwright install chromium"
#  If you want all browsers, do: "npx playwright install"
RUN npx playwright install --with-deps

# Copy the rest of our code
COPY . .

# Expose the port (Fly will map it externally)
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]