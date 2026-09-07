FROM mcr.microsoft.com/playwright:v1.55.0-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./
COPY export-assets.mjs ./
ENV PORT=3000
EXPOSE 3000
CMD ["npm","start"]
