exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // 1. Handle Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "OK" }),
    };
  }

  // 2. Hanya terima method POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        status: false,
        message: "Method Not Allowed. Gunakan method POST.",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: false,
          message: "Parameter 'url' wajib diisi!",
        }),
      };
    }

    // Request ke API TikWM dengan mode HD aktif (&hd=1)
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
    const result = await response.json();

    if (result.code !== 0 || !result.data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: false,
          message: "Gagal mengambil data video. Pastikan link TikTok valid dan publik.",
        }),
      };
    }

    const data = result.data;
    const baseUrl = "https://www.tikwm.com";

    // Helper URL
    const formatUrl = (path) => {
      if (!path) return null;
      return path.startsWith("http") ? path : baseUrl + path;
    };

    const videoNormal = formatUrl(data.play);
    const videoHD = formatUrl(data.hdplay) || videoNormal; // Fallback ke video biasa jika HD kosong

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: true,
        message: "Berhasil mengambil data TikTok",
        data: {
          title: data.title || "Tanpa Judul",
          cover: formatUrl(data.cover),
          author: {
            nickname: data.author.nickname,
            username: data.author.unique_id,
            avatar: formatUrl(data.author.avatar),
          },
          // 3 OPSI DOWNLOAD UTAMA
          options: {
            // Opsi 1: Video No Watermark (Biasa)
            video_sd: {
              label: "Download Video (No Watermark)",
              url: videoNormal,
            },
            // Opsi 2: Video HD
            video_hd: {
              label: "Download Video (HD)",
              url: videoHD,
            },
            // Opsi 3: Audio MP3
            music_mp3: {
              label: "Download MP3 Audio",
              url: formatUrl(data.music),
              title: data.music_info ? data.music_info.title : "Original Sound",
            },
          },
        },
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};
            
