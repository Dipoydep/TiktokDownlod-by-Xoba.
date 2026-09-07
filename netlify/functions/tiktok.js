exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // 1. Handle CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "OK" }) };
  }

  try {
    // 2. FITUR DIRECT DOWNLOAD OTO (Memaksa Browser Otomatis Download File)
    const action = event.queryStringParameters?.action;
    const downloadUrl = event.queryStringParameters?.download_url;
    const type = event.queryStringParameters?.type || "video";

    if (action === "download" && downloadUrl) {
      const mediaResponse = await fetch(downloadUrl);
      const arrayBuffer = await mediaResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const isMp3 = type === "mp3";
      const contentType = isMp3 ? "audio/mpeg" : "video/mp4";
      const ext = isMp3 ? "mp3" : "mp4";
      const fileName = `Xoba_TikTok_${Date.now()}.${ext}`;

      return {
        statusCode: 200,
        headers: {
          ...headers,
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
        body: buffer.toString("base64"),
        isBase64Encoded: true,
      };
    }

    // 3. AMBIL DATA DARI TIKTOK (GET / POST)
    let url = "";
    if (event.httpMethod === "GET") {
      url = event.queryStringParameters?.url || "";
    } else if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      url = body.url || "";
    }

    if (!url) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          status: false,
          message: "Parameter 'url' wajib diisi!",
        }),
      };
    }

    // Fetch dari TikWM Engine
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
    const result = await response.json();

    if (result.code !== 0 || !result.data) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          status: false,
          message: "Gagal mengambil data video. Pastikan link TikTok valid.",
        }),
      };
    }

    const data = result.data;
    const baseUrl = "https://www.tikwm.com";
    const formatUrl = (path) => (path ? (path.startsWith("http") ? path : baseUrl + path) : null);

    const videoNormal = formatUrl(data.play);
    const videoHD = formatUrl(data.hdplay) || videoNormal;
    const musicMp3 = formatUrl(data.music);

    const myEndpoint = "https://radiant-endpoint-tiktok.netlify.app/.netlify/functions/tiktok";

    // Dynamic direct download links via backend proxy
    const directSd = `${myEndpoint}?action=download&type=video&download_url=${encodeURIComponent(videoNormal)}`;
    const directHd = `${myEndpoint}?action=download&type=video&download_url=${encodeURIComponent(videoHD)}`;
    const directMp3 = `${myEndpoint}?action=download&type=mp3&download_url=${encodeURIComponent(musicMp3)}`;

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
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
          options: {
            video_sd: {
              label: "Download Video (No Watermark)",
              url: directSd,
            },
            video_hd: {
              label: "Download Video (HD)",
              url: directHd,
            },
            music_mp3: {
              label: "Download MP3 Audio",
              url: directMp3,
              title: data.music_info ? data.music_info.title : "Original Sound",
            },
          },
        },
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: false, message: "Server Error", error: error.message }),
    };
  }
};
