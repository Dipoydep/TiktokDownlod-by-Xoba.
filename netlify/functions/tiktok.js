exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "OK" }) };
  }

  try {
    const action = event.queryStringParameters?.action;
    const downloadUrl = event.queryStringParameters?.download_url;
    const type = event.queryStringParameters?.type || "video";

    // Handling Direct Download tanpa Redirect/Blank
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
          "Cache-Control": "no-cache",
        },
        body: buffer.toString("base64"),
        isBase64Encoded: true,
      };
    }

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
        body: JSON.stringify({ status: false, message: "Parameter 'url' wajib diisi!" }),
      };
    }

    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
    const result = await response.json();

    if (result.code !== 0 || !result.data) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: false, message: "Gagal mengambil data video." }),
      };
    }

    const data = result.data;
    const baseUrl = "https://www.tikwm.com";
    const formatUrl = (path) => (path ? (path.startsWith("http") ? path : baseUrl + path) : null);

    const videoNormal = formatUrl(data.play);
    const videoHD = formatUrl(data.hdplay) || videoNormal;
    const musicMp3 = formatUrl(data.music);

    const myEndpoint = "https://download-up-tiktok-xoba-endpoint.netlify.app/.netlify/functions/tiktok";

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
              url: `${myEndpoint}?action=download&type=video&download_url=${encodeURIComponent(videoNormal)}`,
            },
            video_hd: {
              label: "Download Video (HD)",
              url: `${myEndpoint}?action=download&type=video&download_url=${encodeURIComponent(videoHD)}`,
            },
            music_mp3: {
              label: "Download MP3 Audio",
              url: `${myEndpoint}?action=download&type=mp3&download_url=${encodeURIComponent(musicMp3)}`,
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
