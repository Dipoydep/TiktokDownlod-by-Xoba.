exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "OK" }) };
  }

  try {
    let url = "";

    // Bisa lewat query URL (GET) atau Body (POST)
    if (event.httpMethod === "GET") {
      url = event.queryStringParameters?.url || "";
    } else if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      url = body.url || "";
    }

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

    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
    const result = await response.json();

    if (result.code !== 0 || !result.data) {
      return {
        statusCode: 400,
        headers,
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
          options: {
            video_sd: {
              label: "Download Video (No Watermark)",
              url: videoNormal,
            },
            video_hd: {
              label: "Download Video (HD)",
              url: videoHD,
            },
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
      body: JSON.stringify({ status: false, message: "Server Error", error: error.message }),
    };
  }
};
