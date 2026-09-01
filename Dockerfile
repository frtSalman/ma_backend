FROM node:22-alpine

# Working directory ayarı (Genellikle düzen için /app tercih edilir ancak mevcut yapına göre kök dizin bıraktım)
WORKDIR /

# Bağımlılıkları yükle
COPY package*.json ./
RUN npm install

# Proje dosyalarını kopyala
COPY . .

EXPOSE 5000

CMD ["npm", "start"]