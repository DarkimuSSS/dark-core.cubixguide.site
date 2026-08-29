async function getForumImages() {
  try {
    const res = await fetch('https://cubixworld.net/forum/topic/54795-drakonih-i-vse-pro-nikh--', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    console.log('HTML Length:', html.length);
    
    // Find image URLs or uploads links
    const matches = html.match(/https?:\/\/[^"'\s>]+\.(png|jpg|jpeg|gif|webp)/gi) || [];
    console.log('Found Image URLs:', [...new Set(matches)]);
  } catch (err) {
    console.error(err);
  }
}

getForumImages();
