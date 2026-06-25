FROM node:22-alpine

# Puppeteer için Alpine Linux bağımlılıklarını ve Chromium çekirdeğini yüklüyoruz
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Puppeteer'ın npm install sırasında kendi Chrome'unu indirmesini engelliyoruz (Alpine'deki Chromium'u kullanacağız)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Working directory ayarı (Genellikle düzen için /app tercih edilir ancak mevcut yapına göre kök dizin bıraktım)
WORKDIR /

# Bağımlılıkları yükle
COPY package*.json ./
RUN npm install

# Proje dosyalarını kopyala
COPY . .

EXPOSE 5000

CMD ["npm", "start"]