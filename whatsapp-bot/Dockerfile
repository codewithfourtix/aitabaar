# Aitbaar WhatsApp bot — whatsapp-web.js needs Chromium.
# Session persists at SESSION_DIR; mount a Railway volume at /data so
# redeploys keep the WhatsApp login.

FROM node:20-bookworm-slim

# System Chromium (skips puppeteer's own download, keeps the image small-ish)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium \
       fonts-freefont-ttf \
       ca-certificates \
       dumb-init \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    SESSION_DIR=/data/wwebjs_auth \
    PORT=8001

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 8001

# dumb-init reaps Chromium's zombie processes
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
