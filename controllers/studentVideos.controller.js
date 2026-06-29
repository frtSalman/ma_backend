import axios from 'axios';
import models from '../models/index.model.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
const { Users, StudentVideos, StudentVideoQuestions } = models;

puppeteer.use(StealthPlugin());

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

export const getVideoSources = async (req, res) => {
    const { studentId } = req.params;
    try {
        if (!studentId) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci bulunamadı.',
            });
        }

        const videos = await StudentVideos.findAll({
            where: { studentId },
            order: [['subject', 'ASC']],
        });

        return res.status(200).json({
            success: true,
            message: 'Video kaynakları getirildi.',
            videos,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const getVideoQuestions = async (req, res) => {
    const { videoId } = req.params;
    try {
        if (!videoId) {
            return res.status(404).json({
                success: false,
                message: 'Video bulunamadı.',
            });
        }

        const videoQuestions = await StudentVideoQuestions.findOne({
            where: { videoId },
        });

        console.trace(videoQuestions);

        return res.status(200).json({
            success: true,
            message: 'Video soruları getirildi.',
            videoQuestions,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const uploadVideoSourceURL = async (req, res) => {
    // Destructure the new type and ytId parameters sent from the frontend
    const { studentId, subject, url, type, ytId, name } = req.body;

    console.log(studentId, subject, url, type, ytId, name);

    try {
        if (!studentId) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci bulunamadı.',
            });
        }

        const videos = await StudentVideos.findAll({
            where: { studentId, subject },
        });

        if (type === 'playlist' && ytId) {
            const ytApiKey = process.env.YOUTUBE_API_KEY;

            const playListId = new Date().getTime(); // Generate a unique playlist ID based on timestamp

            if (!ytApiKey) {
                return res.status(500).json({
                    success: false,
                    message: 'YouTube API anahtarı yapılandırılmamış.',
                });
            }

            let allPlaylistItems = [];
            let nextPageToken = '';
            let fetchMore = true;

            // Fetch all videos in the playlist, handling YouTube's 50-item pagination limit
            while (fetchMore) {
                const pageTokenParam = nextPageToken
                    ? `&pageToken=${nextPageToken}`
                    : '';
                const ytApiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${ytId}&key=${ytApiKey}${pageTokenParam}`;

                const response = await axios.get(ytApiUrl);
                allPlaylistItems = allPlaylistItems.concat(response.data.items);

                nextPageToken = response.data.nextPageToken;
                if (!nextPageToken) fetchMore = false;
            }

            let addedCount = 0;

            let newVideosToInsert = [];

            for (const item of allPlaylistItems) {
                const videoUrl = `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`;
                const title = item.snippet.title;

                const isVideoAlreadyAdded = videos.some(
                    videoItem => videoItem.url === videoUrl
                );

                if (
                    !isVideoAlreadyAdded &&
                    title !== 'Private video' &&
                    title !== 'Deleted video'
                ) {
                    newVideosToInsert.push({
                        sourceName: title,
                        url: videoUrl,
                        isWatched: false,
                        studentId,
                        subject,
                        playList: {
                            id: ytId,
                            playlistTitle:
                                name ||
                                item.snippet.videoOwnerChannelTitle +
                                    ' Oynatma Listesi ' +
                                    playListId,
                        },
                    });
                }
            }

            // Eğer eklenecek video varsa tek seferde sıralı olarak ekle
            if (newVideosToInsert.length > 0) {
                await StudentVideos.bulkCreate(newVideosToInsert);
                addedCount = newVideosToInsert.length;
            } else {
                return res.json({
                    success: false,
                    message: 'Listedeki tüm geçerli videolar zaten eklenmiş.',
                });
            }
        } else {
            // Standard single video upload logic
            const isVideoAlreadyAdded = videos.some(
                videoItem => videoItem.url === url
            );

            if (isVideoAlreadyAdded) {
                return res.json({
                    success: false,
                    message: 'Bu video kaynağı zaten eklenmiş.',
                });
            }

            await StudentVideos.create({
                sourceName: name,
                url,
                isWatched: false,
                studentId,
                subject,
            });
        }

        res.json({
            success: true,
            message:
                type === 'playlist'
                    ? 'Oynatma listesi başarıyla eklendi.'
                    : 'Video kaynağı oluşturuldu.',
        });
    } catch (error) {
        console.error(
            'Video upload error: ',
            error.response?.data || error.message
        );
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const updateVideoStatus = async (req, res) => {
    const { url, studentId } = req.body;

    console.trace(req.body);

    try {
        if (!studentId) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        // Corrected usage of StudentVideos.update
        await StudentVideos.update(
            { isWatched: true }, // 1. Values to update
            { where: { studentId, url } } // 2. Options with where clause
        );

        res.json({
            success: true,
            message: 'Video kaynağı güncellendi.',
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const deleteVideoSourceURL = async (req, res) => {
    const { url, subject, studentId, playList } = req.body;

    try {
        if (!studentId) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        if (playList) {
            await StudentVideos.destroy({
                where: { 'playList.id': playList.id },
            });
        } else {
            await StudentVideos.destroy({
                where: { url },
            });
        }

        res.json({
            success: true,
            message: 'Video kaynağı silindi.',
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const saveVideoQuestions = async (req, res) => {
    // n8n'den gelen verileri alıyoruz
    const { questions, videoId, videoURL } = req.body;

    if (!videoId || !questions || !Array.isArray(questions)) {
        return res.status(400).json({
            success: false,
            error: "videoId ve questions array'i gerekli.",
        });
    }

    let browser;
    try {
        // Puppeteer tarayıcısını bir kez açıyoruz (Performans için tek tarayıcı yetecektir)
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage', // Sunucu hafıza sorunlarını engeller
                '--mute-audio',
                '--disable-blink-features=AutomationControlled', // webdriver=true bayrağını kapatır
                '--lang=tr-TR,tr',
            ],
        });

        const page = await browser.newPage();
        // WebDriver korumasını JavaScript seviyesinde de tamamen sıfırlıyoruz
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });

        // Gerçekçi bir ekran çözünürlüğü ve user agent tanımlıyoruz
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1920, height: 1080 });

        // --- DÖNGÜ ÖNCESİ BAYRAK TANIMLIYORUZ ---
        let isCookieDismissed = false;

        const urlObj = new URL(videoURL);
        const youtubeRealId = urlObj.searchParams.get('v');

        // Array içindeki her bir soru için döngü başlatıyoruz
        for (let question of questions) {
            const t = question.timestamp_seconds || 0;

            /*
            const url = `https://www.youtube.com/watch?v=${youtubeRealId}?start=${t}s`;

            // İlgili dakikaya git
            await page.goto(url, { waitUntil: 'networkidle2' });

            // -----------------------------------------------------------------
            // COOKIE POP-UP ENGELİNİ AŞMA ALANI
            // -----------------------------------------------------------------
            // Sadece ilk soruda çalışır, sonraki sorularda cookie hafızada olduğu için es geçer.
            if (!isCookieDismissed) {
                try {
                    // Sayfadaki butonların yüklenmesi için maksimum 4 saniye tolerans tanıyoruz
                    await page.waitForSelector('button', { timeout: 4000 });

                    // Sayfa içinde "Reject all" butonunu arayıp tıklatıyoruz
                    const clicked = await page.evaluate(() => {
                        const buttons = Array.from(
                            document.querySelectorAll('button')
                        );
                        // Farklı dil seçeneklerine karşı önlem alıyoruz (Görselinizdeki 'Reject all' dahil)
                        const rejectBtn = buttons.find(b => {
                            const text = b.textContent.toLowerCase();
                            return (
                                text.includes('reject all') ||
                                text.includes('tümünü reddet') ||
                                text.includes('alle ablehnen')
                            );
                        });

                        if (rejectBtn) {
                            rejectBtn.click();
                            return true;
                        }
                        return false;
                    });

                    if (clicked) {
                        // Butona tıklandıktan sonra sayfanın videoya yönlenmesi için 2 saniye bekliyoruz
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    isCookieDismissed = true;
                } catch (e) {
                    // Eğer pop-up hiç çıkmadıysa veya bir hata oluştuysa sonraki sorularda vakit kaybetmemek için geçiyoruz
                    isCookieDismissed = true;
                }
            }
            // -----------------------------------------------------------------

            // Artık video elementi güvenle beklenebilir
            await page.waitForSelector('video', { timeout: 5000 });

            // YouTube kontrollerini gizleyen CSS enjekte et
            await page.addStyleTag({
                content: `
                    .ytp-chrome-bottom, .ytp-chrome-top, 
                    .ytp-gradient-bottom, .ytp-gradient-top, 
                    .ytp-watermark, .ytp-ce-element {
                        display: none !important;
                    }
                    body { overflow: hidden !important; }
                `,
            });

            // Videonun netleşmesi için kısa bir bekleme süresi
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Ekran görüntüsünü Buffer olarak al
            const imageBuffer = await page.screenshot({
                type: 'webp',
                quality: 85,
            }); */

            // 1. YouTube'u kandırmak için sahte bir referer (yönlendiren sayfa) başlığı ekliyoruz.
            // Bu sayede YouTube, isteğin bot'tan değil TeachFlow uygulamasından geldiğini sanacak.
            await page.setExtraHTTPHeaders({
                Referer: 'https://www.teachflow.net/',
            });

            // 2. youtube-nocookie.com kullanarak hem Hata 153 riskini azaltıyor hem de çerez pop-up'larını yok ediyoruz.
            const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeRealId}?start=${t}&autoplay=1&mute=1&controls=0&modestbranding=1`;

            // 3. Doğrudan URL'ye gitmek (page.goto) YERİNE, Puppeteer içinde sanal bir HTML sayfası oluşturuyoruz.
            // referrerpolicy="strict-origin-when-cross-origin" parametresi Hata 153'ün panzehiridir.
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        /* Videonun ekranı tam kaplamasını sağlayan CSS */
                        body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; background-color: black; overflow: hidden; }
                        iframe { width: 100vw; height: 100vh; border: none; }
                    </style>
                </head>
                <body>
                    <iframe 
                        src="${embedUrl}" 
                        referrerpolicy="strict-origin-when-cross-origin" 
                        allow="autoplay"
                        allowfullscreen>
                    </iframe>
                </body>
                </html>
            `;

            // Oluşturduğumuz sanal HTML'i Puppeteer sayfasına render ediyoruz
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // Videonun iframe içinde yüklenip oynamaya başlaması ve netleşmesi için gereken bekleme süresi
            await new Promise(resolve => setTimeout(resolve, 3500));

            // Ekran görüntüsünü Buffer olarak al
            const imageBuffer = await page.screenshot({
                type: 'webp',
                quality: 85,
            });

            // ... Geri kalan Bunny.net yükleme ve DB kayıt işlemleriniz aynen devam ediyor

            // -------------------------------------------------------------
            // BUNNY.NET / STORAGE YÜKLEME ALANI
            // -------------------------------------------------------------
            // TODO: Buraya kendi Bunny.net yükleme fonksiyonunu entegre etmelisin.
            // Örnek kullanım: const uploadedUrl = await uploadToBunny(imageBuffer, `${videoId}_${t}.jpg`);
            // -------------------------------------------------------------
            const uniqueName = `${videoId}_${t}_${Date.now()}.webp`; // Frontend'de webp yapıldığını varsayıyoruz

            const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/screenshots/${uniqueName}`;
            const pullZoneURL = `https://cdn.teachflow.net/screenshots/${uniqueName}`;

            // 1. BunnyCDN'e Yükle
            await axios.put(uploadUrl, imageBuffer, {
                headers: {
                    AccessKey: KEY,
                    'Content-Type': 'image/webp',
                },
            });
            // Sorunun içerisindeki boş screenShotURL alanını dolduruyoruz
            question.screenShotURL = pullZoneURL;
            question.videoURL = videoURL;
            question.isCorrect = false;
        }

        // Tarayıcıyı kapatıyoruz
        await browser.close();

        // 4. Veri Tabanına (Postgres) Kaydetme Aşaması
        const savedData = await StudentVideoQuestions.create({
            videoId: videoId,
            videoQuestions: { data: questions }, // JSON formatında saklama
        });

        // n8n'e sürecin başarıyla tamamlandığını bildiriyoruz
        return res.status(200).json({
            success: true,
            message: "Tüm soruların screenshotları alındı ve DB'ye kaydedildi.",
            data: savedData,
        });
    } catch (error) {
        if (browser) await browser.close();
        console.error('Screenshot veya DB kayıt hatası:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
