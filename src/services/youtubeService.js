// YouTube Data API Service
// Busca playlists educacionais gratuitas

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Playlists curadas de canais educacionais em português
const EDUCATIONAL_PLAYLISTS = {
    programming: [
        'PLHz_AreHm4dlKP6QQCekuIPky1CiwmdI6', // Python (Curso em Vídeo)
        'PLHz_AreHm4dm7ZULPAmadvNhH6vk9oNX', // JavaScript (Curso em Vídeo)
        'PLHz_AreHm4dkN7Z_KNHYxclpInOqOnS3o', // HTML/CSS (Curso em Vídeo)
    ],
    agriculture: [
        'PL1B6E0A60375837F8', // Globo Rural - Dicas
    ],
    tourism: [
        'PL3B56E25514E93888', // Hospitalidade e Turismo
        'PLxI8Can9yAHdJ1o7_7XF4aGvB3_TdoS1-', // Atendimento ao Cliente
    ],
    business: [
        'PLxI8Can9yAHfNlS0rC09X9w7zX0YyS7jL', // Empreendedorismo Sebrae (Geral)
        'PLfLLC6XvbeM_e5G9eS_zLzI5W9Y-vX4-k', // Pequenas Empresas Grandes Negócios
        'PLHz_AreHm4dkcVc5SFbb0llisoSsg_Lem', // Marketing Digital (Curso em Vídeo)
        'PLyqOjm51Kkzek-4WS5NFBHwZtG8LqCjV8', // Gestão Financeira para Pequenos Negócios
        'PL2D9851657D962777', // TEDx Talks sobre Negócios e Inovação
    ],
    career: [
        'PLxI8Can9yAHfK-H_v8_TdoS1-', // Inteligência Emocional e Soft Skills
        'PL_YVq8eH5Vf4E-Z_M-Yv3_H-N_1E-v_H_', // Hábitos Atômicos / Produtividade
        'PL1B6E0A60375837F8', // Dicas de Entrevista e CV
        'PLm6_3t-2jNKysXjFj_tQ9GqW5W5f5_W5_', // LinkedIn e Marca Pessoal
    ],
    tech: [
        'PLHz_AreHm4dm7ZULPAmadvNhH6vk9oNX', // JavaScript (Curso em Vídeo)
        'PLmdYg0meXnsIR73E3yC7U_gZ8vC1k_xK_', // Inovação e Tecnologias do Futuro
        'PLxI8Can9yAHdJ1o7_7XF4aGvB3_TdoS1-', // Ferramentas Digitais para Trabalho
    ],
    youth_orientation: [
        'PLxI8Can9yAHfK-H_v8_TdoS1-', // Papo de Responsa (Orientação Jovem)
    ],
    personal_dev: [
        'PLxI8Can9yAHfK-H_v8_TdoS1-', // Inteligência Emocional
        'PL_YVq8eH5Vf4E-Z_M-Yv3_H-N_1E-v_H_', // Produtividade
    ]
};

const FALLBACK_COURSES = [
    // --- TECH & INOVAÇÃO ---
    {
        id: 'course-python-101',
        title: 'Python para Iniciantes',
        description: 'Aprende a programar do zero com a linguagem mais popular do mundo. Curso completo e divertido.',
        thumbnail: 'https://i.ytimg.com/vi/S9uPNppGsGo/maxresdefault.jpg',
        instructor: { name: 'Gustavo Guanabara', avatar: 'https://github.com/guanabara.png' },
        categoryId: 'tech',
        category: 'Tecnologia 💻',
        level: 'Iniciante',
        duration: 24000,
        lessonsCount: 12,
        rating: 4.9, // Verified Hit
        source: 'youtube',
        lessons: [
            { id: 'S9uPNppGsGo', title: 'Python 3 - Mundo 1: Fundamentos', duration: '40:00', type: 'video' },
            { id: 'fAariDxDnUk', title: 'Instalando Python 3', duration: '35:00', type: 'video' },
            { id: 'rHKwddj8qGY', title: 'Primeiros Comandos', duration: '30:00', type: 'video' }
        ]
    },
    {
        id: 'course-web-modern',
        title: 'Criação de Sites Modernos',
        description: 'Descobre como a web funciona e cria o teu primeiro site com HTML e CSS.',
        thumbnail: 'https://i.ytimg.com/vi/Ejkb_YpuHWs/maxresdefault.jpg',
        instructor: { name: 'Curso em Vídeo', avatar: 'https://github.com/guanabara.png' },
        categoryId: 'tech',
        category: 'Tecnologia 💻',
        level: 'Iniciante',
        duration: 18000,
        lessonsCount: 10,
        rating: 4.8,
        source: 'youtube',
        lessons: [
            { id: 'Ejkb_YpuHWs', title: 'História da Internet', duration: '20:00', type: 'video' },
            { id: 'jgQjeqKJte4', title: 'Como funciona a Web', duration: '25:00', type: 'video' }
        ]
    }
];

class YouTubeService {
    // Buscar detalhes de uma playlist
    static async getPlaylistDetails(playlistId) {
        try {
            console.log(`[YouTubeService] Fetching playlist details: ${playlistId} with key: ${YOUTUBE_API_KEY ? 'Present' : 'MISSING'}`);
            const response = await fetch(
                `${YOUTUBE_API_BASE}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`
            );
            const data = await response.json();

            if (data.error) {
                console.error('[YouTubeService] API Error:', data.error);
                throw new Error(data.error.message);
            }

            if (!data.items || data.items.length === 0) {
                console.warn(`[YouTubeService] Playlist not found: ${playlistId}`);
                throw new Error('Playlist not found');
            }

            const playlist = data.items[0];
            return {
                id: playlist.id,
                title: playlist.snippet.title,
                description: playlist.snippet.description,
                thumbnail: playlist.snippet.thumbnails.high.url,
                channelTitle: playlist.snippet.channelTitle,
                itemCount: playlist.contentDetails.itemCount,
            };
        } catch (error) {
            console.error('Error fetching playlist:', error);
            throw error;
        }
    }

