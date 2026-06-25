import axios from 'axios';
import models from '../models/index.model.js';
import puppeteer from 'puppeteer';
const { Users, StudentVideos, StudentVideoQuestions } = models;

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

            // Process each video and push to the JSON array
            allPlaylistItems.forEach((item, index) => {
                const videoUrl = `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`;

                // Use the actual YouTube video title, but prefix it with your subject/custom name for organization
                const title = item.snippet.title;

                const isVideoAlreadyAdded = videos.some(
                    videoItem => videoItem.url === videoUrl
                );

                if (
                    !isVideoAlreadyAdded &&
                    title !== 'Private video' &&
                    title !== 'Deleted video'
                ) {
                    StudentVideos.create({
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
                                    playListId, // Combine channel name and unique playlist ID for better identification
                        }, // Store playlist ID for reference
                    });
                    addedCount++;
                }
            });

            if (addedCount === 0) {
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

            StudentVideos.create({
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
    const { questions, videoId } = req.body;

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
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio'],
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 720 });

        // Array içindeki her bir soru için döngü başlatıyoruz
        for (let question of questions) {
            const t = question.timestamp_seconds || 0;
            const url = `https://www.youtube.com/watch?v=${videoId}&t=${t}s`;

            // İlgili dakikaya git
            await page.goto(url, { waitUntil: 'networkidle2' });
            await page.waitForSelector('video', { timeout: 15000 });

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
            });

            // -------------------------------------------------------------
            // BUNNY.NET / STORAGE YÜKLEME ALANI
            // -------------------------------------------------------------
            // TODO: Buraya kendi Bunny.net yükleme fonksiyonunu entegre etmelisin.
            // Örnek kullanım: const uploadedUrl = await uploadToBunny(imageBuffer, `${videoId}_${t}.jpg`);
            // -------------------------------------------------------------
            const uniqueName = `${videoId}_${t}.webp`; // Frontend'de webp yapıldığını varsayıyoruz

            const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/${uniqueName}`;
            const pullZoneURL = `https://cdn.teachflow.net/${uniqueName}`;

            // 1. BunnyCDN'e Yükle
            await axios.put(uploadUrl, imageBuffer, {
                headers: {
                    AccessKey: KEY,
                    'Content-Type': 'image/webp',
                },
            });
            // Sorunun içerisindeki boş screenShotURL alanını dolduruyoruz
            question.screenShotURL = pullZoneURL;
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
            error: 'İşlem sırasında sunucu hatası oluştu.',
        });
    }
};

/* export const s = async (req, res) => {
    const { questions, videoId } = req.body; // t: saniye (örn: 185)

    console.trace(trancriptData);

    if (!videoId || !t)
        return res.status(400).json({ error: 'videoId ve t gerekli' });

    try {
        const url = `https://www.youtube.com/watch?v=${videoId}&t=${t}s`;

        const browser = await puppeteer.launch({
            headless: 'new', // Yeni ve daha stabil headless modunu kullanıyoruz
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--mute-audio', // Sesi kapatmak, tarayıcıların otomatik oynatma engellerini aşmasını sağlar
            ],
        });

        const page = await browser.newPage();

        // Gerçek bir kullanıcı gibi görünmek için User-Agent
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 720 });

        // Sayfanın yüklenmesini bekle
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Video elementinin DOM'a düşmesini bekle
        await page.waitForSelector('video', { timeout: 15000 });

        await page.keyboard.press('F');

        // CSS ile videoyu en üste çekip tam ekran yapıyoruz ve YouTube kontrollerini gizliyoruz
        await page.addStyleTag({
            content: `
      
        /* Oynatma çubuğu, üst başlık, logolar ve gölgeleri gizle 
        .ytp-chrome-bottom, 
        .ytp-chrome-top, 
        .ytp-gradient-bottom, 
        .ytp-gradient-top, 
        .ytp-watermark,
        .ytp-ce-element {
          display: none !important;
        }
        
         Arka planda kaydırma çubuğu çıkmasını engelle 
        body { overflow: hidden !important; }
      `,
        });

        // Videonun ilgili saniyeye atlaması, tamponlaması (buffer) ve görüntünün netleşmesi için bekleme süresi
        // İnternet hızınıza göre bu süreyi artırıp azaltabilirsiniz.
        await new Promise(resolve => setTimeout(resolve, 2000));

        const imageBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 80,
        });
        await browser.close();

        // Resmi direkt frontend'e döndür
        res.set('Content-Type', 'image/jpeg');
        res.send(imageBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Screenshot alınamadı.' });
    }
};
 */
