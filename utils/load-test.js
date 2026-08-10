import http from 'k6/http';
import { check, sleep, group } from 'k6';

// Temel URL tanımı (Kendi yerel testleriniz için http://localhost:5000 yapabilirsiniz)
const BASE_URL = 'https://api.teachflow.net/api';

//Load test için kullanılacak kullanıcı sayısı ve süre ayarları
/* export const options = {
    stages: [
        { duration: '30s', target: 20 }, // 30 saniyede 20 kullanıcıya çık
        { duration: '1m', target: 50 }, // 1 dakika boyunca 50 kullanıcıda kal (Load Test)
        { duration: '30s', target: 0 }, // 30 saniyede sıfıra in
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // İsteklerin %95'i 1000ms'nin altında olmalı
        http_req_failed: ['rate<0.01'], // Hata oranı %1'in altında olmalı
    },
}; */

//Spike test için kullanılacak kullanıcı sayısı ve süre ayarları
export const options = {
    stages: [
        { duration: '30s', target: 100 }, // 1. Seviye: 100 kullanıcıya çık
        { duration: '1m', target: 100 }, // 100 kullanıcıda 1 dakika bekle ve gözlemle

        { duration: '30s', target: 200 }, // 2. Seviye: 200 kullanıcıya çık
        { duration: '1m', target: 200 }, // 200 kullanıcıda 1 dakika bekle

        { duration: '30s', target: 300 }, // 3. Seviye: 300 kullanıcıya çık
        { duration: '1m', target: 300 }, // 300 kullanıcıda 1 dakika bekle

        { duration: '30s', target: 400 }, // 4. Seviye (Sınır Zorlama): 400 kullanıcıya çık
        { duration: '1m', target: 400 }, // 400 kullanıcıda 1 dakika bekle

        { duration: '45s', target: 0 }, // Soğuma Evresi: Kademeli olarak 0'a düş
    ],
    thresholds: {
        // Hata oranı %2'yi geçerse test k6 tarafından başarısız sayılır
        http_req_failed: ['rate<0.02'],
    },
};

// 1. SETUP AŞAMASI: Test başlamadan önce bir kez çalışır ve oturum çerezini/token'ı alır.
export function setup() {
    const loginPayload = JSON.stringify({
        email: 'mertaslanmatematik@gmail.com', // Test ortamınızdaki geçerli bir öğretmen/kullanıcı e-postası
        password: 'mert123',
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    // Auth rotası[cite: 1, 2]
    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, params);

    check(loginRes, {
        'Login successful (status 200)': r => r.status === 200,
    });

    // Oturum çerezini çıkar (Cookie bazlı auth yapılıyorsa)
    const authCookie = loginRes.cookies['your_auth_cookie_name']
        ? loginRes.cookies['your_auth_cookie_name'][0].value
        : '';

    // Eğer token dönüyorsa (örn: { token: '...' }), r.json('token') şeklinde de alabilirsiniz.

    return { authCookie: authCookie };
}

// 2. VU AŞAMASI: Sanal kullanıcıların sürekli tekrar edeceği istekler.
export default function (data) {
    // Çerezleri (Cookies) kimlik doğrulaması gerektiren rotalara otomatik eklemek için headers ayarı
    const requestConfig = {
        headers: {
            'Content-Type': 'application/json',
            Cookie: `your_auth_cookie_name=${data.authCookie}`,
        },
    };

    // Örnek Test ID'leri
    const studentId = '31a01008-8e9c-44de-ae21-f722bbeb666d';

    // --- ANALİZ VE İSTATİSTİK ROTALARI ---
    group('Analysis & Stats Routes', () => {
        // İstatistik ping[cite: 1, 6]
        const pingRes = http.get(`${BASE_URL}/analysis/ping`, requestConfig);
        check(pingRes, { 'Analysis Ping 200': r => r.status === 200 });

        // Öğrenci statüleri[cite: 1, 6]
        const statsRes = http.get(
            `${BASE_URL}/analysis/getstudentstats/${studentId}`,
            requestConfig
        );
        check(statsRes, { 'Get Student Stats 200': r => r.status === 200 });
    });

    sleep(1);

    // --- SINAV (EXAM) ROTALARI ---
    group('Exam Routes', () => {
        // Sınav sonuçlarını getir[cite: 1, 3]
        const examRes = http.get(
            `${BASE_URL}/exam/get-exam-results`,
            requestConfig
        );
        check(examRes, { 'Get Exam Results 200': r => r.status === 200 });
    });
    sleep(1);

    // --- DERS PROGRAMI (STUDY SCHEDULE) ROTALARI ---
    group('Study Schedule Routes', () => {
        // Programları getir[cite: 1, 9]
        const schedRes = http.get(
            `${BASE_URL}/schedule/get-schedules`,
            requestConfig
        );
        check(schedRes, { 'Get Schedules 200': r => r.status === 200 });
    });

    sleep(1);

    // --- ÖĞRENCİ KİTAP VE VİDEO İLERLEME ROTALARI ---
    group('Student Progress & Videos', () => {
        // Kitap ilerlemesi[cite: 1, 7]
        const progRes = http.get(
            `${BASE_URL}/users/book-sources/${studentId}`,
            requestConfig
        );
        check(progRes, { 'Get Book sources 200': r => r.status === 200 });

        // Video kaynakları[cite: 1, 8]
        const videoRes = http.get(
            `${BASE_URL}/student-videos/video-sources/${studentId}`,
            requestConfig
        );
        check(videoRes, { 'Get Video Sources 200': r => r.status === 200 });
    });

    sleep(1); // Sunucuya nefes aldır, gerçek kullanıcı davranışını simüle et
}