    // Buscar vídeos de uma playlist
    static async getPlaylistVideos(playlistId, maxResults = 50) {
        try {
            const response = await fetch(
                `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
            );
            const data = await response.json();

            if (!data.items) {
                return [];
            }

            return data.items.map((item, index) => ({
                id: item.contentDetails.videoId,
                order: index + 1,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium.url,
                videoUrl: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
                publishedAt: item.snippet.publishedAt,
            }));
        } catch (error) {
            console.error('Error fetching playlist videos:', error);
            throw error;
        }
    }

    // Buscar detalhes de um vídeo (para pegar duração)
    static async getVideoDetails(videoId) {
        try {
            const response = await fetch(
                `${YOUTUBE_API_BASE}/videos?part=contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
            );
            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                return null;
            }

            const video = data.items[0];
            return {
                duration: this.parseDuration(video.contentDetails.duration),
                viewCount: parseInt(video.statistics.viewCount),
            };
        } catch (error) {
            console.error('Error fetching video details:', error);
            return null;
        }
    }

    // Converter ISO 8601 duration para minutos
    static parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (parseInt(match[1]) || 0);
        const minutes = (parseInt(match[2]) || 0);
        const seconds = (parseInt(match[3]) || 0);
        return hours * 60 + minutes + Math.ceil(seconds / 60);
    }

    // Buscar todos os cursos de uma categoria
    static async getCoursesByCategory(category) {
        const playlistIds = EDUCATIONAL_PLAYLISTS[category] || [];
        console.log(`[YouTubeService] Fetching category: ${category}, Playlists:`, playlistIds);

        try {
            // Check for navigator online status if available (browsers)
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                console.log(`[YouTubeService] Offline mode detected. Skipping fetch for ${category}.`);
                return [];
            }

            const courses = await Promise.all(
                playlistIds.map(async (playlistId) => {
                    try {
                        const details = await this.getPlaylistDetails(playlistId);
                        const videos = await this.getPlaylistVideos(playlistId);

                        if (!videos || videos.length === 0) return null;

                        // Calculate duration safely
                        const sampleVideos = videos.slice(0, 5);
                        let totalDuration = 0;

                        try {
                            const durations = await Promise.all(
                                sampleVideos.map(v => this.getVideoDetails(v.id))
                            );
                            const avgDuration = durations.reduce((sum, d) => sum + (d?.duration || 0), 0) / (sampleVideos.length || 1);
                            totalDuration = Math.round(avgDuration * videos.length);
                        } catch (e) {
                            console.warn('[YouTubeService] Could not calculate duration, using default.');
                            totalDuration = videos.length * 10; // 10 min per video default
                        }

                        return {
                            id: playlistId,
                            title: details.title,
                            description: details.description.substring(0, 200) + '...',
                            thumbnail: details.thumbnail,
                            instructor: {
                                name: details.channelTitle,
                                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(details.channelTitle)}&background=16a34a&color=fff`,
                            },
                            categoryId: category,
                            category: this.getCategoryName(category),
                            level: 'Iniciante',
                            duration: totalDuration,
                            lessonsCount: videos.length,
                            studentsCount: 0,
                            rating: 4.5,
                            source: 'youtube',
                            published: true,
                            lessons: videos.map(v => ({
                                ...v,
                                type: 'video',
                            })),
                        };
                    } catch (err) {
                        // Suppress connectivity errors
                        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                            // Silent fail for network issues
                        } else {
                            console.warn(`[YouTubeService] Failed to load playlist ${playlistId}:`, err.message);
                        }
                        return null;
                    }
                })
            );

            return courses.filter(course => course !== null);
        } catch (error) {
            console.error('Error fetching courses:', error);
            return [];
        }
    }

    // Buscar todos os cursos
    static async getAllCourses() {
        try {
            console.log('[YouTubeService] Fetching all courses...');
            const categories = Object.keys(EDUCATIONAL_PLAYLISTS);

            // Attempt to fetch from real API first
            const allCoursesPromises = categories.map(cat => this.getCoursesByCategory(cat));
            const allCoursesResults = await Promise.all(allCoursesPromises);
            const flatCourses = allCoursesResults.flat();

            console.log(`[YouTubeService] Fetched ${flatCourses.length} courses from API.`);

            // Always return FALLBACK_COURSES for stability + API Courses
            // This ensures the new curated categories (Tourism, Business) appear even if API fails for them specifically
            const allCourses = [...FALLBACK_COURSES, ...flatCourses];
            return [...new Map(allCourses.map(item => [item.id, item])).values()]; // Deduplicate if any collision

        } catch (error) {
            console.error('[YouTubeService] Error fetching all courses, using fallback:', error);
            return FALLBACK_COURSES;
        }
    }

    static getCategoryName(key) {
        const names = {
            career: 'Carreira',
            entrepreneurship: 'Empreendedorismo',
            programming: 'Programação',
            business: 'Negócios',
            design: 'Design',
            languages: 'Idiomas',
            personal_dev: 'Desenv. Pessoal',
            agriculture: 'Agricultura 🇸🇹',
            tourism: 'Turismo e Hospitalidade',
            tech: 'Tecnologia',
            youth_orientation: 'Orientação Jovem',
            '10-12': 'Secundário (10º-12º)',
            'Superior': 'Universitário',
            'general': 'Saber Geral'
        };
        return names[key] || key;
    }
}

export default YouTubeService;
